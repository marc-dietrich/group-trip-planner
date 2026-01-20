"""Availability repository abstractions."""

from datetime import date
from typing import List, Protocol, Sequence
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlmodel import select

from app.user_core.models import Availability, GroupMember


class AvailabilityRepository(Protocol):
    """Persistence operations for availabilities."""

    async def create_availability(
        self,
        *,
        group_id: UUID,
        actor_id: str,
        user_id: UUID | None,
        start_date: date,
        end_date: date,
    ) -> Availability:
        ...

    async def list_for_actor_in_group(self, *, actor_id: str, group_id: UUID) -> List[Availability]:
        ...

    async def list_for_group(self, *, group_id: UUID) -> List[Availability]:
        ...

    async def get_by_id(self, availability_id: UUID) -> Availability | None:
        ...

    async def get_group_submission_stats(
        self, *, group_id: UUID, members: Sequence[GroupMember]
    ) -> tuple[int, int]:
        ...

    async def delete_for_actor(self, *, availability_id: UUID, actor_id: str) -> bool:
        ...

    async def commit(self) -> None:
        ...


class SQLModelAvailabilityRepository(AvailabilityRepository):
    """SQLModel-backed availability repo."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_availability(
        self,
        *,
        group_id: UUID,
        actor_id: str,
        user_id: UUID | None,
        start_date: date,
        end_date: date,
    ) -> Availability:
        record = Availability(
                        id=uuid4(),  # stable id even before flush for consistent tests
                        group_id=group_id,
                        actor_id=actor_id,
                        user_id=user_id,
                        start_date=start_date,
                        end_date=end_date,
                        kind="available",
        )
        self.session.add(record)
        await self.session.flush()
        await self.session.refresh(record)
        return record

    async def list_for_actor_in_group(self, *, actor_id: str, group_id: UUID) -> List[Availability]:
        stmt = select(Availability).where(
            Availability.group_id == group_id,
            Availability.actor_id == actor_id,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_group(self, *, group_id: UUID) -> List[Availability]:
        stmt = select(Availability).where(Availability.group_id == group_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, availability_id: UUID) -> Availability | None:
        return await self.session.get(Availability, availability_id)

    async def delete_for_actor(self, *, availability_id: UUID, actor_id: str) -> bool:
        record = await self.session.get(Availability, availability_id)
        if not record or record.actor_id != actor_id:
            return False
        await self.session.delete(record)
        await self.session.flush()
        return True

    async def get_group_submission_stats(
        self, *, group_id: UUID, members: Sequence[GroupMember]
    ) -> tuple[int, int]:
        del members  # unused in SQL path; required for Protocol compatibility

        stmt = text(
            """
            SELECT
                COUNT(DISTINCT gm.id) AS total_users,
                COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN gm.id END) AS users_with_availability
            FROM group_members gm
            LEFT JOIN availabilities a
              ON a.group_id = gm.group_id
             AND a.actor_id = gm.actor_id
            WHERE gm.group_id = :group_id
            """
        )

        result = await self.session.execute(stmt, {"group_id": group_id})
        row = result.mappings().first() or {}
        total = int(row.get("total_users") or 0)
        submitted = int(row.get("users_with_availability") or 0)
        return total, submitted

    async def commit(self) -> None:
        await self.session.commit()


class InMemoryAvailabilityRepository(AvailabilityRepository):
    """In-memory repo for tests."""

    def __init__(self) -> None:
        self._rows: list[Availability] = []

    async def create_availability(
        self,
        *,
        group_id: UUID,
        actor_id: str,
        user_id: UUID | None,
        start_date: date,
        end_date: date,
    ) -> Availability:
        record = Availability(
            id=uuid4(),
            group_id=group_id,
            actor_id=actor_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            kind="available",
        )
        self._rows.append(record)
        return record

    async def list_for_actor_in_group(self, *, actor_id: str, group_id: UUID) -> List[Availability]:
        return [r for r in self._rows if r.group_id == group_id and r.actor_id == actor_id]

    async def list_for_group(self, *, group_id: UUID) -> List[Availability]:
        return [r for r in self._rows if r.group_id == group_id]

    async def get_by_id(self, availability_id: UUID) -> Availability | None:
        return next((r for r in self._rows if r.id == availability_id), None)

    async def delete_for_actor(self, *, availability_id: UUID, actor_id: str) -> bool:
        before = len(self._rows)
        self._rows = [r for r in self._rows if not (r.id == availability_id and r.actor_id == actor_id)]
        return len(self._rows) != before

    async def get_group_submission_stats(
        self, *, group_id: UUID, members: Sequence[GroupMember]
    ) -> tuple[int, int]:
        member_actor_ids = {m.actor_id for m in members if m.group_id == group_id}
        total_users = len(member_actor_ids)
        submitted_actor_ids = {
            a.actor_id for a in self._rows if a.group_id == group_id and a.actor_id in member_actor_ids
        }
        return total_users, len(submitted_actor_ids)

    async def commit(self) -> None:  # pragma: no cover - nothing to do
        return None
