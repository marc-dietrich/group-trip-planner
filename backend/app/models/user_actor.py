"""Mapping between local actors and authenticated users."""

from datetime import datetime
from uuid import UUID

from sqlmodel import Field, SQLModel


class UserActor(SQLModel, table=True):
    """Tracks which Supabase user claimed a local actor."""

    __tablename__ = "user_actors"

    actor_id: str = Field(primary_key=True, max_length=255, description="Local actor id")
    user_id: UUID = Field(foreign_key="users.id", description="Supabase user id")
    claimed_at: datetime = Field(default_factory=datetime.utcnow, description="Claim timestamp")
