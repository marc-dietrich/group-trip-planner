#!/usr/bin/env python3
"""
Backend smoke tests (database + API) using shared event loop fixtures.
"""

import asyncio
import sys
import os

import pytest
from app.main import app
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import get_settings

# Add parent directory to path for app imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Dedicated engine/session for tests to avoid pool/loop conflicts
settings = get_settings()
test_engine = create_async_engine(settings.database_url, echo=settings.debug, poolclass=NullPool)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


# Reuse a single event loop in this module and dispose test engine afterward
@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.run_until_complete(test_engine.dispose())
    loop.close()


def test_dependencies():
    """Check required packages are importable."""
    print("🔍 Teste Dependencies...")

    missing_packages = []
    required_packages = [
        "fastapi",
        "uvicorn",
        "sqlmodel",
        "asyncpg",
        "python_dotenv",
        "pydantic",
        "alembic",
    ]

    for package in required_packages:
        try:
            __import__(package.replace("-", "_").replace("python_", ""))
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package}")
            missing_packages.append(package)

    assert not missing_packages, f"Missing packages: {', '.join(missing_packages)}"
    print("✅ Alle Dependencies verfügbar\n")


@pytest.mark.asyncio
async def test_database_connection():
    """Ensure we can query Postgres."""
    print("🐘 Teste Database Connection...")
    from sqlalchemy import text

    async with test_engine.begin() as conn:
        result = await conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"  ✅ PostgreSQL: {version[:50]}...")

        result = await conn.execute(
            text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        )
        table_count = result.fetchone()[0]
        print(f"  ✅ Tabellen gefunden: {table_count}")


@pytest.mark.asyncio
async def test_crud_operations():
    """Create a group and owner, then fetch members."""
    print("📊 Teste CRUD Operations...")
    from app.services import GroupService

    async with TestSessionLocal() as session:
        group, member = await GroupService.create_group(
            session=session,
            group_name="Test Gruppe Backend",
            actor_id="backend-actor-123",
            display_name="Backend Tester",
        )
        print(f"  ✅ Gruppe erstellt: {group.name} (ID: {group.id})")
        print(f"  ✅ Owner hinzugefügt: {member.display_name} ({member.actor_id})")

        groups = await GroupService.get_groups(session)
        print(f"  ✅ Gruppen gefunden: {len(groups)}")

        members = await GroupService.get_group_members(session, group.id)
        print(f"  ✅ Mitglieder abgerufen: {len(members)}")

        # No explicit close needed; context manager handles it


@pytest.mark.asyncio
async def test_api_health():
    """Call health endpoint via ASGI transport (no server needed)."""
    print("🌐 Teste API Health...")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        print(f"  ✅ API Health: {data.get('status')}")
        print(f"  📝 Message: {data.get('message')}")


# Legacy runner support when executing this file directly
async def run_all_tests():
    print("🚀 Backend Test Suite")
    print("=" * 50)

    results = {}
    results["dependencies"] = test_dependencies()

    try:
        await test_database_connection()
        results["database"] = True
    except AssertionError:
        results["database"] = False

    if results["database"]:
        try:
            await test_crud_operations()
            results["crud"] = True
        except AssertionError:
            results["crud"] = False
    else:
        results["crud"] = False

    try:
        await test_api_health()
        results["api"] = True
    except AssertionError:
        results["api"] = False

    print("\n" + "=" * 50)
    print("📊 Test Zusammenfassung:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name.ljust(15)}: {status}")

    all_passed = all(results.values())
    return all_passed


if __name__ == "__main__":
    if not os.path.exists("main.py"):
        print("❌ Führe dieses Script aus dem /backend Verzeichnis aus")
        sys.exit(1)

    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)