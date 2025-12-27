"""Security utilities for Supabase JWT handling."""

from typing import Optional

import logging
import time
from typing import Optional

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel

from .config import get_settings


class Identity(BaseModel):
    """Authenticated identity extracted from a Supabase JWT."""

    user_id: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    access_token: Optional[str] = None


logger = logging.getLogger(__name__)

_jwks_cache: dict[str, object] = {"keys": None, "fetched_at": 0.0}


def _fetch_jwks(url: str, api_key: str):
    resp = httpx.get(url, timeout=5.0, headers={"apikey": api_key})
    resp.raise_for_status()
    data = resp.json()
    return data.get("keys") or []


def _get_supabase_jwks(settings):
    now = time.time()
    cached = _jwks_cache.get("keys")
    if cached and now - _jwks_cache.get("fetched_at", 0) < 300:
        return cached

    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Supabase URL not configured")

    api_key = (
        settings.supabase_public_key
        or settings.supabase_anon_key
        or settings.supabase_service_key
    )

    if not api_key:
        raise HTTPException(status_code=500, detail="Supabase public key not configured for JWKS fetch")

    base = settings.supabase_url.rstrip("/")
    endpoints = ["/auth/v1/keys", "/auth/v1/.well-known/jwks.json"]
    try:
        last_exc = None
        for endpoint in endpoints:
            url = base + endpoint
            try:
                keys = _fetch_jwks(url, api_key)
                _jwks_cache["keys"] = keys
                _jwks_cache["fetched_at"] = now
                return keys
            except Exception as exc:
                last_exc = exc
                logger.warning("Supabase JWKS fetch failed at %s: %s", url, exc)
                continue
        raise last_exc  # type: ignore[misc]
    except Exception as exc:  # pragma: no cover - network failures
        logger.warning("Supabase JWKS fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail="Supabase JWKS fetch failed") from exc


def decode_supabase_token(token: str) -> dict:
    settings = get_settings()
    # Supabase access tokens are HS256-signed using the JWT secret (matches anon/public key in hosted projects).
    candidate_secrets = [
        settings.supabase_jwt_secret,
        settings.supabase_public_key,
        settings.supabase_anon_key,
        settings.supabase_service_key,
    ]
    secrets = [s for s in candidate_secrets if s]

    if not secrets:
        raise HTTPException(status_code=500, detail="Supabase JWT secret not configured")

    last_error: Exception | None = None
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
    except Exception as exc:  # pragma: no cover - invalid header
        logger.warning("Supabase JWT header parse failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token") from exc

    if alg == "HS256":
        last_error: str | None = None
        for secret in secrets:
            try:
                return jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
            except JWTError as exc:  # try next
                last_error = str(exc)
                continue

        logger.warning("Supabase JWT decode failed: %s", last_error or "unknown error")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token")

    if alg in {"RS256", "ES256"}:
        keys = _get_supabase_jwks(settings)
        kid = header.get("kid")
        key = next((k for k in keys if k.get("kid") == kid), None)
        if not key:
            logger.warning("Supabase JWT key not found for kid=%s", kid)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token")

        try:
            return jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
        except JWTError as exc:
            logger.warning("Supabase JWT decode failed (%s): %s", alg, exc)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token") from exc

    logger.warning("Supabase JWT alg unsupported: %s", alg)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token algorithm")


async def get_identity(authorization: str | None = Header(default=None)) -> Identity:
    """Extract identity from Bearer token if provided."""

    if not authorization:
        return Identity()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    payload = decode_supabase_token(token)
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
