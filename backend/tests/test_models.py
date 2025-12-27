"""
Tests für die Models
"""

import pytest
from app.models import Group, Participant, Availability
from datetime import date, datetime

def test_group_model():
    """Teste Group Model"""
    group = Group(name="Test Gruppe", description="Test Description")
    assert group.name == "Test Gruppe"
    assert group.description == "Test Description"
    assert group.id is None  # Before saving to DB

def test_participant_model():
    """Teste Participant Model"""
    participant = Participant(group_id=1, name="Max Mustermann", email="max@test.de")
    assert participant.group_id == 1
    assert participant.name == "Max Mustermann"
    assert participant.email == "max@test.de"

def test_availability_model():
    """Teste Availability Model"""
    today = date.today()
    tomorrow = date(today.year, today.month, today.day + 1)
    
    availability = Availability(participant_id=1, start_date=today, end_date=tomorrow)
    assert availability.participant_id == 1
    assert availability.start_date == today
    assert availability.end_date == tomorrow