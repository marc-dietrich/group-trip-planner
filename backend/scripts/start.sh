#!/bin/bash

# Detect environment type and activate accordingly
if conda info --envs 2>/dev/null | grep -q "gtp"; then
    echo "🐍 Aktiviere Conda Environment..."
    eval "$(conda shell.bash hook)"
    conda activate gtp
elif [ -d "../venv" ] || [ -d "venv" ]; then
    echo "🐍 Aktiviere Python venv..."
    source venv/bin/activate 2>/dev/null || source ../venv/bin/activate
else
    echo "⚠️  Keine Environment gefunden. Führe Setup aus:"
    echo "   ./scripts/setup_conda.sh  oder"
    echo "   python -m venv venv && source venv/bin/activate"
fi

cd "$(dirname "$0")/.." 

# Try different start methods
echo "🚀 Starte Backend Server..."

python main.py