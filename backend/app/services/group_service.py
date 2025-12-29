"""Group service - core business logic."""

from typing import List, Optional, Tuple
from uuid import UUID

from app.models import Group, GroupMember
from app.repositories import GroupRepository


class GroupService:
    """Service für Gruppen-Operationen über ein Repository."""

    def __init__(self, repo: GroupRepository):
        self.repo = repo

    async def create_group(
        self,
        group_name: str,
        actor_id: Optional[str],
        display_name: str,
        user_id: Optional[str] = None,
    ) -> Tuple[Group, GroupMember]:
        """Create a group and add the creator as owner in one transaction."""
        return await self.repo.create_group(
            group_name=group_name,
            actor_id=actor_id,
            display_name=display_name,
            user_id=user_id,
        )

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
        user_id: Optional[str] = None,
    ) -> List[Tuple[Group, GroupMember]]:
        """Fetch groups for either a local actor or authenticated user."""
        return await self.repo.get_groups_for_identity(actor_id=actor_id, user_id=user_id)

    async def claim_memberships_for_user(self, actor_id: str, user_id: UUID) -> int:
        """Assign a Supabase user to all memberships created by an actor."""
        return await self.repo.claim_memberships_for_user(actor_id=actor_id, user_id=user_id)