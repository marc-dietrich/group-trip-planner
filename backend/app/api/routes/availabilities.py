"""Availability endpoints (authenticated users only for now)."""

from datetime import date, datetime
from uuid import UUID
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status, Header
from pydantic import BaseModel, Field, ConfigDict

from app.api.deps import get_availability_service
from app.core.security import Identity, get_identity
from app.user_core.services import AvailabilityService

router = APIRouter(prefix="/api", tags=["availability"])


def _parse_uuid(value: str | None) -> UUID | None:
    if not value:
        return None
    try:
        return UUID(value)
    except ValueError:
        return None


class AvailabilityCreate(BaseModel):
    startDate: date = Field(..., description="Startdatum (inklusive)")
    endDate: date = Field(..., description="Enddatum (inklusive)")
    kind: Literal["available"] | None = Field(
        default="available",
        description="MVP: immer 'available' (optional, ignoriert)",
    )

    model_config = ConfigDict(extra="forbid")



class AvailabilityResponse(BaseModel):
    id: UUID
    groupId: UUID
    actorId: str
    userId: UUID | None
    startDate: date
    endDate: date
    createdAt: datetime

    @classmethod
    def from_model(cls, record):
        return cls(
            id=record.id,
            groupId=record.group_id,
            actorId=record.actor_id,
            userId=record.user_id,
            startDate=record.start_date,
            endDate=record.end_date,
            createdAt=record.created_at,
        )


class AvailabilitySummaryItem(BaseModel):
    from_: date = Field(alias="from", description="Startdatum (inklusive)")
    to: date = Field(description="Enddatum (inklusive)")
    availableCount: int = Field(description="Anzahl der verfügbaren Mitglieder")
    totalMembers: int = Field(description="Gesamtanzahl der Gruppenmitglieder")

    model_config = ConfigDict(populate_by_name=True)


class MemberAvailabilities(BaseModel):
    memberId: UUID
    actorId: str
    userId: UUID | None
    displayName: str
    role: str
    availabilities: list[AvailabilityResponse]


@router.post("/groups/{group_id}/availabilities", response_model=AvailabilityResponse)
async def add_availability(
    group_id: UUID,
    payload: AvailabilityCreate,
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    identity: Identity = Depends(get_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    """Store an availability range for the authenticated user in a group."""

    user_uuid = _parse_uuid(identity.user_id)
    resolved_actor = (actor_id or identity.user_id or "").strip() or None
    if not resolved_actor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")

    record = await service.add_availability(
        actor_id=resolved_actor,
        user_id=user_uuid,
        group_id=group_id,
        start_date=payload.startDate,
        end_date=payload.endDate,
    )
    return AvailabilityResponse.from_model(record)


@router.get("/groups/{group_id}/availabilities", response_model=list[AvailabilityResponse])
async def list_my_availabilities(
    group_id: UUID,
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    identity: Identity = Depends(get_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    """List the caller's availabilities for a given group."""

    user_uuid = _parse_uuid(identity.user_id)
    resolved_actor = (actor_id or identity.user_id or "").strip() or None
    if not resolved_actor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")

    records = await service.list_for_user(actor_id=resolved_actor, group_id=group_id)
    return [AvailabilityResponse.from_model(r) for r in records]


@router.get("/groups/{group_id}/availability-summary", response_model=list[AvailabilitySummaryItem])
async def get_group_availability_summary(
    group_id: UUID,
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    identity: Identity = Depends(get_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    resolved_actor = (actor_id or identity.user_id or "").strip() or None
    if not resolved_actor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")

    items = await service.calculate_group_availability(group_id=group_id, actor_id=resolved_actor)
    # Convert dict items to Pydantic-compatible keys
    parsed = [
        AvailabilitySummaryItem(
            from_=item["from"],
            to=item["to"],
            availableCount=item["availableCount"],
            totalMembers=item["totalMembers"],
        )
        for item in items
    ]
    return parsed


@router.get("/groups/{group_id}/member-availabilities", response_model=list[MemberAvailabilities])
async def list_group_member_availabilities(
    group_id: UUID,
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    identity: Identity = Depends(get_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    resolved_actor = (actor_id or identity.user_id or "").strip() or None
    if not resolved_actor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")

    rows = await service.list_group_member_availabilities(group_id=group_id, actor_id=resolved_actor)
    return [
        MemberAvailabilities(
            memberId=row["memberId"],
            actorId=row["actorId"],
            userId=row["userId"],
            displayName=row["displayName"],
            role=row["role"],
            availabilities=[AvailabilityResponse.from_model(a) for a in row["availabilities"]],
        )
        for row in rows
    ]


@router.delete("/availabilities/{availability_id}", status_code=204)
async def delete_availability(
    availability_id: UUID,
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    identity: Identity = Depends(get_identity),
    service: AvailabilityService = Depends(get_availability_service),
):
    resolved_actor = (actor_id or identity.user_id or "").strip() or None
    if not resolved_actor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")

    user_uuid = _parse_uuid(identity.user_id)

    await service.delete_availability(
        availability_id=availability_id,
        actor_id=resolved_actor,
        user_id=user_uuid,
    )
    return Response(status_code=204)
