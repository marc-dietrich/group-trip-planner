"""Unit-level tests for services using in-memory repositories (no DB)."""

from datetime import date, datetime, timedelta

import pytest

from app.user_core.repositories import InMemoryAvailabilityRepository, InMemoryGroupRepository, InMemoryIdentityRepository
from app.user_core.services import AuthService, AvailabilityService, GroupService


@pytest.mark.asyncio
async def test_group_service_create_and_list():
    repo = InMemoryGroupRepository()
    service = GroupService(repo)

    group, owner = await service.create_group(
        group_name="Backend Test Group",
        actor_id="actor-123",
        display_name="Tester",
    )

    assert group.name == "Backend Test Group"
    assert owner.role == "owner"

    groups = await service.get_groups()
    assert len(groups) == 1

    members = await service.get_group_members(group.id)
    assert members[0].actor_id == "actor-123"


@pytest.mark.asyncio
async def test_group_service_delete():
    repo = InMemoryGroupRepository()
    service = GroupService(repo)
    group, _ = await service.create_group(
        group_name="Delete",
        actor_id="actor-x",
        display_name="X",
    )

    deleted = await service.delete_group(group.id)
    assert deleted is True
    assert await service.get_group(group.id) is None


@pytest.mark.asyncio
async def test_auth_service_claims_memberships():
    group_repo = InMemoryGroupRepository()
    identity_repo = InMemoryIdentityRepository()
    group_service = GroupService(group_repo)
    auth_service = AuthService(identity_repo=identity_repo, group_repo=group_repo)

    group, member = await group_service.create_group(
        group_name="Claimable",
        actor_id="actor-claim",
        display_name="Anon",
    )

    result = await auth_service.claim_actor(
        actor_id="actor-claim",
        user_id=member.user_id or group.id,  # deterministic UUID reuse
        display_name="User",
        email="user@example.com",
    )

    assert result["updatedMemberships"] == 1
    members = await group_service.get_group_members(group.id)
    assert members[0].user_id is not None


@pytest.mark.asyncio
async def test_group_auto_archives_after_six_months_inactive():
    repo = InMemoryGroupRepository()
    service = GroupService(repo)

    group, _ = await service.create_group(
        group_name="Archivierung",
        actor_id="actor-archive",
        display_name="Archiv Tester",
    )
    group.last_interaction_at = datetime.utcnow() - timedelta(days=190)

    refreshed = await service.get_group(group.id)

    assert refreshed is not None
    assert refreshed.is_archived is True


@pytest.mark.asyncio
async def test_invite_generation_unarchives_group():
    repo = InMemoryGroupRepository()
    service = GroupService(repo)

    group, _ = await service.create_group(
        group_name="Invite Reaktivierung",
        actor_id="actor-invite",
        display_name="Invite Tester",
    )
    group.is_archived = True
    group.last_interaction_at = datetime.utcnow() - timedelta(days=190)

    await service.ensure_invite_for_group(group=group, ttl_days=7)
    refreshed = await service.get_group(group.id)

    assert refreshed is not None
    assert refreshed.is_archived is False
    assert refreshed.last_interaction_at > datetime.utcnow() - timedelta(minutes=1)


@pytest.mark.asyncio
async def test_join_new_member_unarchives_group():
    repo = InMemoryGroupRepository()
    service = GroupService(repo)

    group, _ = await service.create_group(
        group_name="Join Reaktivierung",
        actor_id="owner-1",
        display_name="Owner",
    )
    group.is_archived = True
    group.last_interaction_at = datetime.utcnow() - timedelta(days=190)
    invite = await service.ensure_invite_for_group(group=group, ttl_days=7)

    joined_group, _, created, _ = await service.join_group(
        invite_token=invite.token,
        actor_id="member-2",
        display_name="Member",
    )

    assert created is True
    assert joined_group.is_archived is False


@pytest.mark.asyncio
async def test_add_availability_unarchives_group():
    group_repo = InMemoryGroupRepository()
    availability_repo = InMemoryAvailabilityRepository()
    group_service = GroupService(group_repo)
    availability_service = AvailabilityService(availability_repo=availability_repo, group_repo=group_repo)

    group, _ = await group_service.create_group(
        group_name="Availability Reaktivierung",
        actor_id="owner-availability",
        display_name="Owner",
    )
    group.is_archived = True
    group.last_interaction_at = datetime.utcnow() - timedelta(days=190)

    await availability_service.add_availability(
        actor_id="owner-availability",
        user_id=None,
        group_id=group.id,
        start_date=date(2026, 5, 1),
        end_date=date(2026, 5, 3),
    )

    refreshed = await group_service.get_group(group.id)
    assert refreshed is not None
    assert refreshed.is_archived is False
