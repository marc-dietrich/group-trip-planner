"""Deprecated shim to user_core group repository implementations."""

from app.user_core.repositories import (
    GroupRepository,
    InMemoryGroupRepository,
    SQLModelGroupRepository,
)

__all__ = ["GroupRepository", "InMemoryGroupRepository", "SQLModelGroupRepository"]
