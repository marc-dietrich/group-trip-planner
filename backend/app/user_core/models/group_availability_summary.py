"""Precomputed group availability summary intervals."""

from datetime import datetime, date
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class GroupAvailabilitySummary(SQLModel, table=True):
    """Cached summary interval for one group."""

    __tablename__ = "group_availability_summaries"

    id: UUID = Field(default_factory=uuid4, primary_key=True, description="Primary identifier")
    group_id: UUID = Field(foreign_key="groups.id", description="Group id")
    from_date: date = Field(description="Start date of interval (inclusive)")
    to_date: date = Field(description="End date of interval (inclusive)")
    available_count: int = Field(description="Members available in this interval")
    total_members: int = Field(description="Total members in group at recompute time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Cache update timestamp")
