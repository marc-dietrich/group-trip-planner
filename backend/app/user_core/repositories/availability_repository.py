"""Availability repository abstractions."""

from datetime import date
from typing import List, Protocol
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.user_core.models import Availability


class AvailabilityRepository(Protocol):
    """Persistence operations for availabilities."""

    async def create_availability(
        self,
        *,
        group_id: UUID,
        user_id: UUID,
        start_date: date,
        end_date: date,
    ) -> Availability:
        ...

    async def list_for_user_in_group(self, *, user_id: UUID, group_id: UUID) -> List[Availability]:
        ...

    async def list_for_group(self, *, group_id: UUID) -> List[Availability]:
        ...

    async def get_by_id(self, availability_id: UUID) -> Availability | None:
        ...

    async def delete_for_user(self, *, availability_id: UUID, user_id: UUID) -> bool:
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
        user_id: UUID,
        start_date: date,
        end_date: date,
    ) -> Availability:
        record = Availability(
                        id=uuid4(),  # stable id even before flush for consistent tests
                        group_id=group_id,
                        user_id=user_id,
                        start_date=start_date,
                        end_date=end_date,
                        kind="available",
        )
        self.session.add(record)
        await self.session.flush()
        await self.session.refresh(record)
        return record

    async def list_for_user_in_group(self, *, user_id: UUID, group_id: UUID) -> List[Availability]:
        stmt = select(Availability).where(
            Availability.group_id == group_id,
            Availability.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_group(self, *, group_id: UUID) -> List[Availability]:
        stmt = select(Availability).where(Availability.group_id == group_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, availability_id: UUID) -> Availability | None:
        return await self.session.get(Availability, availability_id)

    async def delete_for_user(self, *, availability_id: UUID, user_id: UUID) -> bool:
        record = await self.session.get(Availability, availability_id)
        if not record or record.user_id != user_id:
            return False
        await self.session.delete(record)
        await self.session.flush()
        return True

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
        user_id: UUID,
        start_date: date,
        end_date: date,
    ) -> Availability:
        record = Availability(
            id=uuid4(),
            group_id=group_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            kind="available",
        )
        self._rows.append(record)
        return record

    async def list_for_user_in_group(self, *, user_id: UUID, group_id: UUID) -> List[Availability]:
        return [r for r in self._rows if r.group_id == group_id and r.user_id == user_id]

    async def list_for_group(self, *, group_id: UUID) -> List[Availability]:
        return [r for r in self._rows if r.group_id == group_id]

    async def get_by_id(self, availability_id: UUID) -> Availability | None:
        return next((r for r in self._rows if r.id == availability_id), None)

    async def delete_for_user(self, *, availability_id: UUID, user_id: UUID) -> bool:
        before = len(self._rows)
        self._rows = [r for r in self._rows if not (r.id == availability_id and r.user_id == user_id)]
        return len(self._rows) != before

    async def commit(self) -> None:  # pragma: no cover - nothing to do
        return None
