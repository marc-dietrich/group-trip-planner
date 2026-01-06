"""Availability API tests for create/list/delete (no patch)."""

import pytest
import pytest_asyncio
from uuid import UUID
from httpx import AsyncClient, ASGITransport

from app.api.deps import get_availability_service, get_group_service
from app.core.security import Identity, get_identity
from app.main import app
from app.user_core.repositories import InMemoryAvailabilityRepository, InMemoryGroupRepository
from app.user_core.services import AvailabilityService, GroupService


USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


@pytest_asyncio.fixture()
async def fake_group_repo():
    return InMemoryGroupRepository()


@pytest_asyncio.fixture()
async def fake_av_repo():
    return InMemoryAvailabilityRepository()


@pytest_asyncio.fixture(autouse=True)
async def overrides(fake_group_repo, fake_av_repo):
	app.dependency_overrides[get_group_service] = lambda: GroupService(fake_group_repo)
	app.dependency_overrides[get_availability_service] = lambda: AvailabilityService(fake_av_repo, fake_group_repo)
	app.dependency_overrides[get_identity] = lambda: Identity(user_id=USER_ID)
	yield
	app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_and_list(fake_group_repo):
    # create group for the user
    group_service = GroupService(fake_group_repo)
    group, _ = await group_service.create_group(
        group_name="Trip",
        actor_id=None,
        display_name="User",
        user_id=UUID(USER_ID),
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"startDate": "2025-03-01", "endDate": "2025-03-03"}
        create_res = await client.post(f"/api/groups/{group.id}/availabilities", json=payload)
        assert create_res.status_code == 200

        list_res = await client.get(f"/api/groups/{group.id}/availabilities")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) == 1
        assert items[0]["startDate"] == payload["startDate"]


@pytest.mark.asyncio
async def test_delete(fake_group_repo):
    group_service = GroupService(fake_group_repo)
    group, _ = await group_service.create_group(
        group_name="Trip",
        actor_id=None,
        display_name="User",
        user_id=UUID(USER_ID),
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"startDate": "2025-04-01", "endDate": "2025-04-02"}
        create_res = await client.post(f"/api/groups/{group.id}/availabilities", json=payload)
        assert create_res.status_code == 200
        av_id = create_res.json()["id"]

        del_res = await client.delete(f"/api/availabilities/{av_id}")
        assert del_res.status_code == 204

        list_res = await client.get(f"/api/groups/{group.id}/availabilities")
        assert list_res.status_code == 200
        assert list_res.json() == []
