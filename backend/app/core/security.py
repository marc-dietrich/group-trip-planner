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


def decode_token(token: str) -> dict | None:
    """Decode an HS256 JWT using the configured secret.

    Returns None for invalid or expired tokens so that guest endpoints can
    treat the caller as anonymous instead of rejecting the request.
    """
    settings = get_settings()
    secret = settings.jwt_secret
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret not configured")

    try:
        return jwt.decode(token, secret, algorithms=[settings.jwt_algorithm], options={"verify_aud": False})
    except JWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        return None


async def get_identity(authorization: str | None = Header(default=None)) -> Identity:
    """Extract identity from Bearer token if provided."""

    if not authorization:
        return Identity()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return Identity()

    payload = decode_token(token)
    if not payload:
        # Invalid or expired token: fall back to anonymous so guest endpoints
        # (e.g. joining via invite link) keep working for everyone.
        return Identity()
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
