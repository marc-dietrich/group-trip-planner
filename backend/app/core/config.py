"""Configuration und Environment Settings."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        extra="ignore",
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "postgresql+asyncpg://gtp:gtp_pw@localhost:5433/gtp"
    database_ssl_require: bool = False

    # Application
    app_name: str = "Gruppen-Urlaubsplaner API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Invites
    invite_token_ttl_days: int = 7

    # Frontend
    frontend_base_url: str = "http://localhost:3000"
    frontend_path_prefix: str = ""

    # CORS — set via CORS_ORIGINS env var as a JSON array string
    # e.g. CORS_ORIGINS='["http://localhost:3000","http://localhost:5173"]'
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4180",
    ]

    # JWT (used for Bearer token auth via OAuth2-Proxy or similar)
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"

    # Internal webhook secret used by stripe-service to grant supporter badges
    supporter_webhook_secret: str = ""

    # Transport security
    enforce_https: bool = False

    # Voice mock feature flag
    voice_mock_enabled: bool = True

    # Object storage (Garage S3-compatible)
    storage_enabled: bool = True
    storage_s3_endpoint: str = "http://localhost:3900"
    storage_s3_region: str = "garage"
    storage_s3_access_key: str = ""
    storage_s3_secret_key: str = ""
    storage_s3_bucket: str = "group-trip-images"
    storage_s3_use_ssl: bool = False

    # Upload validation / processing
    image_upload_max_input_bytes: int = 5 * 1024 * 1024
    profile_image_target_bytes: int = 100 * 1024
    group_image_target_bytes: int = 200 * 1024

    # Image dimensions
    profile_image_width: int = 512
    profile_image_height: int = 512
    group_image_width: int = 1024
    group_image_height: int = 512

    # Presigned URL TTL
    presigned_url_ttl_seconds: int = 300

    # Supporter badge defaults
    supporter_badge_duration_days: int = 183

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()