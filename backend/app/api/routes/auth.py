"""Authentication endpoints for linking local actors to Supabase users."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import Identity, require_authenticated_identity
from app.user_core.services import AuthService
from app.api.deps import get_auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class ClaimRequest(BaseModel):
    actorId: str


class ClaimResponse(BaseModel):
    actorId: str
    userId: str
    claimedAt: datetime
    updatedMemberships: int


@router.post("/claim", response_model=ClaimResponse)
async def claim_actor(
    payload: ClaimRequest,
    identity: Identity = Depends(require_authenticated_identity),
    service: AuthService = Depends(get_auth_service),
):
    if not payload.actorId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="actorId is required")

    try:
        user_uuid = UUID(identity.user_id)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Supabase user id") from exc

    result = await service.claim_actor(
        actor_id=payload.actorId,
        user_id=user_uuid,
        display_name=identity.display_name,
        email=identity.email,
    )
    return result
