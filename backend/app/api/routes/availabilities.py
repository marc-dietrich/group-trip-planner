"""Availability endpoints (authenticated users only for now)."""

from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.api.deps import get_availability_service
from app.core.security import Identity, require_authenticated_identity
from app.user_core.services import AvailabilityService

router = APIRouter(prefix="/api", tags=["availability"])


class AvailabilityCreate(BaseModel):
    startDate: date = Field(..., description="Startdatum (inklusive)")
    endDate: date = Field(..., description="Enddatum (inklusive)")
    kind: str = Field(..., pattern="^(available|unavailable)$", description="Typ der Angabe")



class AvailabilityResponse(BaseModel):
    id: UUID
    groupId: UUID
    userId: UUID
    startDate: date
    endDate: date
    kind: str
    createdAt: datetime

    @classmethod
    def from_model(cls, record):
        return cls(
            id=record.id,
            groupId=record.group_id,
            userId=record.user_id,
            startDate=record.start_date,
            endDate=record.end_date,
            kind=record.kind,
            createdAt=record.created_at,
        )


@router.post("/groups/{group_id}/availabilities", response_model=AvailabilityResponse)
async def add_availability(
    group_id: UUID,
    payload: AvailabilityCreate,
    identity: Identity = Depends(require_authenticated_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    """Store an availability range for the authenticated user in a group."""

    try:
        user_uuid = UUID(identity.user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    record = await service.add_availability(
        user_id=user_uuid,
        group_id=group_id,
        start_date=payload.startDate,
        end_date=payload.endDate,
        kind=payload.kind,
    )
    return AvailabilityResponse.from_model(record)


@router.get("/groups/{group_id}/availabilities", response_model=list[AvailabilityResponse])
async def list_my_availabilities(
    group_id: UUID,
    identity: Identity = Depends(require_authenticated_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    """List the caller's availabilities for a given group."""

    try:
        user_uuid = UUID(identity.user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    records = await service.list_for_user(user_id=user_uuid, group_id=group_id)
    return [AvailabilityResponse.from_model(r) for r in records]


@router.delete("/availabilities/{availability_id}", status_code=204)
async def delete_availability(
    availability_id: UUID,
    identity: Identity = Depends(require_authenticated_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    try:
        user_uuid = UUID(identity.user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    await service.delete_availability(availability_id=availability_id, user_id=user_uuid)
    return Response(status_code=204)
