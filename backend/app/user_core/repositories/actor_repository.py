"""Actor repository abstractions."""

from typing import Optional, Protocol
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.user_core.models import Actor


class ActorRepository(Protocol):
    async def get(self, actor_id: str) -> Actor | None:
        ...

    async def create(self, actor_id: Optional[str] = None) -> Actor:
        ...

    async def commit(self) -> None:
        ...


class SQLModelActorRepository(ActorRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, actor_id: str) -> Actor | None:
        return await self.session.get(Actor, actor_id)

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

    async def commit(self) -> None:
        await self.session.commit()


class InMemoryActorRepository(ActorRepository):
    def __init__(self) -> None:
        self._actors: dict[str, Actor] = {}

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

    async def commit(self) -> None:  # pragma: no cover - no-op for in-memory
        return None
