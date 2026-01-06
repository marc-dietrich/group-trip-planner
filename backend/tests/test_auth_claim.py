"""Actor and claim flow API tests (in-memory dependencies)."""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt

from app.api.deps import get_actor_service, get_auth_service, get_group_service
from app.core.config import get_settings
from app.main import app
from app.user_core.repositories import (
	InMemoryActorRepository,
	InMemoryGroupRepository,
	InMemoryIdentityRepository,
)
from app.user_core.services import ActorService, AuthService, GroupService


settings = get_settings()


def _auth_headers(
	user_id: str | None = None,
	display_name: str | None = "API Tester",
	email: str | None = "api@test.local",
):
	uid = user_id or str(uuid4())
	metadata = {"full_name": display_name} if display_name is not None else {}
	claims = {
		"sub": uid,
		"email": email,
		"user_metadata": metadata,
	}
	token = jwt.encode(claims, settings.supabase_jwt_secret, algorithm="HS256")
	return {"Authorization": f"Bearer {token}"}, uid


@pytest_asyncio.fixture()
async def fake_group_repo():
	return InMemoryGroupRepository()


@pytest_asyncio.fixture()
async def fake_identity_repo():
	return InMemoryIdentityRepository()


@pytest_asyncio.fixture()
async def fake_actor_repo():
	return InMemoryActorRepository()


@pytest_asyncio.fixture(autouse=True)
async def overrides(fake_group_repo, fake_identity_repo, fake_actor_repo):
	app.dependency_overrides[get_group_service] = lambda: GroupService(fake_group_repo)
	app.dependency_overrides[get_auth_service] = lambda: AuthService(fake_identity_repo, fake_group_repo)
	app.dependency_overrides[get_actor_service] = lambda: ActorService(fake_actor_repo)
	yield
	app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_claim_actor_updates_membership_and_returns_token(fake_group_repo):
	group_service = GroupService(fake_group_repo)
	actor_id = "actor-claimable"

	group, owner = await group_service.create_group(
		group_name="Claimable Trip",
		actor_id=actor_id,
		display_name="Anon",
		user_id=None,
	)
	assert owner.user_id is None

	headers, user_id = _auth_headers(display_name="Supabase User")

	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as client:
		res = await client.post("/api/auth/claim", json={"actorId": actor_id}, headers=headers)
		assert res.status_code == 200
		body = res.json()
		assert body["actorId"] == actor_id
		assert body["userId"] == user_id
		assert body["updatedMemberships"] == 1
		assert body["claimToken"]

	members = await fake_group_repo.get_group_members(group.id)
	assert len(members) == 1
	assert str(members[0].user_id) == user_id


@pytest.mark.asyncio
async def test_claim_requires_authentication():
	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as client:
		res = await client.post("/api/auth/claim", json={"actorId": "missing-auth"})
		assert res.status_code == 401


@pytest.mark.asyncio
async def test_create_actor_endpoint_generates_and_reuses_id(fake_actor_repo):
	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as client:
		create_res = await client.post("/api/actors", json={})
		assert create_res.status_code == 200
		actor_id = create_res.json()["actorId"]
		assert actor_id
		assert "createdAt" in create_res.json()

		reuse_res = await client.post("/api/actors", json={"actorId": actor_id})
		assert reuse_res.status_code == 200
		assert reuse_res.json()["actorId"] == actor_id

	assert len(fake_actor_repo._actors) == 1
