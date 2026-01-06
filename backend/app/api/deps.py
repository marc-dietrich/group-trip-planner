"""Dependency wiring for FastAPI routes."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.user_core.repositories import (
    GroupRepository,
    IdentityRepository,
    SQLModelGroupRepository,
    SQLModelIdentityRepository,
    AvailabilityRepository,
    SQLModelAvailabilityRepository,
    ActorRepository,
    SQLModelActorRepository,
)
from app.user_core.services import AuthService, GroupService, AvailabilityService, ActorService


async def get_group_repository(session: AsyncSession = Depends(get_session)) -> GroupRepository:
    return SQLModelGroupRepository(session)


async def get_identity_repository(session: AsyncSession = Depends(get_session)) -> IdentityRepository:
    return SQLModelIdentityRepository(session)


async def get_group_service(repo: GroupRepository = Depends(get_group_repository)) -> GroupService:
    return GroupService(repo)


async def get_actor_repository(session: AsyncSession = Depends(get_session)) -> ActorRepository:
    return SQLModelActorRepository(session)


async def get_actor_service(repo: ActorRepository = Depends(get_actor_repository)) -> ActorService:
    return ActorService(repo)


async def get_auth_service(
    identity_repo: IdentityRepository = Depends(get_identity_repository),
    group_repo: GroupRepository = Depends(get_group_repository),
) -> AuthService:
    return AuthService(identity_repo=identity_repo, group_repo=group_repo)


async def get_availability_repository(session: AsyncSession = Depends(get_session)) -> AvailabilityRepository:
    return SQLModelAvailabilityRepository(session)


async def get_availability_service(
    availability_repo: AvailabilityRepository = Depends(get_availability_repository),
    group_repo: GroupRepository = Depends(get_group_repository),
) -> AvailabilityService:
    return AvailabilityService(availability_repo=availability_repo, group_repo=group_repo)
