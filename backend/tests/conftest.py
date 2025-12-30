"""Global test configuration for consistent settings."""

import os

import pytest
from _pytest.monkeypatch import MonkeyPatch

from app.core import config as app_config


def pytest_configure(config):
    # Ensure the test secret is in place before modules are imported during collection
    os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")
    app_config.get_settings.cache_clear()


@pytest.fixture(scope="session", autouse=True)
def ensure_test_supabase_secret():
    """Force a stable JWT secret so auth-related tests encode/decode consistently."""
    mp = MonkeyPatch()
    mp.setenv("SUPABASE_JWT_SECRET", "test-secret")
    app_config.get_settings.cache_clear()
    try:
        yield
    finally:
        mp.undo()
        app_config.get_settings.cache_clear()
