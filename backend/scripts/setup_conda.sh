#!/bin/bash

# Conda Setup für Group Trip Planner Backend

echo "🐍 Conda Environment Setup für Group Trip Planner"
echo ""

# Check if conda is available (ignore the error message)
if ! command -v conda &> /dev/null; then
    echo "❌ Conda ist nicht installiert oder nicht im PATH"
    exit 1
fi

echo "✅ Conda gefunden (Version-Check übersprungen wegen bekanntem Pydantic-Konflikt)"

# Remove existing environment if it exists
echo "🧹 Entferne existierende 'gtp' Environment falls vorhanden..."
conda env remove -n gtp -y 2>/dev/null || true

# Create new environment
echo "🛠️  Erstelle neue Conda Environment 'gtp'..."
conda env create -f environment.yml

if [ $? -eq 0 ]; then
    echo "✅ Conda Environment 'gtp' erfolgreich erstellt"
else
    echo "❌ Fehler beim Erstellen der Environment"
    echo "💡 Versuche manuell: conda create -n gtp python=3.11 -y"
    exit 1
fi

# Activate and install packages
echo "📦 Installiere Python Packages..."
conda activate gtp && pip install -r requirements.txt

echo ""
echo "🎉 Conda Setup abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "1. conda activate gtp"
echo "2. python main.py"
echo ""
echo "Environment aktivieren:"
echo "  conda activate gtp"
echo "Environment deaktivieren:"
echo "  conda deactivate"