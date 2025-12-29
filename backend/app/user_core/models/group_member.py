"""Group member model (user core domain)."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class GroupMember(SQLModel, table=True):
    """Membership of an actor in a group."""

    __tablename__ = "group_members"

    id: UUID = Field(default_factory=uuid4, primary_key=True, description="Primary identifier")
    group_id: UUID = Field(foreign_key="groups.id", description="Group id")
    actor_id: str = Field(max_length=255, description="Opaque actor id")
    user_id: Optional[UUID] = Field(default=None, foreign_key="users.id", description="Supabase user id when claimed")
    display_name: str = Field(max_length=100, description="Local display name")
    role: str = Field(max_length=50, description="Role within the group")
    joined_at: datetime = Field(default_factory=datetime.utcnow, description="Join timestamp")
