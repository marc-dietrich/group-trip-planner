"""Dependency wiring for FastAPI routes."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.repositories import (
    GroupRepository,
    IdentityRepository,
    SQLModelGroupRepository,
    SQLModelIdentityRepository,
)
from app.services import AuthService, GroupService


async def get_group_repository(session: AsyncSession = Depends(get_session)) -> GroupRepository:
    return SQLModelGroupRepository(session)


async def get_identity_repository(session: AsyncSession = Depends(get_session)) -> IdentityRepository:
    return SQLModelIdentityRepository(session)


async def get_group_service(repo: GroupRepository = Depends(get_group_repository)) -> GroupService:
    return GroupService(repo)


async def get_auth_service(
    identity_repo: IdentityRepository = Depends(get_identity_repository),
    group_repo: GroupRepository = Depends(get_group_repository),
) -> AuthService:
    return AuthService(identity_repo=identity_repo, group_repo=group_repo)
