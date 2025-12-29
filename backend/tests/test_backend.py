"""Unit-level tests for services using in-memory repositories (no DB)."""

import pytest

from app.repositories import InMemoryGroupRepository, InMemoryIdentityRepository
from app.services import AuthService, GroupService


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