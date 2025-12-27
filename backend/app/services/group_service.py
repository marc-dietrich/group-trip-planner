"""Group service - core business logic."""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models import Group, GroupMember


class GroupService:
    """Service für Gruppen-Operationen."""

    @staticmethod
    async def create_group(
        session: AsyncSession,
        group_name: str,
        actor_id: str,
        display_name: str,
    ) -> Tuple[Group, GroupMember]:
        """Create a group and add the creator as owner in one transaction."""

        group = Group(name=group_name, created_by_actor=actor_id)
        session.add(group)
        await session.flush()

        owner = GroupMember(
            group_id=group.id,
            actor_id=actor_id,
            display_name=display_name,
            role="owner",
        )
        session.add(owner)

        await session.commit()
        await session.refresh(group)
        await session.refresh(owner)
        return group, owner

    @staticmethod
    async def get_groups(session: AsyncSession) -> List[Group]:
        """Fetch all groups."""
        result = await session.execute(select(Group))
        return list(result.scalars().all())

    @staticmethod
    async def get_group(session: AsyncSession, group_id: UUID) -> Optional[Group]:
        """Fetch a single group by id."""
        return await session.get(Group, group_id)

    @staticmethod
    async def get_group_members(session: AsyncSession, group_id: UUID) -> List[GroupMember]:
        """Fetch all members of a group."""
        result = await session.execute(select(GroupMember).where(GroupMember.group_id == group_id))
        return list(result.scalars().all())

    @staticmethod
    async def delete_group(session: AsyncSession, group_id: UUID) -> bool:
        """Delete a group (and cascading members) if it exists."""
        group = await session.get(Group, group_id)
        if not group:
            return False

        await session.delete(group)
        await session.commit()
        return True

    @staticmethod
    async def get_groups_for_actor(session: AsyncSession, actor_id: str) -> List[Tuple[Group, GroupMember]]:
        """Fetch groups where the actor is a member, including membership info."""
        stmt = (
            select(Group, GroupMember)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .where(GroupMember.actor_id == actor_id)
        )
        result = await session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]