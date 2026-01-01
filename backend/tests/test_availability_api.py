"""Availability API tests with in-memory repos."""

from datetime import date
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.api.deps import (
    get_availability_service,
    get_group_service,
)
from app.core.security import Identity, require_authenticated_identity
from app.main import app
from app.user_core.repositories import (
    InMemoryAvailabilityRepository,
    InMemoryGroupRepository,
)
from app.user_core.services import AvailabilityService, GroupService


USER_ID = "11111111-2222-3333-4444-555555555555"


@pytest_asyncio.fixture()
async def fake_group_repo():
    return InMemoryGroupRepository()


@pytest_asyncio.fixture()
async def fake_availability_repo():
    return InMemoryAvailabilityRepository()


@pytest_asyncio.fixture(autouse=True)
async def overrides(fake_group_repo, fake_availability_repo):
    app.dependency_overrides[get_group_service] = lambda: GroupService(fake_group_repo)
    app.dependency_overrides[get_availability_service] = lambda: AvailabilityService(
        fake_availability_repo, fake_group_repo
    )
    app.dependency_overrides[require_authenticated_identity] = lambda: Identity(user_id=USER_ID)
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_add_and_list_availability(fake_group_repo):
    service = GroupService(fake_group_repo)
    group, _ = await service.create_group(
        group_name="Test Trip",
        actor_id=None,
        display_name="Tester",
        user_id=USER_ID,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"startDate": "2025-01-10", "endDate": "2025-01-12"}
        res = await client.post(f"/api/groups/{group.id}/availabilities", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["groupId"] == str(group.id)
        assert body["userId"] == USER_ID

        list_res = await client.get(f"/api/groups/{group.id}/availabilities")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) == 1
        assert items[0]["startDate"] == payload["startDate"]


@pytest.mark.asyncio
async def test_availability_requires_membership(fake_group_repo):
    service = GroupService(fake_group_repo)
    other_group, _ = await service.create_group(
        group_name="Other Trip",
        actor_id="someone-else",
        display_name="Other",
        user_id=None,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"startDate": "2025-02-01", "endDate": "2025-02-02"}
        res = await client.post(f"/api/groups/{other_group.id}/availabilities", json=payload)
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_availability_summary_endpoint(fake_group_repo, fake_availability_repo):
    group_service = GroupService(fake_group_repo)
    group, owner = await group_service.create_group(
        group_name="Summary Trip",
        actor_id=None,
        display_name="Owner",
        user_id=USER_ID,
    )

    other_user = UUID("33333333-4444-5555-6666-777777777777")
    await fake_group_repo.add_member_to_group(group.id, user_id=other_user, display_name="Member")

    await fake_availability_repo.create_availability(
        group_id=group.id,
        user_id=USER_ID,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 3),
    )
    await fake_availability_repo.create_availability(
        group_id=group.id,
        user_id=other_user,
        start_date=date(2025, 1, 2),
        end_date=date(2025, 1, 4),
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(f"/api/groups/{group.id}/availability-summary")
        assert res.status_code == 200
        items = res.json()
        assert items == [
            {"from": "2025-01-01", "to": "2025-01-01", "availableCount": 1, "totalMembers": 2},
            {"from": "2025-01-02", "to": "2025-01-03", "availableCount": 2, "totalMembers": 2},
            {"from": "2025-01-04", "to": "2025-01-04", "availableCount": 1, "totalMembers": 2},
        ]
