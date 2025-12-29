#!/bin/bash

# Test ob das Backend funktioniert - ohne uvicorn reload

cd "$(dirname "$0")/.."

echo "🧪 Teste Backend Import..."

python -c "
import sys
import os
sys.path.insert(0, '.')

try:
    print('📦 Importiere FastAPI App...')
    from app.main import app
    print('✅ App Import erfolgreich')
    
    print('📦 Teste Settings...')
    from app.core.config import get_settings
    settings = get_settings()
    print(f'✅ Settings: {settings.app_name}')
    
    print('📦 Teste Models...')
    from app.user_core.models import Group, GroupMember
    print('✅ Models Import erfolgreich')
    
    print('📦 Teste Services...')
    from app.user_core.services import GroupService
    print('✅ Services Import erfolgreich')
    
    print('')
    print('🎉 Alle Imports erfolgreich! Backend ist bereit.')
    print('')
    print('Starte Server mit:')
    print('  python run_server.py')
    print('  oder ./scripts/start.sh')
    
except Exception as e:
    print(f'❌ Import Fehler: {e}')
    print('')
    print('💡 Debug Info:')
    print(f'Python Path: {sys.path}')
    print(f'Working Dir: {os.getcwd()}')
    import traceback
    traceback.print_exc()
"

echo ""
echo "✨ Import Test abgeschlossen!"