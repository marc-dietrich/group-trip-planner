"""Actor endpoints for guest bootstrap."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.user_core.services import ActorService
from app.api.deps import get_actor_service

router = APIRouter(prefix="/api/actors", tags=["actors"])


class CreateActorRequest(BaseModel):
    actorId: str | None = None
    displayName: str | None = None


class ActorResponse(BaseModel):
    actorId: str
    createdAt: datetime


@router.post("", response_model=ActorResponse)
async def create_actor(payload: CreateActorRequest, service: ActorService = Depends(get_actor_service)):
    actor_id = (payload.actorId or "").strip()
    actor = await service.ensure_actor(actor_id or None)
    if not actor:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Actor creation failed")

    return ActorResponse(actorId=actor.id, createdAt=actor.created_at)
