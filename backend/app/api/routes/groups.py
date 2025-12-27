"""
Group management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
from datetime import date

from app.core.database import get_session
from app.models import Group, Participant, Availability
from app.services import GroupService

router = APIRouter(prefix="/api", tags=["groups"])

# Pydantic models for requests
class GroupCreate(BaseModel):
    name: str
    description: str = ""

class ParticipantCreate(BaseModel):
    name: str
    email: str = ""

class AvailabilityCreate(BaseModel):
    start_date: str  # YYYY-MM-DD format
    end_date: str    # YYYY-MM-DD format

# Group endpoints
@router.get("/groups", response_model=List[Group])
async def get_groups(session: AsyncSession = Depends(get_session)):
    """Alle Gruppen abrufen"""
    return await GroupService.get_groups(session)

@router.post("/groups", response_model=Group)
async def create_group(group_data: GroupCreate, session: AsyncSession = Depends(get_session)):
    """Neue Gruppe erstellen"""
    return await GroupService.create_group(session, group_data.name, group_data.description)

@router.get("/groups/{group_id}", response_model=Group)
async def get_group(group_id: int, session: AsyncSession = Depends(get_session)):
    """Einzelne Gruppe abrufen"""
    group = await GroupService.get_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    return group

# Participant endpoints
@router.post("/groups/{group_id}/participants", response_model=Participant)
async def add_participant(group_id: int, participant_data: ParticipantCreate, session: AsyncSession = Depends(get_session)):
    """Teilnehmer zu Gruppe hinzufügen"""
    # Check if group exists
    group = await GroupService.get_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    
    return await GroupService.add_participant(session, group_id, participant_data.name, participant_data.email)

@router.get("/groups/{group_id}/participants", response_model=List[Participant])
async def get_group_participants(group_id: int, session: AsyncSession = Depends(get_session)):
    """Alle Teilnehmer einer Gruppe abrufen"""
    return await GroupService.get_group_participants(session, group_id)

# Availability endpoints
@router.post("/participants/{participant_id}/availability", response_model=Availability)
async def add_availability(participant_id: int, availability_data: AvailabilityCreate, session: AsyncSession = Depends(get_session)):
    """Verfügbarkeit für Teilnehmer hinzufügen"""
    try:
        start_date = date.fromisoformat(availability_data.start_date)
        end_date = date.fromisoformat(availability_data.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ungültiges Datumsformat. Verwende YYYY-MM-DD")
    
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Startdatum muss vor Enddatum liegen")
    
    return await GroupService.add_availability(session, participant_id, start_date, end_date)

@router.get("/participants/{participant_id}/availability", response_model=List[Availability])
async def get_participant_availabilities(participant_id: int, session: AsyncSession = Depends(get_session)):
    """Verfügbarkeiten eines Teilnehmers abrufen"""
    return await GroupService.get_participant_availabilities(session, participant_id)