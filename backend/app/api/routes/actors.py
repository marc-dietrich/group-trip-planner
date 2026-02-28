"""Actor endpoints for guest bootstrap."""

from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.user_core.services import ActorService
from app.api.deps import get_actor_service

router = APIRouter(prefix="/api/actors", tags=["actors"])
settings = get_settings()


class CreateActorRequest(BaseModel):
    actorId: str | None = None
    displayName: str | None = None


class ActorResponse(BaseModel):
    actorId: str
    createdAt: datetime


class SupporterStatusResponse(BaseModel):
    actorId: str
    hasCrown: bool
    supporterUntil: datetime | None = None
    lastDonatedAt: datetime | None = None


class SupporterGrantRequest(BaseModel):
    donatedAt: datetime | None = None
    durationDays: int = 183


@router.post("", response_model=ActorResponse)
async def create_actor(payload: CreateActorRequest, service: ActorService = Depends(get_actor_service)):
    actor_id = (payload.actorId or "").strip()
    actor = await service.ensure_actor(actor_id or None)
    if not actor:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Actor creation failed")

    return ActorResponse(actorId=actor.id, createdAt=actor.created_at)


@router.get("/{actor_id}/supporter", response_model=SupporterStatusResponse)
async def get_supporter_status(
    actor_id: str,
    actor_header: str | None = Header(default=None, alias="X-Actor-Id"),
    service: ActorService = Depends(get_actor_service),
):
    resolved_actor = (actor_header or "").strip()
    if not resolved_actor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId header required")
    if resolved_actor != actor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="actorId mismatch")

    status_payload = await service.get_supporter_status(actor_id=actor_id)
    return SupporterStatusResponse(**status_payload)


@router.post("/{actor_id}/supporter/grant", response_model=SupporterStatusResponse)
async def grant_supporter_status(
    actor_id: str,
    payload: SupporterGrantRequest,
    webhook_secret: str | None = Header(default=None, alias="X-Supporter-Secret"),
    service: ActorService = Depends(get_actor_service),
):
    expected_secret = (settings.supporter_webhook_secret or "").strip()
    if not expected_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="supporter webhook secret not configured")
    if not webhook_secret or webhook_secret != expected_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid supporter webhook secret")

    duration_days = payload.durationDays if payload.durationDays > 0 else 183
    status_payload = await service.grant_supporter_badge(
        actor_id=actor_id,
        duration_days=duration_days,
        donated_at=payload.donatedAt,
    )
    return SupporterStatusResponse(**status_payload)
