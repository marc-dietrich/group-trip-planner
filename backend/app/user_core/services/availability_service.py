"""Availability service with membership checks."""

import asyncio
from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException, status

from app.user_core.repositories import AvailabilityRepository, GroupRepository


class AvailabilityService:
    """Business logic for storing availabilities per user per group."""

    _rebuild_running: set[UUID] = set()
    _rebuild_dirty: set[UUID] = set()

    def __init__(self, availability_repo: AvailabilityRepository, group_repo: GroupRepository):
        self.availability_repo = availability_repo
        self.group_repo = group_repo

    @staticmethod
    def _compute_summary_intervals(records: list, total_members: int) -> list[dict]:
        if not records:
            return []

        by_user: dict[str, list[tuple[date, date]]] = {}
        for record in records:
            by_user.setdefault(record.actor_id, []).append((record.start_date, record.end_date))

        def merge_ranges(ranges: list[tuple[date, date]]) -> list[tuple[int, int]]:
            merged: list[tuple[int, int]] = []
            for start, end in sorted(((s.toordinal(), e.toordinal()) for s, e in ranges)):
                if not merged:
                    merged.append((start, end))
                    continue
                last_start, last_end = merged[-1]
                if start <= last_end + 1:
                    merged[-1] = (last_start, max(last_end, end))
                else:
                    merged.append((start, end))
            return merged

        events: list[tuple[int, int]] = []
        for user_ranges in by_user.values():
            for start_ord, end_ord in merge_ranges(user_ranges):
                events.append((start_ord, 1))
                events.append((end_ord + 1, -1))

        events.sort()

        active = 0
        current_start: int | None = None
        intervals: list[dict] = []

        for day_ord, delta in events:
            if current_start is not None and day_ord > current_start and active > 0:
                count = min(active, total_members)
                intervals.append(
                    {
                        "from": date.fromordinal(current_start),
                        "to": date.fromordinal(day_ord - 1),
                        "availableCount": count,
                        "totalMembers": total_members,
                    }
                )

            active += delta
            current_start = day_ord

        merged: list[dict] = []
        for interval in intervals:
            if merged:
                prev = merged[-1]
                if (
                    prev["availableCount"] == interval["availableCount"]
                    and prev["to"] == interval["from"] - timedelta(days=1)
                ):
                    prev["to"] = interval["to"]
                    continue
            merged.append(interval)

        return merged

    async def rebuild_group_summary_cache(self, *, group_id: UUID) -> None:
        members = await self.group_repo.get_group_members(group_id)
        total_members = len(members)
        records = await self.availability_repo.list_for_group(group_id=group_id)
        intervals = self._compute_summary_intervals(records, total_members)
        await self.availability_repo.replace_group_summary(group_id=group_id, intervals=intervals)
        await self.availability_repo.commit()

    @staticmethod
    def _schedule_group_summary_rebuild(group_id: UUID) -> None:
        from app.core.database import async_session
        from app.user_core.repositories import SQLModelAvailabilityRepository, SQLModelGroupRepository

        if group_id in AvailabilityService._rebuild_running:
            AvailabilityService._rebuild_dirty.add(group_id)
            return

        AvailabilityService._rebuild_running.add(group_id)

        async def _runner() -> None:
            try:
                while True:
                    AvailabilityService._rebuild_dirty.discard(group_id)
                    async with async_session() as session:
                        service = AvailabilityService(
                            availability_repo=SQLModelAvailabilityRepository(session),
                            group_repo=SQLModelGroupRepository(session),
                        )
                        await service.rebuild_group_summary_cache(group_id=group_id)

                    if group_id not in AvailabilityService._rebuild_dirty:
                        break
            finally:
                AvailabilityService._rebuild_running.discard(group_id)
                AvailabilityService._rebuild_dirty.discard(group_id)

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return

        loop.create_task(_runner())

    @staticmethod
    def schedule_all_group_summary_backfill() -> None:
        from app.core.database import async_session
        from app.user_core.repositories import SQLModelAvailabilityRepository, SQLModelGroupRepository

        async def _runner() -> None:
            async with async_session() as session:
                group_repo = SQLModelGroupRepository(session)
                availability_repo = SQLModelAvailabilityRepository(session)
                service = AvailabilityService(
                    availability_repo=availability_repo,
                    group_repo=group_repo,
                )
                groups = await group_repo.get_groups()
                for group in groups:
                    await service.rebuild_group_summary_cache(group_id=group.id)

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return

        loop.create_task(_runner())

    async def add_availability(
        self,
        *,
        actor_id: str,
        user_id: UUID | None,
        group_id: UUID,
        start_date: date,
        end_date: date,
    ):
        if start_date > end_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="startDate must be before endDate")

        group = await self.group_repo.get_group(group_id)
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        members = await self.group_repo.get_group_members(group_id)
        matched_member = next(
            (
                m
                for m in members
                if m.actor_id == actor_id or (user_id and m.user_id and str(m.user_id) == str(user_id))
            ),
            None,
        )

        if not matched_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")

        actor_for_record = matched_member.actor_id

        record = await self.availability_repo.create_availability(
            group_id=group_id,
            actor_id=actor_for_record,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
        )
        await self.availability_repo.commit()
        await self.group_repo.record_group_interaction(group_id=group_id)

        # In-memory repo is used in tests; refresh synchronously for deterministic assertions.
        if self.availability_repo.__class__.__name__.startswith("InMemory"):
            await self.rebuild_group_summary_cache(group_id=group_id)
        else:
            self._schedule_group_summary_rebuild(group_id)

        return record

    async def list_for_user(self, *, actor_id: str, group_id: UUID):
        members = await self.group_repo.get_group_members(group_id)
        matched_member = next(
            (m for m in members if m.actor_id == actor_id or (m.user_id and str(m.user_id) == actor_id)),
            None,
        )
        if not matched_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")
        return await self.availability_repo.list_for_actor_in_group(actor_id=matched_member.actor_id, group_id=group_id)

    async def list_group_member_availabilities(self, *, group_id: UUID, actor_id: str):
        """Return all members with their availabilities (may be empty per member)."""

        members = await self.group_repo.get_group_members(group_id)
        caller_member = next(
            (
                m
                for m in members
                if m.actor_id == actor_id or (m.user_id and str(m.user_id) == actor_id)
            ),
            None,
        )
        if not caller_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")

        own_avails = await self.availability_repo.list_for_actor_in_group(
            actor_id=caller_member.actor_id,
            group_id=group_id,
        )
        sorted_own_avails = sorted(own_avails, key=lambda a: a.start_date)

        results = []
        for member in members:
            results.append(
                {
                    "memberId": member.id,
                    "actorId": member.actor_id,
                    "userId": member.user_id,
                    "displayName": member.display_name,
                    "role": member.role,
                    "availabilities": sorted_own_avails if member.actor_id == caller_member.actor_id else [],
                }
            )

        return results

    async def calculate_group_availability(self, *, group_id: UUID, actor_id: str | None = None):
        """Compute overlapping availability intervals for a group (inclusive dates)."""

        members = await self.group_repo.get_group_members(group_id)
        if actor_id:
            is_member = any(m.actor_id == actor_id or (m.user_id and str(m.user_id) == actor_id) for m in members)
            if not is_member:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")

        records = await self.availability_repo.list_for_group(group_id=group_id)
        total_members = len(members)
        return self._compute_summary_intervals(records, total_members)

    async def get_cached_group_availability(self, *, group_id: UUID, actor_id: str) -> list[dict]:
        members = await self.group_repo.get_group_members(group_id)
        is_member = any(m.actor_id == actor_id or (m.user_id and str(m.user_id) == actor_id) for m in members)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")

        rows = await self.availability_repo.list_group_summary(group_id=group_id)
        return [
            {
                "from": row.from_date,
                "to": row.to_date,
                "availableCount": row.available_count,
                "totalMembers": row.total_members,
            }
            for row in rows
        ]

    async def get_group_availability_stats(
        self, *, group_id: UUID, actor_id: str, user_id: UUID | None = None
    ) -> dict:
        group = await self.group_repo.get_group(group_id)
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        members = await self.group_repo.get_group_members(group_id)
        is_member = any(
            m.actor_id == actor_id or (user_id and m.user_id and str(m.user_id) == str(user_id))
            for m in members
        )
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")

        total_users, submitted_users = await self.availability_repo.get_group_submission_stats(
            group_id=group_id,
            members=members,
        )
        progress = float(submitted_users) / total_users if total_users else 0.0

        return {
            "totalUsers": total_users,
            "usersWithAvailability": submitted_users,
            "progress": progress,
        }

    async def delete_availability(self, *, availability_id: UUID, actor_id: str, user_id: UUID | None = None) -> None:
        record = await self.availability_repo.get_by_id(availability_id)
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability not found")
        if record.actor_id != actor_id and not (user_id and record.user_id and str(record.user_id) == str(user_id)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

        target_actor = actor_id if record.actor_id == actor_id else record.actor_id
        deleted = await self.availability_repo.delete_for_actor(
            availability_id=availability_id, actor_id=target_actor
        )
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability not found")
        await self.availability_repo.commit()

        if self.availability_repo.__class__.__name__.startswith("InMemory"):
            await self.rebuild_group_summary_cache(group_id=record.group_id)
        else:
            self._schedule_group_summary_rebuild(record.group_id)
