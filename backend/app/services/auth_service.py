"""Authentication-related helpers for Supabase claims."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User, UserActor
from .group_service import GroupService


class AuthService:
    """Service functions for linking Supabase users with local actors."""

    @staticmethod
    async def upsert_user(
        session: AsyncSession,
        user_id: UUID,
        display_name: Optional[str] = None,
        email: Optional[str] = None,
    ) -> User:
        user = await session.get(User, user_id)
        if not user:
            user = User(id=user_id, display_name=display_name, email=email)
            session.add(user)
        else:
            changed = False
            if display_name and user.display_name != display_name:
                user.display_name = display_name
                changed = True
            if email and user.email != email:
                user.email = email
                changed = True
            if changed:
                session.add(user)

        await session.flush()
        return user

    @staticmethod
    async def record_claim(session: AsyncSession, actor_id: str, user_id: UUID) -> UserActor:
        mapping = await session.get(UserActor, actor_id)
        if mapping:
            mapping.user_id = user_id
            if not mapping.claimed_at:
                mapping.claimed_at = datetime.utcnow()
        else:
            mapping = UserActor(actor_id=actor_id, user_id=user_id)
            session.add(mapping)

        await session.flush()
        return mapping

    @staticmethod
    async def claim_actor(
        session: AsyncSession,
        actor_id: str,
        user_id: UUID,
        display_name: Optional[str],
        email: Optional[str],
    ) -> dict:
        """Claim a local actor for the authenticated Supabase user."""

        await AuthService.upsert_user(session, user_id=user_id, display_name=display_name, email=email)
        mapping = await AuthService.record_claim(session, actor_id=actor_id, user_id=user_id)
        updated = await GroupService.claim_memberships_for_user(session, actor_id=actor_id, user_id=user_id)

        await session.commit()

        return {
            "actorId": actor_id,
            "userId": str(user_id),
            "claimedAt": mapping.claimed_at,
            "updatedMemberships": updated,
        }
