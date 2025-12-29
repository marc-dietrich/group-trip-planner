"""API tests with mocked persistence (no real database)."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.api.deps import get_group_service
from app.main import app
from app.repositories import InMemoryGroupRepository
from app.services import GroupService


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
async def test_create_group():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        group_data = {
            "groupName": "Test Gruppe API",
            "actorId": "actor-api-test-123",
            "displayName": "API Tester",
        }
        response = await client.post("/api/groups", json=group_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Gruppe API"
        assert data["groupId"]
        assert data["inviteLink"]
        assert data["role"] == "owner"

        response = await client.get(f"/api/groups?actorId={group_data['actorId']}")
        assert response.status_code == 200
        groups = response.json()
        assert any(g["groupId"] == data["groupId"] for g in groups)


@pytest.mark.asyncio
async def test_delete_group():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        group_data = {
            "groupName": "Delete Me",
            "actorId": "actor-delete-test-123",
            "displayName": "Deleter",
        }

        create_res = await client.post("/api/groups", json=group_data)
        assert create_res.status_code == 200
        group_id = create_res.json()["groupId"]

        delete_res = await client.delete(f"/api/groups/{group_id}")
        assert delete_res.status_code == 204

        list_res = await client.get(f"/api/groups?actorId={group_data['actorId']}")
        assert list_res.status_code == 200
        groups = list_res.json()
        assert all(g["groupId"] != group_id for g in groups)