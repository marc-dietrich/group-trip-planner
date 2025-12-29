"""Identity repository abstractions (users + claims)."""

from typing import Optional, Protocol
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserActor


class IdentityRepository(Protocol):
    async def upsert_user(self, user_id: UUID, display_name: Optional[str], email: Optional[str]) -> User:
        ...

    async def record_claim(self, actor_id: str, user_id: UUID) -> UserActor:
        ...

    async def commit(self) -> None:
        ...


class SQLModelIdentityRepository(IdentityRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def upsert_user(self, user_id: UUID, display_name: Optional[str], email: Optional[str]) -> User:
        user = await self.session.get(User, user_id)
        if not user:
            user = User(id=user_id, display_name=display_name, email=email)
            self.session.add(user)
        else:
            changed = False
            if display_name and user.display_name != display_name:
                user.display_name = display_name
                changed = True
            if email and user.email != email:
                user.email = email
                changed = True
            if changed:
                self.session.add(user)

        await self.session.flush()
        return user

    async def record_claim(self, actor_id: str, user_id: UUID) -> UserActor:
        mapping = await self.session.get(UserActor, actor_id)
        from datetime import datetime

        if mapping:
            mapping.user_id = user_id
            if not mapping.claimed_at:
                mapping.claimed_at = datetime.utcnow()
        else:
            mapping = UserActor(actor_id=actor_id, user_id=user_id)
            self.session.add(mapping)

        await self.session.flush()
        return mapping

    async def commit(self) -> None:
        await self.session.commit()


class InMemoryIdentityRepository(IdentityRepository):
    def __init__(self) -> None:
        self.users: dict[UUID, User] = {}
        self.claims: dict[str, UserActor] = {}

    async def upsert_user(self, user_id: UUID, display_name: Optional[str], email: Optional[str]) -> User:
        user = self.users.get(user_id)
        if not user:
            user = User(id=user_id, display_name=display_name, email=email)
        else:
            if display_name:
                user.display_name = display_name
            if email:
                user.email = email
        self.users[user_id] = user
        return user

    async def record_claim(self, actor_id: str, user_id: UUID) -> UserActor:
        from datetime import datetime

        mapping = self.claims.get(actor_id)
        if mapping:
            mapping.user_id = user_id
            if not mapping.claimed_at:
                mapping.claimed_at = datetime.utcnow()
        else:
            mapping = UserActor(actor_id=actor_id, user_id=user_id, claimed_at=datetime.utcnow())
        self.claims[actor_id] = mapping
        return mapping

    async def commit(self) -> None:  # pragma: no cover - in-memory no-op
        return None
