"""Authentication-related helpers for Supabase claims (user core)."""

from typing import Optional
from uuid import UUID

from app.user_core.repositories import GroupRepository, IdentityRepository


class AuthService:
    """Service functions for linking Supabase users with local actors."""

    def __init__(self, identity_repo: IdentityRepository, group_repo: GroupRepository):
        self.identity_repo = identity_repo
        self.group_repo = group_repo

    async def claim_actor(
        self,
        actor_id: str,
        user_id: UUID,
        display_name: Optional[str],
        email: Optional[str],
    ) -> dict:
        """Claim a local actor for the authenticated Supabase user."""

        await self.identity_repo.upsert_user(user_id=user_id, display_name=display_name, email=email)
        mapping = await self.identity_repo.record_claim(actor_id=actor_id, user_id=user_id)
        updated = await self.group_repo.claim_memberships_for_user(actor_id=actor_id, user_id=user_id)

        await self.identity_repo.commit()
        await self.group_repo.commit()

        return {
            "actorId": actor_id,
            "userId": str(user_id),
            "claimedAt": mapping.claimed_at,
            "updatedMemberships": updated,
        }
