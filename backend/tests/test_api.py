"""Test für die API Endpoints."""

import asyncio

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.database import get_session as original_get_session
from app.main import app


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


settings = get_settings()
test_engine = create_async_engine(settings.database_url, echo=settings.debug, poolclass=NullPool)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_session():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="module", autouse=True)
async def override_dependencies():
    app.dependency_overrides[original_get_session] = override_get_session
    yield
    app.dependency_overrides.clear()
    await test_engine.dispose()

@pytest.mark.asyncio
async def test_health_endpoint():
    """Teste Health Check Endpoint"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data

@pytest.mark.asyncio
async def test_create_group():
    """Teste Gruppe erstellen"""
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

        # Fetch groups for actor
        response = await client.get(f"/api/groups?actorId={group_data['actorId']}")
        assert response.status_code == 200
        groups = response.json()
        assert len(groups) >= 1
        assert any(g["groupId"] == data["groupId"] for g in groups)


@pytest.mark.asyncio
async def test_delete_group():
    """Teste Gruppe löschen (ohne Rollen-Check)."""
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