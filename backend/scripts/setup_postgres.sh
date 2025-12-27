#!/bin/bash

# PostgreSQL Setup für Group Trip Planner

echo "🚀 PostgreSQL Setup für Group Trip Planner"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL ist nicht installiert. Bitte installiere PostgreSQL:"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   macOS: brew install postgresql"
    echo "   Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL läuft nicht. Bitte starte PostgreSQL:"
    echo "   Ubuntu/Debian: sudo systemctl start postgresql"
    echo "   macOS: brew services start postgresql"
    echo "   Windows: Starte PostgreSQL Service"
    exit 1
fi

echo "✅ PostgreSQL ist installiert und läuft"

# Create database and user
echo "📊 Erstelle Datenbank und User..."

sudo -u postgres psql << EOF
CREATE USER trip_planner WITH PASSWORD 'trip_password';
CREATE DATABASE group_trip_planner_db OWNER trip_planner;
GRANT ALL PRIVILEGES ON DATABASE group_trip_planner_db TO trip_planner;
\q
EOF

echo "✅ Datenbank 'group_trip_planner_db' und User 'trip_planner' erstellt"

# Update .env file with correct credentials
echo "⚙️ Aktualisiere .env Datei..."
cat > .env << EOF
# Database
DATABASE_URL=postgresql+asyncpg://trip_planner:trip_password@localhost/group_trip_planner_db

# Development
DEBUG=True
EOF

echo "✅ .env Datei aktualisiert"
echo ""
echo "🎉 Setup abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "1. pip install -r requirements.txt"
echo "2. python main.py"
echo ""
echo "Die API wird automatisch die Datenbank-Tabellen erstellen."