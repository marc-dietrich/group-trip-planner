"""Group service - core business logic (user core)."""

from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import UUID

from app.user_core.models import Group, GroupInvite, GroupMember
from app.user_core.repositories import GroupRepository


class InviteExpiredError(Exception):
    """Raised when an invite token is expired."""


class InviteNotFoundError(Exception):
    """Raised when an invite cannot be resolved to a group."""


class GroupService:
    """Service für Gruppen-Operationen über ein Repository."""

    def __init__(self, repo: GroupRepository):
        self.repo = repo

    @staticmethod
    def _normalize_dt(value: datetime) -> datetime:
        # Store naive UTC timestamps to align with TIMESTAMP WITHOUT TIME ZONE columns.
        return value.replace(tzinfo=None)

    @classmethod
    def _calculate_expiry(cls, ttl_days: int, now: Optional[datetime] = None) -> datetime:
        base = now or datetime.utcnow()
        normalized = cls._normalize_dt(base)
        return normalized + timedelta(days=ttl_days)

    @staticmethod
    def is_invite_expired(invite: GroupInvite, now: Optional[datetime] = None) -> bool:
        current = GroupService._normalize_dt(now or datetime.utcnow())
        expires_at = GroupService._normalize_dt(invite.expires_at)
        return expires_at <= current

    async def create_group(
        self,
        group_name: str,
        actor_id: Optional[str],
        display_name: str,
        user_id: Optional[UUID] = None,
        invite_ttl_days: Optional[int] = None,
    ) -> Tuple[Group, GroupMember]:
        """Create a group and optionally seed a default invite."""

        group, owner = await self.repo.create_group(
            group_name=group_name,
            actor_id=actor_id,
            display_name=display_name,
            user_id=user_id,
        )

        if invite_ttl_days is not None:
            await self.ensure_invite_for_group(group=group, ttl_days=invite_ttl_days)

        return group, owner

    async def ensure_invite_for_group(self, group: Group, ttl_days: int) -> GroupInvite:
        """Return existing invite for a group or create one with the configured TTL."""

        token = str(group.id)
        existing = await self.repo.get_invite_by_token(token)
        if existing:
            return existing

        expires_at = self._calculate_expiry(ttl_days)
        return await self.repo.create_invite(group_id=group.id, token=token, expires_at=expires_at)

    async def get_groups(self) -> List[Group]:
        """Fetch all groups."""
        return await self.repo.get_groups()

    async def get_group(self, group_id: UUID) -> Optional[Group]:
        """Fetch a single group by id."""
        return await self.repo.get_group(group_id)

    async def get_group_members(self, group_id: UUID) -> List[GroupMember]:
        """Fetch all members of a group."""
        return await self.repo.get_group_members(group_id)

    async def delete_group(self, group_id: UUID) -> bool:
        """Delete a group (and cascading members) if it exists."""
        return await self.repo.delete_group(group_id)

    async def get_groups_for_identity(
        self,
        actor_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Tuple[Group, GroupMember]]:
        """Fetch groups for either a local actor or authenticated user."""
        return await self.repo.get_groups_for_identity(actor_id=actor_id, user_id=user_id)

    async def claim_memberships_for_user(self, actor_id: str, user_id: UUID) -> int:
        """Assign a Supabase user to all memberships created by an actor."""
        return await self.repo.claim_memberships_for_user(actor_id=actor_id, user_id=user_id)

    async def get_invite_preview(self, token: str, ttl_days: int) -> Tuple[Group, GroupInvite]:
        """Resolve an invite token to its group, validating expiration."""

        invite = await self.repo.get_invite_by_token(token)
        group: Optional[Group] = None

        if not invite:
            try:
                group_id = UUID(token)
            except ValueError as exc:  # Defensive: should not happen for UUID route param
                raise InviteNotFoundError("Einladung nicht gefunden") from exc

            group = await self.repo.get_group(group_id)
            if not group:
                raise InviteNotFoundError("Einladung nicht gefunden")

            invite = await self.repo.create_invite(
                group_id=group.id,
                token=token,
                expires_at=self._calculate_expiry(ttl_days),
            )
        else:
            group = await self.repo.get_group(invite.group_id)
            if not group:
                raise InviteNotFoundError("Einladung nicht gefunden")

        if self.is_invite_expired(invite):
            raise InviteExpiredError("Einladung abgelaufen")

        return group, invite

    async def join_group(
        self,
        group_id: UUID,
        actor_id: str,
        display_name: str,
        user_id: UUID | None = None,
        invite_ttl_days: int = 7,
    ) -> Tuple[Group, GroupMember, bool, GroupInvite]:
        """Join a group by creating a membership when missing.

        Returns a tuple of (group, member, created_flag, invite).
        """

        group, invite = await self.get_invite_preview(token=str(group_id), ttl_days=invite_ttl_days)

        existing = await self.repo.get_member_by_actor(group_id=group.id, actor_id=actor_id)
        if existing:
            return group, existing, False, invite

        member = await self.repo.add_member_to_group(
            group_id=group.id,
            actor_id=actor_id,
            user_id=user_id,
            display_name=display_name,
            role="member",
        )
        await self.repo.increment_invite_used_count(invite.id)
        return group, member, True, invite
