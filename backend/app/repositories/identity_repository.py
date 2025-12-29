"""Deprecated shim to user_core identity repository implementations."""

from app.user_core.repositories import (
    IdentityRepository,
    InMemoryIdentityRepository,
    SQLModelIdentityRepository,
)

__all__ = ["IdentityRepository", "InMemoryIdentityRepository", "SQLModelIdentityRepository"]
