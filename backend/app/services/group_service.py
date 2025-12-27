"""Group service - core business logic."""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models import Group, GroupMember


class GroupService:
    """Service für Gruppen-Operationen."""

    @staticmethod
    async def create_group(
        session: AsyncSession,
        group_name: str,
        actor_id: Optional[str],
        display_name: str,
        user_id: Optional[str] = None,
    ) -> Tuple[Group, GroupMember]:
        """Create a group and add the creator as owner in one transaction."""

        creator_actor_id = actor_id or (user_id or "")
        member_actor_id = actor_id or (user_id or "")
        group = Group(name=group_name, created_by_actor=creator_actor_id)
        session.add(group)
        await session.flush()

        owner = GroupMember(
            group_id=group.id,
            actor_id=member_actor_id,
            user_id=user_id,
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
        return await GroupService.get_groups_for_identity(session, actor_id=actor_id, user_id=None)

    @staticmethod
    async def get_groups_for_identity(
        session: AsyncSession,
        actor_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Tuple[Group, GroupMember]]:
        """Fetch groups for either a local actor or authenticated user."""

        conditions = []
        if actor_id:
            conditions.append(GroupMember.actor_id == actor_id)
        if user_id:
            conditions.append(GroupMember.user_id == user_id)

        stmt = select(Group, GroupMember).join(GroupMember, GroupMember.group_id == Group.id)
        if conditions:
            stmt = stmt.where(or_(*conditions))

        result = await session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    @staticmethod
    async def claim_memberships_for_user(
        session: AsyncSession,
        actor_id: str,
        user_id: UUID,
    ) -> int:
        """Assign a Supabase user to all memberships created by an actor."""

        stmt = (
            update(GroupMember)
            .where(GroupMember.actor_id == actor_id)
            .values(user_id=user_id)
        )
        result = await session.execute(stmt)
        return result.rowcount or 0