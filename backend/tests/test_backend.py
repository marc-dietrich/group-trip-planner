#!/usr/bin/env python3
"""
Test script für das Backend - überprüft Database Connection und API Funktionalität
"""

import asyncio
import sys
import os
from datetime import date, datetime

# Add parent directory to path for app imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test 1: Check Dependencies
def test_dependencies():
    """Überprüfe ob alle required packages installiert sind"""
    print("🔍 Teste Dependencies...")
    
    missing_packages = []
    required_packages = [
        'fastapi', 'uvicorn', 'sqlmodel', 'asyncpg', 
        'python_dotenv', 'pydantic', 'alembic'
    ]
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_').replace('python_', ''))
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package}")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  Fehlende Packages: {', '.join(missing_packages)}")
        print("Führe aus: pip install -r requirements.txt")
        return False
    
    print("✅ Alle Dependencies verfügbar\n")
    return True

# Test 2: Database Connection
async def test_database_connection():
    """Teste PostgreSQL Connection"""
    print("🐘 Teste Database Connection...")
    
    try:
        from app.core.database import engine
        from sqlalchemy import text
        
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"  ✅ PostgreSQL: {version[:50]}...")
            
            # Check if tables exist
            result = await conn.execute(text("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public';
            """))
            table_count = result.fetchone()[0]
            print(f"  ✅ Tabellen gefunden: {table_count}")
            
        return True
        
    except Exception as e:
        print(f"  ❌ Database Connection Error: {e}")
        print("  💡 Tipp: Führe ./setup_postgres.sh aus")
        return False

# Test 3: Create Test Data
async def test_crud_operations():
    """Teste CRUD Operations mit echten Daten"""
    print("📊 Teste CRUD Operations...")
    
    try:
        from app.core.database import get_session
        from app.services import GroupService
        
        # Get database session
        session_gen = get_session()
        session = await session_gen.__anext__()
        
        # 1. Create Group
        group = await GroupService.create_group(
            session, 
            "Test Gruppe Backend", 
            "Automatischer Test"
        )
        print(f"  ✅ Gruppe erstellt: {group.name} (ID: {group.id})")
        
        # 2. Get Groups
        groups = await GroupService.get_groups(session)
        print(f"  ✅ Gruppen gefunden: {len(groups)}")
        
        # 3. Add Participant
        participant = await GroupService.add_participant(
            session, 
            group.id, 
            "Test User", 
            "test@example.com"
        )
        print(f"  ✅ Teilnehmer hinzugefügt: {participant.name}")
        
        # 4. Add Availability
        from datetime import timedelta
        today = date.today()
        next_week = today + timedelta(days=7)
        
        availability = await GroupService.add_availability(
            session,
            participant.id,
            today,
            next_week
        )
        print(f"  ✅ Verfügbarkeit hinzugefügt: {availability.start_date} - {availability.end_date}")
        
        # 5. Get Participants
        participants = await GroupService.get_group_participants(session, group.id)
        print(f"  ✅ Teilnehmer abgerufen: {len(participants)}")
        
        await session.close()
        return True
        
    except Exception as e:
        print(f"  ❌ CRUD Error: {e}")
        return False

# Test 4: API Health
async def test_api_health():
    """Teste API Health Endpoint"""
    print("🌐 Teste API Health...")
    
    try:
        import urllib.request
        import json
        
        with urllib.request.urlopen('http://localhost:8000/api/health') as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print(f"  ✅ API Health: {data.get('status')}")
                print(f"  📝 Message: {data.get('message')}")
                return True
            else:
                print(f"  ❌ API Health Error: Status {response.status}")
                return False
                    
    except Exception as e:
        print(f"  ❌ API nicht erreichbar: {e}")
        print("  💡 Tipp: Starte das Backend mit 'python main.py'")
        return False

# Main Test Runner
async def run_all_tests():
    """Führe alle Tests aus"""
    print("🚀 Backend Test Suite")
    print("=" * 50)
    
    # Check environment
    if 'CONDA_DEFAULT_ENV' in os.environ:
        print(f"🐍 Conda Environment: {os.environ['CONDA_DEFAULT_ENV']}")
    elif 'VIRTUAL_ENV' in os.environ:
        print(f"🐍 Python venv: {os.environ['VIRTUAL_ENV']}")
    else:
        print("⚠️  Keine Python Environment aktiv")
    
    # Track results
    results = {}
    
    # Test 1: Dependencies (synchronous)
    results['dependencies'] = test_dependencies()
    
    if not results['dependencies']:
        print("❌ Stoppe Tests - Dependencies fehlen")
        return False
    
    # Test 2: Database Connection
    results['database'] = await test_database_connection()
    
    # Test 3: CRUD Operations
    if results['database']:
        results['crud'] = await test_crud_operations()
    else:
        print("⏭️  Überspringe CRUD Tests - keine DB Connection")
        results['crud'] = False
    
    # Test 4: API Health (optional - nur wenn Server läuft)
    results['api'] = await test_api_health()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Zusammenfassung:")
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name.ljust(15)}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 Alle Tests erfolgreich! Backend ist bereit.")
    else:
        print("\n⚠️  Einige Tests fehlgeschlagen. Siehe Ausgabe oben.")
        
        if not results['database']:
            print("💡 Führe zuerst ./setup_postgres.sh aus")
        if not results['api']:
            print("💡 Starte Backend mit: python main.py")
    
    return all_passed

if __name__ == "__main__":
    # Change to backend directory if not already there
    if not os.path.exists('main.py'):
        print("❌ Führe dieses Script aus dem /backend Verzeichnis aus")
        sys.exit(1)
    
    # Run tests
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Tests abgebrochen")
        sys.exit(1)