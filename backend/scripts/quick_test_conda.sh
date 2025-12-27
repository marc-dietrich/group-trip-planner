#!/bin/bash

# Quick Test für Conda Environment

echo "🧪 Quick Conda Backend Test"
echo "=========================="

# Check if in conda environment
if [ "$CONDA_DEFAULT_ENV" != "" ]; then
    echo "✅ Conda Environment aktiv: $CONDA_DEFAULT_ENV"
else
    echo "⚠️  Keine Conda Environment aktiv"
    echo "💡 Führe aus: conda activate gtp"
    echo ""
fi

echo "🔍 Python & Package Check..."
python -c "
import sys
print(f'Python Version: {sys.version}')
try:
    import fastapi, sqlmodel, asyncpg
    print('✅ Alle Backend Packages verfügbar')
except ImportError as e:
    print(f'❌ Package fehlt: {e}')
"

echo ""
echo "🧪 Führe Backend Tests aus..."
cd "$(dirname "$0")/.."
python tests/test_backend.py

echo ""
echo "✨ Conda Test abgeschlossen!"