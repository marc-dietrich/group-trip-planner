"""Group model."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Group(SQLModel, table=True):
    """Core group entity created by a local actor."""

    __tablename__ = "groups"

    id: UUID = Field(default_factory=uuid4, primary_key=True, description="Primary identifier")
    name: str = Field(max_length=100, description="Name der Gruppe")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Erstellungsdatum")
    created_by_actor: str = Field(max_length=255, description="Opaque actor id of creator")