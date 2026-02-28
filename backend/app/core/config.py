"""Configuration und Environment Settings."""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=("../../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://trip_planner:trip_password@localhost/group_trip_planner_db"
    database_ssl_require: bool = False

    # Application
    app_name: str = "Gruppen-Urlaubsplaner API"
    app_version: str = "0.1.0"
    debug: bool = True

    # Invites
    invite_token_ttl_days: int = 7

    # Frontend
    frontend_base_url: str = "http://localhost:3000"
    frontend_path_prefix: str = ""

    # CORS
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4180",
        "https://marc-dietrich.github.io",
        "https://planning.made-simple.online",
    ]

    # JWT (used for Bearer token auth via OAuth2-Proxy or similar)
    jwt_secret: str = ""

    # Internal webhook secret used by stripe-service to grant supporter badges
    supporter_webhook_secret: str = "dev-supporter-secret"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()