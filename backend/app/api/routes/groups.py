"""Group management endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from urllib.parse import urlsplit, urlunsplit

from app.core.config import get_settings
from app.core.security import Identity, require_authenticated_identity
from app.user_core.services import GroupService, InviteExpiredError, InviteNotFoundError
from app.api.deps import get_group_service

settings = get_settings()

router = APIRouter(prefix="/api", tags=["groups"])


def _frontend_base_url(request: Request) -> str:
    """Resolve the frontend base using the caller's origin plus optional path prefix."""

    cfg = urlsplit(settings.frontend_base_url)
    base = urlunsplit((cfg.scheme, cfg.netloc, "", "", "")) if cfg.scheme and cfg.netloc else settings.frontend_base_url

    origins = [request.headers.get("origin"), request.headers.get("referer")]
    for raw in origins:
        if not raw:
            continue

        parsed = urlsplit(raw)
        if parsed.scheme and parsed.netloc:
            base = urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))
            break

    # Prefer explicit env setting, otherwise take path from configured frontend_base_url
    path_prefix = settings.frontend_path_prefix.strip() or cfg.path.strip()
    if path_prefix and path_prefix != "/":
        if not path_prefix.startswith("/"):
            path_prefix = "/" + path_prefix
        path_prefix = path_prefix.rstrip("/")
        base = f"{base.rstrip('/')}{path_prefix}"
    else:
        base = base.rstrip("/")

    return base


class GroupCreate(BaseModel):
    """Request body for creating a group."""

    groupName: str
    displayName: str | None = None


class GroupCreateResponse(BaseModel):
    """Minimal response returned after group creation."""

    groupId: UUID
    name: str
    inviteLink: str
    inviteExpiresAt: datetime
    role: str
    displayName: str


class GroupMembership(BaseModel):
    """Group list item for an actor."""

    groupId: UUID
    name: str
    role: str
    inviteLink: str
    inviteExpiresAt: datetime


class GroupPublic(BaseModel):
    """Public view of a group for invite previews."""

    groupId: UUID
    name: str
    inviteExpiresAt: datetime

    @classmethod
    def from_invite(cls, group, invite):
        return cls(groupId=group.id, name=group.name, inviteExpiresAt=invite.expires_at)


class JoinGroupResponse(BaseModel):
    """Response after accepting an invite link."""

    groupId: UUID
    name: str
    role: str
    inviteLink: str
    inviteExpiresAt: datetime
    alreadyMember: bool


@router.get("/groups")
async def get_groups(
    request: Request,
    identity: Identity = Depends(require_authenticated_identity),
    service: GroupService = Depends(get_group_service),
):
    """Return all groups for the authenticated user."""

    try:
        user_uuid = UUID(identity.user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    rows = await service.get_groups_for_identity(user_id=user_uuid)
    base_url = _frontend_base_url(request)
    memberships: list[dict] = []
    for group, member in rows:
        invite = await service.ensure_invite_for_group(group=group, ttl_days=settings.invite_token_ttl_days)
        memberships.append(
            {
                "groupId": group.id,
                "name": group.name,
                "role": member.role,
                "inviteLink": f"{base_url}/invite/{group.id}",
                "inviteExpiresAt": invite.expires_at,
            }
        )

    return memberships


@router.post("/groups", response_model=GroupCreateResponse)
async def create_group(
    request: Request,
    group_data: GroupCreate,
    identity: Identity = Depends(require_authenticated_identity),
    service: GroupService = Depends(get_group_service),
):
    """Create a group and store the creator as owner."""

    try:
        user_uuid = UUID(identity.user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    creator_display = group_data.displayName or identity.display_name or "Gast"
    actor_id = str(user_uuid)

    group, member = await service.create_group(
        group_name=group_data.groupName,
        actor_id=actor_id,
        display_name=creator_display,
        user_id=user_uuid,
        invite_ttl_days=settings.invite_token_ttl_days,
    )

    invite = await service.ensure_invite_for_group(group=group, ttl_days=settings.invite_token_ttl_days)

    invite_link = f"{_frontend_base_url(request)}/invite/{group.id}"

    return {
        "groupId": group.id,
        "name": group.name,
        "inviteLink": invite_link,
        "inviteExpiresAt": invite.expires_at,
        "role": member.role,
        "displayName": member.display_name,
    }


@router.get("/groups/{group_id}", response_model=GroupPublic)
async def get_group(group_id: UUID, service: GroupService = Depends(get_group_service)):
    """Fetch a single group by id."""
    try:
        group, invite = await service.get_invite_preview(
            token=str(group_id), ttl_days=settings.invite_token_ttl_days
        )
    except InviteExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(exc)) from exc
    except InviteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return GroupPublic.from_invite(group, invite)


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(group_id: UUID, service: GroupService = Depends(get_group_service)):
    """Delete a group; currently no role checks applied."""
    deleted = await service.delete_group(group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    return Response(status_code=204)


@router.post("/groups/{group_id}/join", response_model=JoinGroupResponse)
async def join_group(
    group_id: UUID,
    request: Request,
    identity: Identity = Depends(require_authenticated_identity),
    service: GroupService = Depends(get_group_service),
):
    """Allow an authenticated user to join a group via invite link."""

    try:
        user_uuid = UUID(identity.user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    display_name = identity.display_name or "Gast"

    try:
        group, member, created, invite = await service.join_group(
            group_id=group_id,
            user_id=user_uuid,
            display_name=display_name,
            invite_ttl_days=settings.invite_token_ttl_days,
        )
    except InviteExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(exc)) from exc
    except InviteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    invite_link = f"{_frontend_base_url(request)}/invite/{group.id}"

    return JoinGroupResponse(
        groupId=group.id,
        name=group.name,
        role=member.role,
        inviteLink=invite_link,
        inviteExpiresAt=invite.expires_at,
        alreadyMember=not created,
    )