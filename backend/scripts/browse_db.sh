#!/bin/bash

# Database Browser Script

echo "🗄️  PostgreSQL Database Browser"
echo "============================="

DB_URL="${DATABASE_URL:-postgresql://gtp:gtp_pw@localhost:5433/gtp}"
# Strip async driver prefix if present (e.g. postgresql+asyncpg://)
DB_URL="${DB_URL/+asyncpg/}"

echo "Verbinde zur Database..."

psql "$DB_URL" << EOF
\echo ''
\echo '📋 TABELLEN ÜBERSICHT:'
\dt

\echo ''
\echo '👥 GRUPPEN:'
SELECT id, name, created_by_actor, created_at::date as erstellt FROM groups ORDER BY created_at DESC;

\echo ''
\echo '🧑 MITGLIEDER:'
SELECT m.id, m.actor_id, m.display_name, m.role, g.name as gruppe, m.joined_at::date as beitritt
FROM group_members m
JOIN groups g ON m.group_id = g.id
ORDER BY g.name, m.joined_at;

\echo ''
\echo '📊 STATISTIKEN:'
SELECT 
    COUNT(DISTINCT g.id) as gruppen_total,
    COUNT(m.id) as mitglieder_total
FROM groups g
LEFT JOIN group_members m ON g.id = m.group_id;

\q
EOF

echo ""
echo "✨ Database Browser abgeschlossen!"