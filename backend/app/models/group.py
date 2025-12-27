"""
Group model - Reisegruppen
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date

class Group(SQLModel, table=True):
    """Reisegruppe"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, description="Name der Gruppe")
    description: Optional[str] = Field(default=None, max_length=500, description="Beschreibung der Gruppe")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Erstellungsdatum")
    
    # Reisezeitraum Rahmen
    earliest_start_date: Optional[date] = Field(default=None, description="Frühestes Startdatum")
    latest_end_date: Optional[date] = Field(default=None, description="Spätestes Enddatum")