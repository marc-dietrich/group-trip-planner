# Gruppen-Urlaubsplaner

[![CI](https://github.com/marc/group-trip-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/marc/group-trip-planner/actions/workflows/ci.yml)

Monorepo für die Gruppen-Reiseplanung (Phase 1: Gruppen anlegen, Zeitfenster definieren, Verfügbarkeiten sammeln, bestes Fenster berechnen). Backend und Frontend sind bewusst schlank gehalten und auf schnelle Tests ohne echte DB ausgelegt.

## Struktur

```
├── frontend/          # React + Vite + TypeScript (shadcn UI, Zustand)
├── backend/           # Python + FastAPI + SQLModel (PostgreSQL-ready)
└── README.md
```

## Development Setup

### Database (optional)

Die App und Tests laufen standardmäßig ohne laufende Datenbank. Eine echte Postgres-Instanz ist nur für manuelle Smoke-Tests nötig.

```bash
cd backend
./setup_postgres.sh     # Erstellt DB und User automatisch (nur falls benötigt)
```

### Backend (Python + FastAPI)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python main.py
```

Server läuft auf: http://localhost:8000
API Docs: http://localhost:8000/docs

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf: http://localhost:3000

## Tests & CI

- Schnelltests (ohne DB):
  - Backend: `cd backend && pytest -m "not db_smoke"`
  - Frontend: `cd frontend && npm run build`
- Optionaler DB-Smoke-Test (führt nur `SELECT 1` aus, keine Mutationen):
  - `cd backend && DATABASE_URL=<postgres-connection> pytest -m db_smoke`
- CI: baut Frontend mit öffentlichen Supabase-Keys und führt Backend-Tests ohne DB aus; der Smoke-Job läuft nur, wenn `DATABASE_URL` gesetzt ist.

Letzte lokale Läufe:

- Backend: `pytest -m "not db_smoke"` → alle Tests grün.
- Frontend: `npm run build` → erfolgreich.

## API Endpoints (aktuell)

- `GET /api/health` – Health check
- `GET /api/groups?actorId=` – Gruppen für anonymen Actor (oder alle ohne Parameter)
- `GET /api/groups` mit `Authorization: Bearer <jwt>` – Gruppen für Supabase User
- `POST /api/groups` – Neue Gruppe erstellen (anonym mit `actorId`, oder mit Supabase-JWT)
- `DELETE /api/groups/{id}` – Gruppe löschen (keine Rollenprüfung in Phase 1)
- `POST /api/auth/claim` – Lokalen Actor mit Supabase User verknüpfen (JWT nötig)

## Supabase Auth Setup

Backend (.env):

```
SUPABASE_JWT_SECRET=<service_role_jwt_secret>
# optional für Transparenz
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Frontend (frontend/.env.local oder `.env.example` als Vorlage):

```
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_PUBLIC_KEY=<public-anon-or-publishable-key>
```

DB Migration (fügt Nutzer-Tabellen und user_id auf group_members hinzu):

```
psql <connection> -f migrations/0002_supabase_auth.sql
```

Minimaler Flow zum Testen:

1. Starte Backend (`python main.py`) und Frontend (`npm run dev`).
2. Öffne http://localhost:3000, erzeuge einen lokalen Actor (wird in localStorage gespeichert).
3. Lege eine Gruppe an – sie gehört dem lokalen Actor.
4. Klicke „Mit Google anmelden“ (Supabase OAuth). Nach Redirect wird dein Supabase-User mit dem Actor verknüpft (`/api/auth/claim`).
5. Lade die Gruppenliste neu: sie wird jetzt über den JWT geladen und die bestehenden Mitgliedschaften sind dem Supabase-User zugeordnet.
