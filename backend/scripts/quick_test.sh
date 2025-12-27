#!/bin/bash

# Quick Backend Test Script
# Automatisierter Test für das komplette Backend Setup

echo "🚀 Quick Backend Test"
echo "===================="

cd backend

echo "1. Aktiviere Virtual Environment..."
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "  ✅ venv aktiviert"
else
    echo "  ⚠️  Kein venv gefunden - erstelle eines:"
    echo "     python -m venv venv && source venv/bin/activate"
fi

echo ""
echo "2. Teste Dependencies..."
pip list | grep -E "(fastapi|sqlmodel|asyncpg)" || {
    echo "  ⚠️  Packages fehlen - installiere sie:"
    echo "     pip install -r requirements.txt"
}

echo ""
echo "3. Teste Database Setup..."
if [ -f ".env" ]; then
    echo "  ✅ .env file gefunden"
else
    echo "  ⚠️  .env fehlt - führe setup aus:"
    echo "     ./setup_postgres.sh"
fi

echo ""
echo "4. Führe Backend Tests aus..."
python test_backend.py

echo ""
echo "5. Teste API (falls Backend läuft)..."
curl -s http://localhost:8000/api/health > /dev/null && {
    echo "  ✅ API erreichbar unter localhost:8000"
    echo "  🌐 Teste: http://localhost:8000/docs"
} || {
    echo "  ℹ️  API nicht erreichbar - starte mit: python main.py"
}

echo ""
echo "✨ Test abgeschlossen!"