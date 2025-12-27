"""
Participant model - Teilnehmer
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Participant(SQLModel, table=True):
    """Teilnehmer einer Gruppe"""
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="groups.id", description="ID der Gruppe")
    name: str = Field(max_length=100, description="Name des Teilnehmers")
    email: Optional[str] = Field(default=None, max_length=255, description="E-Mail des Teilnehmers")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Erstellungsdatum")