"""API tests with mocked persistence (no real database)."""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from jose import jwt

from app.api.deps import get_group_service
from app.core.config import get_settings
from app.main import app
from app.user_core.repositories import InMemoryGroupRepository
from app.user_core.services import GroupService


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


@pytest_asyncio.fixture(autouse=True)
async def override_group_service(fake_group_repo):
    app.dependency_overrides[get_group_service] = lambda: GroupService(fake_group_repo)
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data


@pytest.mark.asyncio
async def test_group_creation_requires_authentication():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/groups",
            json={"groupName": "Unauthed", "displayName": "Anon"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_group():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers, user_id = _auth_headers()
        group_data = {
            "groupName": "Test Gruppe API",
            "displayName": "API Tester",
        }
        response = await client.post("/api/groups", json=group_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Gruppe API"
        assert data["groupId"]
        assert data["inviteLink"]
        assert data["role"] == "owner"

        response = await client.get("/api/groups", headers=headers)
        assert response.status_code == 200
        groups = response.json()
        assert any(g["groupId"] == data["groupId"] for g in groups)


@pytest.mark.asyncio
async def test_delete_group():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers, _ = _auth_headers()
        group_data = {
            "groupName": "Delete Me",
            "displayName": "Deleter",
        }

        create_res = await client.post("/api/groups", json=group_data, headers=headers)
        assert create_res.status_code == 200
        group_id = create_res.json()["groupId"]

        delete_res = await client.delete(f"/api/groups/{group_id}", headers=headers)
        assert delete_res.status_code == 204

        list_res = await client.get("/api/groups", headers=headers)
        assert list_res.status_code == 200
        groups = list_res.json()
        assert all(g["groupId"] != group_id for g in groups)


@pytest.mark.asyncio
async def test_create_group_uses_default_display_name():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers, _ = _auth_headers(display_name=None, email=None)
        group_data = {
            "groupName": "Ohne Anzeigename",
            # displayName intentionally omitted to verify backend fallback
        }

        create_res = await client.post("/api/groups", json=group_data, headers=headers)
        assert create_res.status_code == 200
        body = create_res.json()
        assert body["displayName"] == "Gast"