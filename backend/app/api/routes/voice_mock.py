"""Mocked voice-to-availability endpoint for frontend testing."""

import os
from datetime import date
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

MOCK_ENABLED = os.getenv("VOICE_MOCK_ENABLED", "true").lower() == "true"

router = APIRouter(prefix="/api/voice", tags=["voice"])


class AvailabilityWindow(BaseModel):
    start: str
    end: str


class VoiceMockResponse(BaseModel):
    userId: str
    audioText: str
    availability: List[AvailabilityWindow]


@router.post("/transcribe", response_model=VoiceMockResponse)
async def mock_transcribe(userId: str = "mock-user") -> VoiceMockResponse:
    if not MOCK_ENABLED:
        raise HTTPException(status_code=503, detail="Voice mock disabled")

    today = date.today()
    start = date(today.year, 8, 15)
    end = date(today.year, 9, 9)

    return VoiceMockResponse(
        userId=userId,
        audioText="(mock) verfügbar vom 15. August bis 9. September",
        availability=[
            AvailabilityWindow(start=start.isoformat(), end=end.isoformat())
        ],
    )
