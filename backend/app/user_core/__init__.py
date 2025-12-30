"""User core package (actors, users, groups)."""

from .models import Group, GroupMember, User, UserActor, Availability
from .repositories import (
    GroupRepository,
    InMemoryGroupRepository,
    SQLModelGroupRepository,
    IdentityRepository,
    InMemoryIdentityRepository,
    SQLModelIdentityRepository,
    AvailabilityRepository,
    InMemoryAvailabilityRepository,
    SQLModelAvailabilityRepository,
)
from .services import AuthService, GroupService, AvailabilityService

__all__ = [
    "Group",
    "GroupMember",
    "User",
    "UserActor",
    "Availability",
    "GroupRepository",
    "InMemoryGroupRepository",
    "SQLModelGroupRepository",
    "IdentityRepository",
    "InMemoryIdentityRepository",
    "SQLModelIdentityRepository",
    "AvailabilityRepository",
    "InMemoryAvailabilityRepository",
    "SQLModelAvailabilityRepository",
    "AuthService",
    "GroupService",
    "AvailabilityService",
]
