"""Actor lifecycle helpers."""

from datetime import datetime
from typing import Optional

from app.user_core.repositories.actor_repository import ActorRepository


class ActorService:
    """Creates or retrieves local actors for guest usage."""

    def __init__(self, repo: ActorRepository):
        self.repo = repo

    async def ensure_actor(self, actor_id: Optional[str] = None):
        """Return an existing actor or create a new one."""

        if actor_id:
            existing = await self.repo.get(actor_id)
            if existing:
                return existing
        actor = await self.repo.create(actor_id)
        await self.repo.commit()
        return actor

    async def get_supporter_status(self, actor_id: str) -> dict:
        try:
            badge = await self.repo.get_supporter_badge(actor_id)
        except Exception:
            badge = None
        if not badge:
            return {
                "actorId": actor_id,
                "hasCrown": False,
                "supporterUntil": None,
                "lastDonatedAt": None,
            }

        now = datetime.utcnow()
        return {
            "actorId": actor_id,
            "hasCrown": badge.supporter_until > now,
            "supporterUntil": badge.supporter_until,
            "lastDonatedAt": badge.last_donated_at,
        }

    async def grant_supporter_badge(
        self,
        actor_id: str,
        duration_days: int = 183,
        donated_at: datetime | None = None,
    ) -> dict:
        await self.ensure_actor(actor_id)
        badge = await self.repo.grant_supporter_badge(
            actor_id=actor_id,
            duration_days=duration_days,
            donated_at=donated_at,
        )
        await self.repo.commit()

        return {
            "actorId": actor_id,
            "hasCrown": badge.supporter_until > datetime.utcnow(),
            "supporterUntil": badge.supporter_until,
            "lastDonatedAt": badge.last_donated_at,
        }
