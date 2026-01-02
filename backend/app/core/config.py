"""Configuration und Environment Settings."""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql+asyncpg://trip_planner:trip_password@localhost/group_trip_planner_db"
    database_ssl_require: bool = False

    # Application
    app_name: str = "Gruppen-Urlaubsplaner API"
    app_version: str = "0.1.0"
    debug: bool = True

    # Frontend
    frontend_base_url: str = "http://localhost:3000"

    # CORS
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://marc-dietrich.github.io",
    ]

    # Supabase
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_public_key: str | None = None
    supabase_service_key: str | None = None
    supabase_jwt_secret: str = ""

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()