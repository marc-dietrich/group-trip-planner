"""Supabase user model (user core domain)."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """Represents an authenticated Supabase user."""

    __tablename__ = "users"

    id: UUID = Field(primary_key=True, description="Supabase user id")
    display_name: Optional[str] = Field(default=None, max_length=150, description="Display name from profile")
    email: Optional[str] = Field(default=None, max_length=255, description="User email if shared")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
