"""Supporter badge model for temporary crown eligibility."""

from datetime import datetime

from sqlmodel import Field, SQLModel


class SupporterBadge(SQLModel, table=True):
    """Stores supporter entitlement windows for actors."""

    __tablename__ = "supporter_badges"

    actor_id: str = Field(
        primary_key=True,
        max_length=255,
        foreign_key="actors.id",
        description="Local actor id",
    )
    supporter_until: datetime = Field(
        description="Timestamp until which supporter crown remains active"
    )
    last_donated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Most recent successful donation timestamp",
    )
