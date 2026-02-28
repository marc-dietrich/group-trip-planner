"""Image metadata model for object storage references."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class ImageAsset(SQLModel, table=True):
    """Stores image metadata while image bytes live in object storage."""

    __tablename__ = "image_assets"

    id: UUID = Field(default_factory=uuid4, primary_key=True, description="Primary identifier")
    owner_type: str = Field(max_length=30, index=True, description="user_profile or group_image")
    owner_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id", index=True)
    owner_group_id: Optional[UUID] = Field(default=None, foreign_key="groups.id", index=True)
    s3_bucket: str = Field(max_length=255, description="S3 bucket name")
    s3_key: str = Field(max_length=1024, unique=True, index=True, description="Object key")
    mime_type: str = Field(max_length=100, description="Stored MIME type")
    size_bytes: int = Field(description="Stored file size in bytes")
    width: int = Field(description="Image width")
    height: int = Field(description="Image height")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Upload timestamp")
