"""
Availability model - Verfügbarkeiten
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date

class Availability(SQLModel, table=True):
    """Verfügbarkeitsangabe eines Teilnehmers"""
    id: Optional[int] = Field(default=None, primary_key=True)
    participant_id: int = Field(foreign_key="participant.id", description="ID des Teilnehmers")
    start_date: date = Field(description="Startdatum der Verfügbarkeit")
    end_date: date = Field(description="Enddatum der Verfügbarkeit")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Erstellungsdatum")