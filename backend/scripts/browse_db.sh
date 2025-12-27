#!/bin/bash

# Database Browser Script

echo "🗄️  PostgreSQL Database Browser"
echo "============================="

echo "Verbinde zur Database..."

psql postgresql://trip_planner:trip_password@localhost/group_trip_planner_db << EOF
\echo ''
\echo '📋 TABELLEN ÜBERSICHT:'
\dt

\echo ''
\echo '👥 GRUPPEN:'
SELECT id, name, description, created_at::date as erstellt FROM "group" ORDER BY id;

\echo ''
\echo '🧑 TEILNEHMER:'
SELECT p.id, p.name, p.email, g.name as gruppe 
FROM participant p 
JOIN "group" g ON p.group_id = g.id 
ORDER BY g.name, p.name;

\echo ''
\echo '📅 VERFÜGBARKEITEN:'
SELECT a.start_date, a.end_date, p.name as teilnehmer, g.name as gruppe
FROM availability a
JOIN participant p ON a.participant_id = p.id
JOIN "group" g ON p.group_id = g.id
ORDER BY g.name, a.start_date;

\echo ''
\echo '📊 STATISTIKEN:'
SELECT 
    COUNT(g.id) as gruppen_total,
    COUNT(p.id) as teilnehmer_total,
    COUNT(a.id) as verfügbarkeiten_total
FROM "group" g
LEFT JOIN participant p ON g.id = p.group_id
LEFT JOIN availability a ON p.id = a.participant_id;

\q
EOF

echo ""
echo "✨ Database Browser abgeschlossen!"