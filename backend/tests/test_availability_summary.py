import pytest
from datetime import date
from uuid import uuid4

from fastapi import HTTPException

from app.user_core.repositories import InMemoryAvailabilityRepository, InMemoryGroupRepository
from app.user_core.services import AvailabilityService


@pytest.mark.asyncio
async def test_calculate_group_availability_overlaps():
    group_repo = InMemoryGroupRepository()
    availability_repo = InMemoryAvailabilityRepository()
    service = AvailabilityService(availability_repo, group_repo)

    user_one = uuid4()
    user_two = uuid4()

    group, owner = await group_repo.create_group(
        group_name="Trip",
        actor_id=None,
        display_name="Owner",
        user_id=user_one,
    )
    await group_repo.add_member_to_group(group.id, user_two, display_name="Member")

    await availability_repo.create_availability(
        group_id=group.id,
        user_id=user_one,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 5),
    )
    await availability_repo.create_availability(
        group_id=group.id,
        user_id=user_two,
        start_date=date(2025, 1, 3),
        end_date=date(2025, 1, 6),
    )

    summary = await service.calculate_group_availability(group_id=group.id, user_id=user_one)

    assert summary == [
        {"from": date(2025, 1, 1), "to": date(2025, 1, 2), "availableCount": 1, "totalMembers": 2},
        {"from": date(2025, 1, 3), "to": date(2025, 1, 5), "availableCount": 2, "totalMembers": 2},
        {"from": date(2025, 1, 6), "to": date(2025, 1, 6), "availableCount": 1, "totalMembers": 2},
    ]


@pytest.mark.asyncio
async def test_calculate_group_availability_rejects_non_member():
    group_repo = InMemoryGroupRepository()
    availability_repo = InMemoryAvailabilityRepository()
    service = AvailabilityService(availability_repo, group_repo)

    group, owner = await group_repo.create_group(
        group_name="Trip",
        actor_id=None,
        display_name="Owner",
        user_id=uuid4(),
    )

    outsider = uuid4()

    with pytest.raises(HTTPException) as exc:
        await service.calculate_group_availability(group_id=group.id, user_id=outsider)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_calculate_group_availability_empty():
    group_repo = InMemoryGroupRepository()
    availability_repo = InMemoryAvailabilityRepository()
    service = AvailabilityService(availability_repo, group_repo)

    group, owner = await group_repo.create_group(
        group_name="Trip",
        actor_id=None,
        display_name="Owner",
        user_id=uuid4(),
    )

    summary = await service.calculate_group_availability(group_id=group.id, user_id=owner.user_id)
    assert summary == []


@pytest.mark.asyncio
async def test_calculate_group_availability_merges_adjacent_and_clamps():
    group_repo = InMemoryGroupRepository()
    availability_repo = InMemoryAvailabilityRepository()
    service = AvailabilityService(availability_repo, group_repo)

    user_one = uuid4()
    user_two = uuid4()

    group, owner = await group_repo.create_group(
        group_name="Trip",
        actor_id=None,
        display_name="Owner",
        user_id=user_one,
    )
    await group_repo.add_member_to_group(group.id, user_two, display_name="Member")

    # User one has two adjacent ranges; user two overlaps partially
    await availability_repo.create_availability(
        group_id=group.id,
        user_id=user_one,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 2),
    )
    await availability_repo.create_availability(
        group_id=group.id,
        user_id=user_one,
        start_date=date(2025, 1, 3),
        end_date=date(2025, 1, 4),
    )
    # Overlapping interval that should not push count beyond 2
    await availability_repo.create_availability(
        group_id=group.id,
        user_id=user_two,
        start_date=date(2025, 1, 2),
        end_date=date(2025, 1, 3),
    )

    summary = await service.calculate_group_availability(group_id=group.id, user_id=user_one)

    assert summary == [
        {"from": date(2025, 1, 1), "to": date(2025, 1, 1), "availableCount": 1, "totalMembers": 2},
        {"from": date(2025, 1, 2), "to": date(2025, 1, 3), "availableCount": 2, "totalMembers": 2},
        {"from": date(2025, 1, 4), "to": date(2025, 1, 4), "availableCount": 1, "totalMembers": 2},
    ]
