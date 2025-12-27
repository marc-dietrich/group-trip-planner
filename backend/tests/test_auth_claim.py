"""Tests for the Supabase claim endpoint."""

import asyncio
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.database import get_session as original_get_session
from app.main import app


settings = get_settings()


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


test_engine = create_async_engine(settings.database_url, echo=settings.debug, poolclass=NullPool)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_session():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="module", autouse=True)
async def override_dependencies():
    app.dependency_overrides[original_get_session] = override_get_session
    yield
    app.dependency_overrides.clear()
    await test_engine.dispose()


def _make_token(user_id: str) -> str:
    claims = {
        "sub": user_id,
        "email": "tester@example.com",
        "user_metadata": {"full_name": "Tester"},
    }
    return jwt.encode(claims, settings.supabase_jwt_secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_claim_links_actor_to_user():
    if not settings.supabase_jwt_secret:
        pytest.skip("Supabase JWT secret not configured; cannot test claim")

    actor_id = f"actor-{uuid4()}"
    user_id = str(uuid4())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a group as anonymous actor
        create_res = await client.post(
            "/api/groups",
            json={"groupName": "Claim Test", "actorId": actor_id, "displayName": "Anon"},
        )
        assert create_res.status_code == 200

        token = _make_token(user_id)

        # Claim the actor with Supabase JWT
        claim_res = await client.post(
            "/api/auth/claim",
            headers={"Authorization": f"Bearer {token}"},
            json={"actorId": actor_id},
        )
        assert claim_res.status_code == 200
        body = claim_res.json()
        assert body["userId"] == user_id
        assert body["actorId"] == actor_id
        assert body["updatedMemberships"] >= 1

        # Listing groups with the JWT should now work and include the claimed membership
        list_res = await client.get(
            "/api/groups",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_res.status_code == 200
        groups = list_res.json()
        assert any(g["name"] == "Claim Test" for g in groups)
