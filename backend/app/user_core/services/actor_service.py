"""Actor lifecycle helpers."""

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
