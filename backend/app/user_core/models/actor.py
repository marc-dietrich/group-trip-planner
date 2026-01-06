"""Guest/local actor model."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class Actor(SQLModel, table=True):
    """Represents a local/guest actor performing actions before registration."""

    __tablename__ = "actors"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, max_length=255, description="Opaque actor id")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
