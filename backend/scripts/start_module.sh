#!/bin/bash

# Alternative start method - direct python module

echo "🚀 Starte Backend (Python Module Mode)"

cd "$(dirname "$0")/.."

echo "📍 Working Directory: $(pwd)"
echo "🐍 Python: $(which python)"

# Start with python module syntax
python -m app.main