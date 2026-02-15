"""Security utilities for JWT handling."""

import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel

from .config import get_settings


class Identity(BaseModel):
    """Authenticated identity extracted from a JWT."""

    user_id: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    access_token: Optional[str] = None


logger = logging.getLogger(__name__)


def decode_token(token: str) -> dict:
    """Decode an HS256 JWT using the configured secret."""
    settings = get_settings()
    secret = settings.jwt_secret
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret not configured")

    try:
        return jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
    except JWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


async def get_identity(authorization: str | None = Header(default=None)) -> Identity:
    """Extract identity from Bearer token if provided."""

    if not authorization:
        return Identity()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    payload = decode_token(token)
    user_id = payload.get("sub")
    metadata = payload.get("user_metadata") or {}
    display_name = metadata.get("full_name") or metadata.get("name") or payload.get("email")

    return Identity(
        user_id=user_id,
        email=payload.get("email"),
        display_name=display_name,
        access_token=token,
    )


async def require_authenticated_identity(identity: Identity = Depends(get_identity)) -> Identity:
    if not identity.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return identity
