"""Tests für die aktuellen Models."""

from uuid import UUID

from app.user_core.models import Group, GroupMember


def test_group_model():
    """Group should use UUID primary keys and creator tracking."""
    group = Group(name="Test Gruppe", created_by_actor="actor-1")
    assert group.name == "Test Gruppe"
    assert group.created_by_actor == "actor-1"
    assert isinstance(group.id, UUID)


def test_group_member_model():
    """GroupMember should carry actor id and role."""
    member = GroupMember(
        group_id=UUID("00000000-0000-0000-0000-000000000000"),
        actor_id="actor-1",
        display_name="Tester",
        role="owner",
    )
    assert member.actor_id == "actor-1"
    assert member.display_name == "Tester"
    assert member.role == "owner"