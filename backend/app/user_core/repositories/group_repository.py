"""Group repository abstractions for persistence (user core)."""

from datetime import datetime
from typing import List, Optional, Protocol, Tuple
from uuid import UUID

from sqlalchemy import or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.user_core.models import Group, GroupInvite, GroupMember, User


class GroupRepository(Protocol):
    """Persistence operations for groups and memberships."""

    async def create_group(
        self,
        group_name: str,
        actor_id: Optional[str],
        display_name: str,
        user_id: Optional[UUID] = None,
    ) -> tuple[Group, GroupMember]:
        ...

    async def get_groups(self) -> List[Group]:
        ...

    async def get_group(self, group_id: UUID) -> Optional[Group]:
        ...

    async def get_group_members(self, group_id: UUID) -> List[GroupMember]:
        ...

    async def delete_group(self, group_id: UUID) -> bool:
        ...

    async def get_groups_for_identity(
        self,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Tuple[Group, GroupMember]]:
        ...

    async def claim_memberships_for_user(self, actor_id: str, user_id: UUID) -> int:
        ...

    async def get_member_by_actor(self, group_id: UUID, actor_id: str) -> Optional[GroupMember]:
        ...

    async def get_member_for_identity(
        self,
        group_id: UUID,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> Optional[GroupMember]:
        ...

    async def add_member_to_group(
        self,
        group_id: UUID,
        actor_id: str,
        user_id: Optional[UUID],
        display_name: str,
        role: str = "member",
    ) -> GroupMember:
        ...

    async def create_invite(self, group_id: UUID, token: str, expires_at: datetime) -> GroupInvite:
        ...

    async def get_invite_by_token(self, token: str) -> Optional[GroupInvite]:
        ...

    async def get_latest_invite_for_group(self, group_id: UUID) -> Optional[GroupInvite]:
        ...

    async def increment_invite_used_count(self, invite_id: UUID) -> GroupInvite:
        ...

    async def leave_group(
        self,
        group_id: UUID,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> bool:
        ...

    async def commit(self) -> None:
        ...

    async def record_group_interaction(self, group_id: UUID, at: Optional[datetime] = None) -> Optional[Group]:
        ...

    async def set_group_archived(self, group_id: UUID, is_archived: bool) -> Optional[Group]:
        ...

    async def set_group_history_after_days(self, group_id: UUID, history_after_days: int) -> Optional[Group]:
        ...


class SQLModelGroupRepository(GroupRepository):
    """SQLModel-backed implementation using an AsyncSession."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_group(
        self,
        group_name: str,
        actor_id: Optional[str],
        display_name: str,
        user_id: Optional[UUID] = None,
    ) -> tuple[Group, GroupMember]:
        creator_actor_id = actor_id or (str(user_id) if user_id else "")
        member_actor_id = actor_id or (str(user_id) if user_id else "")

        if user_id:
            existing_user = await self.session.get(User, user_id)
            if not existing_user:
                # Ensure authenticated creators have a backing user row to satisfy FK constraints.
                self.session.add(User(id=user_id, display_name=display_name, email=None))
                await self.session.flush()
        group = Group(name=group_name, created_by_actor=creator_actor_id)
        self.session.add(group)
        await self.session.flush()

        owner = GroupMember(
            group_id=group.id,
            actor_id=member_actor_id,
            user_id=user_id,
            display_name=display_name,
            role="owner",
        )
        self.session.add(owner)

        await self.session.commit()
        await self.session.refresh(group)
        await self.session.refresh(owner)
        return group, owner

    async def get_groups(self) -> List[Group]:
        result = await self.session.execute(select(Group))
        return list(result.scalars().all())

    async def get_group(self, group_id: UUID) -> Optional[Group]:
        return await self.session.get(Group, group_id)

    async def get_group_members(self, group_id: UUID) -> List[GroupMember]:
        result = await self.session.execute(select(GroupMember).where(GroupMember.group_id == group_id))
        return list(result.scalars().all())

    async def delete_group(self, group_id: UUID) -> bool:
        group = await self.session.get(Group, group_id)
        if not group:
            return False

        await self.session.delete(group)
        await self.session.commit()
        return True

    async def get_groups_for_identity(
        self,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Tuple[Group, GroupMember]]:
        conditions = []
        if actor_id:
            conditions.append(GroupMember.actor_id == actor_id)
        if user_id:
            conditions.append(GroupMember.user_id == user_id)

        stmt = select(Group, GroupMember).join(GroupMember, GroupMember.group_id == Group.id)
        if conditions:
            stmt = stmt.where(or_(*conditions))

        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def claim_memberships_for_user(self, actor_id: str, user_id: UUID) -> int:
        stmt = update(GroupMember).where(GroupMember.actor_id == actor_id).values(user_id=user_id)
        result = await self.session.execute(stmt)
        return result.rowcount or 0

    async def get_member_by_actor(self, group_id: UUID, actor_id: str) -> Optional[GroupMember]:
        stmt = select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.actor_id == actor_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_member_for_identity(
        self,
        group_id: UUID,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> Optional[GroupMember]:
        conditions = []
        if actor_id:
            conditions.append(GroupMember.actor_id == actor_id)
        if user_id:
            conditions.append(GroupMember.user_id == user_id)
        if not conditions:
            return None

        stmt = select(GroupMember).where(
            GroupMember.group_id == group_id,
            or_(*conditions),
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def add_member_to_group(
        self,
        group_id: UUID,
        actor_id: str,
        user_id: Optional[UUID],
        display_name: str,
        role: str = "member",
    ) -> GroupMember:
        # Ensure a user row exists for the FK constraint; reuse display_name if available.
        if user_id:
            user = await self.session.get(User, user_id)
            if not user:
                user = User(id=user_id, display_name=display_name, email=None)
                self.session.add(user)
                await self.session.flush()

        member = GroupMember(
            group_id=group_id,
            user_id=user_id,
            actor_id=actor_id,
            display_name=display_name,
            role=role,
        )
        self.session.add(member)
        await self.session.commit()
        await self.session.refresh(member)
        return member

    async def create_invite(self, group_id: UUID, token: str, expires_at: datetime) -> GroupInvite:
        invite = GroupInvite(group_id=group_id, token=token, expires_at=expires_at)
        self.session.add(invite)
        await self.session.commit()
        await self.session.refresh(invite)
        return invite

    async def get_invite_by_token(self, token: str) -> Optional[GroupInvite]:
        stmt = select(GroupInvite).where(GroupInvite.token == token)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_latest_invite_for_group(self, group_id: UUID) -> Optional[GroupInvite]:
        stmt = (
            select(GroupInvite)
            .where(GroupInvite.group_id == group_id)
            .order_by(GroupInvite.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def increment_invite_used_count(self, invite_id: UUID) -> GroupInvite:
        stmt = (
            update(GroupInvite)
            .where(GroupInvite.id == invite_id)
            .values(used_count=GroupInvite.used_count + 1)
            .returning(GroupInvite)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        updated = result.scalar_one()
        return updated

    async def leave_group(
        self,
        group_id: UUID,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> bool:
        member = await self.get_member_for_identity(
            group_id=group_id,
            actor_id=actor_id,
            user_id=user_id,
        )
        if not member:
            return False

        was_owner = member.role == "owner"
        await self.session.delete(member)

        if was_owner:
            replacement_stmt = (
                select(GroupMember)
                .where(GroupMember.group_id == group_id)
                .order_by(GroupMember.joined_at.asc())
                .limit(1)
            )
            replacement_result = await self.session.execute(replacement_stmt)
            replacement = replacement_result.scalars().first()
            if replacement:
                replacement.role = "owner"

        await self.session.commit()
        return True

    async def commit(self) -> None:
        await self.session.commit()

    async def record_group_interaction(self, group_id: UUID, at: Optional[datetime] = None) -> Optional[Group]:
        group = await self.session.get(Group, group_id)
        if not group:
            return None

        group.last_interaction_at = at or datetime.utcnow()
        group.is_archived = False
        await self.session.commit()
        await self.session.refresh(group)
        return group

    async def set_group_archived(self, group_id: UUID, is_archived: bool) -> Optional[Group]:
        group = await self.session.get(Group, group_id)
        if not group:
            return None

        group.is_archived = is_archived
        await self.session.commit()
        await self.session.refresh(group)
        return group

    async def set_group_history_after_days(self, group_id: UUID, history_after_days: int) -> Optional[Group]:
        group = await self.session.get(Group, group_id)
        if not group:
            return None

        group.history_after_days = history_after_days
        await self.session.commit()
        await self.session.refresh(group)
        return group


class InMemoryGroupRepository(GroupRepository):
    """Simple in-memory repository for fast tests."""

    def __init__(self) -> None:
        self.groups: dict[UUID, Group] = {}
        self.members: dict[UUID, GroupMember] = {}
        self.invites: dict[str, GroupInvite] = {}

    async def create_group(
        self,
        group_name: str,
        actor_id: Optional[str],
        display_name: str,
        user_id: Optional[UUID] = None,
    ) -> tuple[Group, GroupMember]:
        from uuid import uuid4

        user_actor_id = str(user_id) if user_id else ""
        creator_actor_id = actor_id or user_actor_id
        member_actor_id = actor_id or user_actor_id
        group = Group(name=group_name, created_by_actor=creator_actor_id)
        owner = GroupMember(
            group_id=group.id,
            actor_id=member_actor_id,
            user_id=user_id,
            display_name=display_name,
            role="owner",
        )
        self.groups[group.id] = group
        self.members[owner.id] = owner
        return group, owner

    async def get_groups(self) -> List[Group]:
        return list(self.groups.values())

    async def get_group(self, group_id: UUID) -> Optional[Group]:
        return self.groups.get(group_id)

    async def get_group_members(self, group_id: UUID) -> List[GroupMember]:
        return [m for m in self.members.values() if m.group_id == group_id]

    async def delete_group(self, group_id: UUID) -> bool:
        if group_id not in self.groups:
            return False
        # Remove group and any memberships
        self.groups.pop(group_id, None)
        self.members = {mid: m for mid, m in self.members.items() if m.group_id != group_id}
        return True

    async def get_groups_for_identity(
        self,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Tuple[Group, GroupMember]]:
        rows: list[tuple[Group, GroupMember]] = []
        for member in self.members.values():
            matches_actor = actor_id and member.actor_id == actor_id
            matches_user = user_id and member.user_id and str(member.user_id) == str(user_id)
            if actor_id is None and user_id is None:
                # Return all memberships
                matches_actor = True
            if matches_actor or matches_user:
                group = self.groups.get(member.group_id)
                if group:
                    rows.append((group, member))
        return rows

    async def claim_memberships_for_user(self, actor_id: str, user_id: UUID) -> int:
        updated = 0
        for member in self.members.values():
            if member.actor_id == actor_id:
                member.user_id = user_id
                updated += 1
        return updated

    async def get_member_by_actor(self, group_id: UUID, actor_id: str) -> Optional[GroupMember]:
        for member in self.members.values():
            if member.group_id == group_id and member.actor_id == actor_id:
                return member
        return None

    async def get_member_for_identity(
        self,
        group_id: UUID,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> Optional[GroupMember]:
        for member in self.members.values():
            if member.group_id != group_id:
                continue
            if actor_id and member.actor_id == actor_id:
                return member
            if user_id and member.user_id and str(member.user_id) == str(user_id):
                return member
        return None

    async def add_member_to_group(
        self,
        group_id: UUID,
        actor_id: str,
        user_id: Optional[UUID],
        display_name: str,
        role: str = "member",
    ) -> GroupMember:
        from uuid import uuid4

        member = GroupMember(
            id=uuid4(),
            group_id=group_id,
            actor_id=actor_id,
            user_id=user_id,
            display_name=display_name,
            role=role,
        )
        self.members[member.id] = member
        return member

    async def create_invite(self, group_id: UUID, token: str, expires_at: datetime) -> GroupInvite:
        from uuid import uuid4

        invite = GroupInvite(id=uuid4(), group_id=group_id, token=token, expires_at=expires_at, used_count=0)
        self.invites[token] = invite
        return invite

    async def get_invite_by_token(self, token: str) -> Optional[GroupInvite]:
        return self.invites.get(token)

    async def get_latest_invite_for_group(self, group_id: UUID) -> Optional[GroupInvite]:
        invites = [invite for invite in self.invites.values() if invite.group_id == group_id]
        if not invites:
            return None
        return max(invites, key=lambda invite: invite.created_at)

    async def increment_invite_used_count(self, invite_id: UUID) -> GroupInvite:
        for invite in self.invites.values():
            if invite.id == invite_id:
                invite.used_count += 1
                return invite
        raise ValueError(f"Invite {invite_id} not found")

    async def leave_group(
        self,
        group_id: UUID,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> bool:
        member = await self.get_member_for_identity(
            group_id=group_id,
            actor_id=actor_id,
            user_id=user_id,
        )
        if not member:
            return False

        was_owner = member.role == "owner"
        self.members.pop(member.id, None)

        if was_owner:
            remaining = [m for m in self.members.values() if m.group_id == group_id]
            if remaining:
                replacement = min(remaining, key=lambda m: m.joined_at)
                replacement.role = "owner"

        return True

    async def commit(self) -> None:  # pragma: no cover - no-op for in-memory
        return None

    async def record_group_interaction(self, group_id: UUID, at: Optional[datetime] = None) -> Optional[Group]:
        group = self.groups.get(group_id)
        if not group:
            return None

        group.last_interaction_at = at or datetime.utcnow()
        group.is_archived = False
        return group

    async def set_group_archived(self, group_id: UUID, is_archived: bool) -> Optional[Group]:
        group = self.groups.get(group_id)
        if not group:
            return None

        group.is_archived = is_archived
        return group

    async def set_group_history_after_days(self, group_id: UUID, history_after_days: int) -> Optional[Group]:
        group = self.groups.get(group_id)
        if not group:
            return None

        group.history_after_days = history_after_days
        return group
