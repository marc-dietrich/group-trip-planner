"""User core repository abstractions."""

from .group_repository import GroupRepository, InMemoryGroupRepository, SQLModelGroupRepository
from .identity_repository import IdentityRepository, InMemoryIdentityRepository, SQLModelIdentityRepository
from .availability_repository import (
    AvailabilityRepository,
    InMemoryAvailabilityRepository,
    SQLModelAvailabilityRepository,
)

__all__ = [
    "GroupRepository",
    "InMemoryGroupRepository",
    "SQLModelGroupRepository",
    "IdentityRepository",
    "InMemoryIdentityRepository",
    "SQLModelIdentityRepository",
    "AvailabilityRepository",
    "InMemoryAvailabilityRepository",
    "SQLModelAvailabilityRepository",
]
