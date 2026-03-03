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

DB_USER="${POSTGRES_USER:-gtp}"
DB_PASSWORD="${POSTGRES_PASSWORD:-gtp_pw}"
DB_NAME="${POSTGRES_DB:-gtp}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5433}"

sudo -u postgres psql << EOF
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
EOF

echo "✅ Datenbank '${DB_NAME}' und User '${DB_USER}' erstellt"

# Update .env file with correct credentials
echo "⚙️ Aktualisiere .env Datei..."
cat > .env << EOF
# Database
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Development
DEBUG=true
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