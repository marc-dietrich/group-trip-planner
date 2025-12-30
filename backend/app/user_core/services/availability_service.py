"""Availability service with membership checks."""

from datetime import date
from uuid import UUID

from fastapi import HTTPException, status

from app.user_core.repositories import AvailabilityRepository, GroupRepository


class AvailabilityService:
    """Business logic for storing availabilities per user per group."""

    def __init__(self, availability_repo: AvailabilityRepository, group_repo: GroupRepository):
        self.availability_repo = availability_repo
        self.group_repo = group_repo

    async def add_availability(
        self,
        *,
        user_id: UUID,
        group_id: UUID,
        start_date: date,
        end_date: date,
        kind: str,
    ):
        if start_date > end_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="startDate must be before endDate")

        group = await self.group_repo.get_group(group_id)
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        members = await self.group_repo.get_group_members(group_id)
        is_member = any(m.user_id and str(m.user_id) == str(user_id) for m in members)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")

        record = await self.availability_repo.create_availability(
            group_id=group_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            kind=kind,
        )
        await self.availability_repo.commit()
        return record

    async def list_for_user(self, *, user_id: UUID, group_id: UUID):
        members = await self.group_repo.get_group_members(group_id)
        is_member = any(m.user_id and str(m.user_id) == str(user_id) for m in members)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")
        return await self.availability_repo.list_for_user_in_group(user_id=user_id, group_id=group_id)

    async def delete_availability(self, *, availability_id: UUID, user_id: UUID) -> None:
        record = await self.availability_repo.get_by_id(availability_id)
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability not found")
        if str(record.user_id) != str(user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

        deleted = await self.availability_repo.delete_for_user(availability_id=availability_id, user_id=user_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability not found")
        await self.availability_repo.commit()
