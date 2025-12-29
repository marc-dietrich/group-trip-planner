"""Optional DB connectivity smoke test (skipped without DATABASE_URL)."""

import os

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()


def _database_url() -> str | None:
    # Only run when explicitly configured in the environment
    return os.getenv("DATABASE_URL") or None


@pytest.mark.asyncio
@pytest.mark.db_smoke
async def test_database_select_one():
    url = _database_url()
    if not url:
        pytest.skip("DATABASE_URL not set; skipping DB smoke test")

    engine = create_async_engine(url, poolclass=NullPool)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT 1"))
        assert result.scalar_one() == 1
    await engine.dispose()
