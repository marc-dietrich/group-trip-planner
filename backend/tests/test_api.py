"""
Test für die API Endpoints
"""

import pytest
import asyncio
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    """Teste Health Check Endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data

@pytest.mark.asyncio
async def test_create_group():
    """Teste Gruppe erstellen"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        group_data = {"name": "Test Gruppe API", "description": "Test via API"}
        response = await client.post("/api/groups", json=group_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Gruppe API"
        assert "id" in data