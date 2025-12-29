"""Tests for the Supabase claim endpoint using mocked persistence."""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt

from app.api.deps import get_auth_service, get_group_service
from app.core.config import get_settings
from app.main import app
from app.repositories import InMemoryGroupRepository, InMemoryIdentityRepository
from app.services import AuthService, GroupService


settings = get_settings()


def _make_token(user_id: str) -> str:
    claims = {
        "sub": user_id,
        "email": "tester@example.com",
        "user_metadata": {"full_name": "Tester"},
    }
    return jwt.encode(claims, settings.supabase_jwt_secret, algorithm="HS256")


@pytest_asyncio.fixture()
async def fake_repositories():
    return InMemoryGroupRepository(), InMemoryIdentityRepository()


@pytest_asyncio.fixture(autouse=True)
async def override_services(fake_repositories):
    group_repo, identity_repo = fake_repositories
    app.dependency_overrides[get_group_service] = lambda: GroupService(group_repo)
    app.dependency_overrides[get_auth_service] = lambda: AuthService(identity_repo, group_repo)
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_claim_links_actor_to_user():
    if not settings.supabase_jwt_secret:
        pytest.skip("Supabase JWT secret not configured; cannot test claim")

    actor_id = f"actor-{uuid4()}"
    user_id = str(uuid4())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/api/groups",
            json={"groupName": "Claim Test", "actorId": actor_id, "displayName": "Anon"},
        )
        assert create_res.status_code == 200

        token = _make_token(user_id)

        claim_res = await client.post(
            "/api/auth/claim",
            headers={"Authorization": f"Bearer {token}"},
            json={"actorId": actor_id},
        )
        assert claim_res.status_code == 200
        body = claim_res.json()
        assert body["userId"] == user_id
        assert body["actorId"] == actor_id
        assert body["updatedMemberships"] >= 1

        list_res = await client.get(
            "/api/groups",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_res.status_code == 200
        groups = list_res.json()
        assert any(g["name"] == "Claim Test" for g in groups)
