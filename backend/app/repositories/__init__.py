"""Repository abstractions for persistence layers."""

from .group_repository import (
    GroupRepository,
    InMemoryGroupRepository,
    SQLModelGroupRepository,
)
from .identity_repository import (
    IdentityRepository,
    InMemoryIdentityRepository,
    SQLModelIdentityRepository,
)

__all__ = [
    "GroupRepository",
    "InMemoryGroupRepository",
    "SQLModelGroupRepository",
    "IdentityRepository",
    "InMemoryIdentityRepository",
    "SQLModelIdentityRepository",
]
