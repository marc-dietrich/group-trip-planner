"""System test fixtures using a real PostgreSQL test container."""

from __future__ import annotations

import importlib
import os
from pathlib import Path
from typing import AsyncIterator, Iterator, Callable
from uuid import uuid4

import pytest
import pytest_asyncio
from _pytest.monkeypatch import MonkeyPatch
from httpx import AsyncClient, ASGITransport
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from testcontainers.postgres import PostgresContainer

MIGRATIONS_PATH = Path(__file__).resolve().parents[2] / "migrations"


def _split_sql_statements(sql: str) -> list[str]:
    """Split SQL while respecting $, single, and double-quoted blocks."""

    statements: list[str] = []
    buf: list[str] = []
    in_single = False
    in_double = False
    dollar_tag: str | None = None
    i = 0

    while i < len(sql):
        ch = sql[i]

        if dollar_tag:
            if sql.startswith(dollar_tag, i):
                buf.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
                continue
            buf.append(ch)
            i += 1
            continue

        if ch == "'" and not in_double:
            in_single = not in_single
            buf.append(ch)
            i += 1
            continue

        if ch == '"' and not in_single:
            in_double = not in_double
            buf.append(ch)
            i += 1
            continue

        if ch == '$' and not in_single and not in_double:
            j = i + 1
            while j < len(sql) and (sql[j].isalnum() or sql[j] == '_'):
                j += 1
            if j < len(sql) and sql[j] == '$':
                tag = sql[i : j + 1]
                dollar_tag = tag
                buf.append(tag)
                i = j + 1
                continue

        if ch == ';' and not in_single and not in_double and not dollar_tag:
            statement = "".join(buf).strip()
            if statement:
                statements.append(statement)
            buf.clear()
            i += 1
            continue

        buf.append(ch)
        i += 1

    trailing = "".join(buf).strip()
    if trailing:
        statements.append(trailing)
    return statements


def _to_asyncpg_url(sync_url: str) -> str:
    return sync_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://").replace(
        "postgresql://", "postgresql+asyncpg://"
    )


def _reload_app():
    import app.api.deps as deps
    import app.core.config as config
    import app.core.database as database
    import app.main as app_main

    config.get_settings.cache_clear()
    for module in (config, database, deps, app_main):
        importlib.reload(module)

    # Rebuild the async engine with SSL disabled to match the local testcontainer
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.orm import sessionmaker
    from app.core.config import get_settings
    settings = get_settings()
    database.engine = create_async_engine(settings.database_url, echo=settings.debug, connect_args={"ssl": False})
    database.async_session = sessionmaker(database.engine, class_=database.AsyncSession, expire_on_commit=False)
    return app_main.app


@pytest.fixture(scope="session")
def postgres_container() -> Iterator[PostgresContainer]:
    """
    Start a PostgreSQL test container once for the entire test session.

    We fail fast with a clear error instead of skipping so that missing Docker
    or broken local setup is visible in CI/local runs.
    """

    container: PostgresContainer | None = None
    try:
        container = PostgresContainer(
            image="postgres:16-alpine",
            dbname="gtp_test",
            user="gtp",
            password="gtp",
        )
        container.start()
    except Exception as exc:  # pragma: no cover - environment-dependent
        pytest.fail(
            "Postgres test container could not start. Ensure Docker is running and accessible. "
            f"Original error: {exc}"
        )

    try:
        yield container
    finally:
        if container:
            container.stop()


@pytest_asyncio.fixture(scope="session")
async def database_url(postgres_container: PostgresContainer) -> AsyncIterator[str]:
    async_url = _to_asyncpg_url(postgres_container.get_connection_url())
    engine: AsyncEngine = create_async_engine(async_url, future=True, connect_args={"ssl": False})

    async with engine.begin() as conn:
        for path in sorted(MIGRATIONS_PATH.glob("*.sql")):
            sql = path.read_text(encoding="utf-8")
            for stmt in _split_sql_statements(sql):
                await conn.exec_driver_sql(stmt + ";")

    yield async_url

    await engine.dispose()


@pytest.fixture()
def app(database_url: str):
    mp = MonkeyPatch()
    mp.setenv("DATABASE_URL", database_url)
    mp.setenv("SUPABASE_JWT_SECRET", os.environ.get("SUPABASE_JWT_SECRET", "test-secret"))
    mp.setenv("PGSSLMODE", "disable")
    try:
        yield _reload_app()
    finally:
        mp.undo()


@pytest_asyncio.fixture()
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture()
def token_factory() -> Callable[[str], str]:
    secret = os.environ["SUPABASE_JWT_SECRET"]

    def _make(user_id: str) -> str:
        claims = {
            "sub": user_id,
            "email": "system@test.local",
            "user_metadata": {"full_name": "System Tester"},
        }
        return jwt.encode(claims, secret, algorithm="HS256")

    return _make


@pytest.fixture()
def user_identity(token_factory):
    user_id = str(uuid4())
    token = token_factory(user_id)
    return {"user_id": user_id, "token": token, "headers": {"Authorization": f"Bearer {token}"}}
