"""Actor repository abstractions."""

from datetime import datetime, timedelta
from typing import Optional, Protocol
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.user_core.models import Actor, SupporterBadge


class ActorRepository(Protocol):
    async def get(self, actor_id: str) -> Actor | None:
        ...

    async def create(self, actor_id: Optional[str] = None) -> Actor:
        ...

    async def get_supporter_badge(self, actor_id: str) -> SupporterBadge | None:
        ...

    async def grant_supporter_badge(
        self,
        actor_id: str,
        duration_days: int = 183,
        donated_at: datetime | None = None,
    ) -> SupporterBadge:
        ...

    async def commit(self) -> None:
        ...


class SQLModelActorRepository(ActorRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, actor_id: str) -> Actor | None:
        return await self.session.get(Actor, actor_id)

    async def _ensure_supporter_schema(self) -> None:
        await self.session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS supporter_badges (
                    actor_id VARCHAR(255) PRIMARY KEY,
                    supporter_until TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                    last_donated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        await self.session.flush()

    async def create(self, actor_id: Optional[str] = None) -> Actor:
        candidate = actor_id or str(uuid4())
        existing = await self.get(candidate)
        if existing:
            return existing

        actor = Actor(id=candidate)
        self.session.add(actor)
        await self.session.commit()
        await self.session.refresh(actor)
        return actor

    async def get_supporter_badge(self, actor_id: str) -> SupporterBadge | None:
        try:
            return await self.session.get(SupporterBadge, actor_id)
        except SQLAlchemyError:
            await self.session.rollback()
            await self._ensure_supporter_schema()
            return await self.session.get(SupporterBadge, actor_id)

    async def grant_supporter_badge(
        self,
        actor_id: str,
        duration_days: int = 183,
        donated_at: datetime | None = None,
    ) -> SupporterBadge:
        now = donated_at or datetime.utcnow()
        badge = await self.get_supporter_badge(actor_id)

        if badge:
            base = badge.supporter_until if badge.supporter_until > now else now
            badge.supporter_until = base + timedelta(days=duration_days)
            badge.last_donated_at = now
        else:
            badge = SupporterBadge(
                actor_id=actor_id,
                supporter_until=now + timedelta(days=duration_days),
                last_donated_at=now,
            )
            self.session.add(badge)

        await self.session.flush()
        return badge

    async def commit(self) -> None:
        await self.session.commit()


class InMemoryActorRepository(ActorRepository):
    def __init__(self) -> None:
        self._actors: dict[str, Actor] = {}
        self._supporters: dict[str, SupporterBadge] = {}

    async def get(self, actor_id: str) -> Actor | None:
        return self._actors.get(actor_id)

    async def create(self, actor_id: Optional[str] = None) -> Actor:
        candidate = actor_id or str(uuid4())
        actor = self._actors.get(candidate)
        if actor:
            return actor
        actor = Actor(id=candidate)
        self._actors[candidate] = actor
        return actor

    async def get_supporter_badge(self, actor_id: str) -> SupporterBadge | None:
        return self._supporters.get(actor_id)

    async def grant_supporter_badge(
        self,
        actor_id: str,
        duration_days: int = 183,
        donated_at: datetime | None = None,
    ) -> SupporterBadge:
        now = donated_at or datetime.utcnow()
        badge = self._supporters.get(actor_id)
        if badge:
            base = badge.supporter_until if badge.supporter_until > now else now
            badge.supporter_until = base + timedelta(days=duration_days)
            badge.last_donated_at = now
        else:
            badge = SupporterBadge(
                actor_id=actor_id,
                supporter_until=now + timedelta(days=duration_days),
                last_donated_at=now,
            )
            self._supporters[actor_id] = badge
        return badge

    async def commit(self) -> None:  # pragma: no cover - no-op for in-memory
        return None
