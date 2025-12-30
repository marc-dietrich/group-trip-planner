"""Availability model (per user, per group)."""

from datetime import datetime, date
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Availability(SQLModel, table=True):
    """Availability window supplied by an authenticated user for a group."""

    __tablename__ = "availabilities"

    id: UUID = Field(default_factory=uuid4, primary_key=True, description="Primary identifier")
    group_id: UUID = Field(foreign_key="groups.id", description="Group id")
    user_id: UUID = Field(foreign_key="users.id", description="Supabase user id")
    start_date: date = Field(description="Start date of availability (inclusive)")
    end_date: date = Field(description="End date of availability (inclusive)")
    kind: str = Field(max_length=20, description="Type of range, e.g. available/unavailable")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
