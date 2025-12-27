"""
Group service - Business logic für Gruppen
"""

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Group, Participant, Availability
from datetime import date
from typing import List, Optional

class GroupService:
    """Service für Gruppen-Operations"""
    
    @staticmethod
    async def create_group(session: AsyncSession, name: str, description: str = "") -> Group:
        """Neue Gruppe erstellen"""
        group = Group(name=name, description=description)
        session.add(group)
        await session.commit()
        await session.refresh(group)
        return group
    
    @staticmethod
    async def get_groups(session: AsyncSession) -> List[Group]:
        """Alle Gruppen abrufen"""
        result = await session.execute(select(Group))
        return result.scalars().all()
    
    @staticmethod
    async def get_group(session: AsyncSession, group_id: int) -> Optional[Group]:
        """Einzelne Gruppe abrufen"""
        return await session.get(Group, group_id)
    
    @staticmethod
    async def add_participant(session: AsyncSession, group_id: int, name: str, email: str = "") -> Participant:
        """Teilnehmer zu Gruppe hinzufügen"""
        participant = Participant(group_id=group_id, name=name, email=email)
        session.add(participant)
        await session.commit()
        await session.refresh(participant)
        return participant
    
    @staticmethod
    async def add_availability(session: AsyncSession, participant_id: int, start_date: date, end_date: date) -> Availability:
        """Verfügbarkeit für Teilnehmer hinzufügen"""
        availability = Availability(
            participant_id=participant_id,
            start_date=start_date,
            end_date=end_date
        )
        session.add(availability)
        await session.commit()
        await session.refresh(availability)
        return availability
    
    @staticmethod
    async def get_group_participants(session: AsyncSession, group_id: int) -> List[Participant]:
        """Alle Teilnehmer einer Gruppe abrufen"""
        result = await session.execute(select(Participant).where(Participant.group_id == group_id))
        return result.scalars().all()
    
    @staticmethod
    async def get_participant_availabilities(session: AsyncSession, participant_id: int) -> List[Availability]:
        """Verfügbarkeiten eines Teilnehmers abrufen"""
        result = await session.execute(select(Availability).where(Availability.participant_id == participant_id))
        return result.scalars().all()