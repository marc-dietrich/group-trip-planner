"""Authentication endpoints for linking local actors to authenticated users."""

from datetime import datetime, timedelta
from uuid import NAMESPACE_URL, UUID, uuid5

import httpx

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from jose import jwt

from app.api.deps import get_auth_service
from app.core.config import get_settings
from app.core.security import Identity, require_authenticated_identity
from app.user_core.services import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


class ClaimRequest(BaseModel):
    actorId: str


class ClaimResponse(BaseModel):
    actorId: str
    userId: str
    claimedAt: datetime
    updatedMemberships: int
    claimToken: str


class SessionResponse(BaseModel):
    userId: str
    email: str | None
    displayName: str | None
    accessToken: str


def _issue_user_token(
    *,
    user_id: str,
    email: str | None,
    display_name: str | None,
    actor_id: str | None = None,
    scope: str,
) -> str:
    secret = settings.jwt_secret
    if not secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="JWT secret not configured")

    user_metadata: dict[str, str] = {}
    if display_name:
        user_metadata["full_name"] = display_name

    payload = {
        "sub": user_id,
        "email": email,
        "user_metadata": user_metadata,
        "scope": scope,
        "exp": datetime.utcnow() + timedelta(days=30),
    }

    if actor_id:
        payload["actor_id"] = actor_id

    return jwt.encode(payload, secret, algorithm="HS256")


async def _fetch_oauth_proxy_profile(request: Request) -> tuple[str | None, str | None, str | None]:
    cookie_header = request.headers.get("cookie")
    if not cookie_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    headers = {
        "Cookie": cookie_header,
    }

    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if forwarded_proto:
        headers["X-Forwarded-Proto"] = forwarded_proto
    if forwarded_host:
        headers["X-Forwarded-Host"] = forwarded_host

    try:
        async with httpx.AsyncClient(
            timeout=settings.oauth_proxy_timeout_seconds,
            follow_redirects=False,
        ) as client:
            auth_response = await client.get(settings.oauth_proxy_auth_url, headers=headers)
            if auth_response.status_code not in (200, 202):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

            userinfo_response = await client.get(settings.oauth_proxy_userinfo_url, headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="OAuth proxy unavailable") from exc

    if userinfo_response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = userinfo_response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid OAuth profile response") from exc

    email_raw = payload.get("email")
    preferred_raw = payload.get("preferred_username")
    name_raw = payload.get("name")
    subject_raw = payload.get("sub") or payload.get("id")

    email = email_raw.strip() if isinstance(email_raw, str) and email_raw.strip() else None
    preferred_username = (
        preferred_raw.strip()
        if isinstance(preferred_raw, str) and preferred_raw.strip()
        else None
    )
    name = name_raw.strip() if isinstance(name_raw, str) and name_raw.strip() else None
    subject = subject_raw.strip() if isinstance(subject_raw, str) and subject_raw.strip() else None

    display_name = name or preferred_username or email
    return subject, email, display_name


def _derive_user_id(*, email: str | None, subject: str | None) -> str:
    user_key = (email or subject or "").strip().lower()
    if not user_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return str(uuid5(NAMESPACE_URL, f"gtp-user:{user_key}"))


@router.get("/session", response_model=SessionResponse)
async def get_session(request: Request):
    subject, email, display_name = await _fetch_oauth_proxy_profile(request)
    user_id = _derive_user_id(email=email, subject=subject)
    access_token = _issue_user_token(
        user_id=user_id,
        email=email,
        display_name=display_name,
        scope="session",
    )

    return SessionResponse(
        userId=user_id,
        email=email,
        displayName=display_name,
        accessToken=access_token,
    )


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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    result = await service.claim_actor(
        actor_id=payload.actorId,
        user_id=user_uuid,
        display_name=identity.display_name,
        email=identity.email,
    )

    token = _issue_user_token(
        user_id=str(user_uuid),
        email=identity.email,
        display_name=identity.display_name,
        actor_id=payload.actorId,
        scope="claim",
    )
    return {**result, "claimToken": token}
