"""Group management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.services import GroupService

settings = get_settings()

router = APIRouter(prefix="/api", tags=["groups"])


class GroupCreate(BaseModel):
    """Request body for creating a group."""

    groupName: str
    actorId: str
    displayName: str


class GroupCreateResponse(BaseModel):
    """Minimal response returned after group creation."""

    groupId: UUID
    name: str
    inviteLink: str
    role: str
    actorId: str
    displayName: str


class GroupMembership(BaseModel):
    """Group list item for an actor."""

    groupId: UUID
    name: str
    role: str
    inviteLink: str


@router.get("/groups")
async def get_groups(actorId: str | None = None, session: AsyncSession = Depends(get_session)):
    """Return all groups or only those for the given actor."""

    if actorId:
        rows = await GroupService.get_groups_for_actor(session, actorId)
        return [
            {
                "groupId": group.id,
                "name": group.name,
                "role": member.role,
                "inviteLink": f"{settings.frontend_base_url}/invite/{group.id}",
            }
            for group, member in rows
        ]

    return await GroupService.get_groups(session)


@router.post("/groups", response_model=GroupCreateResponse)
async def create_group(group_data: GroupCreate, session: AsyncSession = Depends(get_session)):
    """Create a group and store the creator as owner."""

    group, member = await GroupService.create_group(
        session=session,
        group_name=group_data.groupName,
        actor_id=group_data.actorId,
        display_name=group_data.displayName,
    )

    invite_link = f"{settings.frontend_base_url}/invite/{group.id}"

    return {
        "groupId": group.id,
        "name": group.name,
        "inviteLink": invite_link,
        "role": member.role,
        "actorId": member.actor_id,
        "displayName": member.display_name,
    }


@router.get("/groups/{group_id}")
async def get_group(group_id: UUID, session: AsyncSession = Depends(get_session)):
    """Fetch a single group by id."""
    group = await GroupService.get_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    return group


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(group_id: UUID, session: AsyncSession = Depends(get_session)):
    """Delete a group; currently no role checks applied."""
    deleted = await GroupService.delete_group(session, group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    return Response(status_code=204)