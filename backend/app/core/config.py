"""
Configuration und Environment Settings
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = "postgresql+asyncpg://trip_planner:trip_password@localhost/group_trip_planner_db"
    
    # Application
    app_name: str = "Gruppen-Urlaubsplaner API"
    app_version: str = "0.1.0"
    debug: bool = True
    
    # CORS
    cors_origins: list = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()