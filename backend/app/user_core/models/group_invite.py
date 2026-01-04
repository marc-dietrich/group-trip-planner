"""Group invite token model."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class GroupInvite(SQLModel, table=True):
    """Invite token tied to a group."""

    __tablename__ = "group_invites"

    id: UUID = Field(default_factory=uuid4, primary_key=True, description="Primary identifier")
    group_id: UUID = Field(foreign_key="groups.id", description="Group id for the invite")
    token: str = Field(max_length=255, unique=True, index=True, description="Opaque invite token")
    expires_at: datetime = Field(description="Invite expiration timestamp")
    used_count: int = Field(default=0, description="Successful accept counter")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
