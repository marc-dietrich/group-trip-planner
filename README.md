# Gruppen-Urlaubsplaner

[![CI](https://github.com/marc-dietrich/group-trip-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/marc-dietrich/group-trip-planner/actions/workflows/ci.yml)

Monorepo für die Gruppen-Reiseplanung (Phase 1: Gruppen anlegen, Zeitfenster definieren, Verfügbarkeiten sammeln, bestes Fenster berechnen). Backend und Frontend sind bewusst schlank gehalten und auf schnelle Tests ohne echte DB ausgelegt.

## Struktur

```
├── frontend/          # React + Vite + TypeScript (shadcn UI, Zustand)
├── backend/           # Python + FastAPI + SQLModel (PostgreSQL-ready)
└── README.md
```

## Development Setup

### Image Storage (Garage)

Für self-hosted Objekt-Storage (S3-kompatibel, lokal) siehe: `docs/storage_garage.md`.

### Database (optional)

Die App und Tests laufen standardmäßig ohne laufende Datenbank. Eine echte Postgres-Instanz ist nur für manuelle Smoke-Tests nötig.

```bash
cd backend
./setup_postgres.sh     # Erstellt DB und User automatisch (nur falls benötigt)
```

Für automatisierte, verschlüsselte Backups (daily/weekly/monthly, lokal + optional NAS) siehe `database/README.md`.

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

### Backend per Docker (lokale PostgreSQL)

```bash
docker build -t gtp-backend ./backend

docker run --rm -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://trip_planner:trip_password@localhost/group_trip_planner_db" \
  -e DATABASE_SSL_REQUIRE=False \
  -e JWT_SECRET="<your-jwt-secret>" \
  gtp-backend
```

Wichtige Variablen (siehe `backend/.env` Vorlage):

- `DATABASE_URL` (asyncpg PostgreSQL URL)
- `DATABASE_SSL_REQUIRE=False` (lokal) / `True` (Remote mit TLS)
- `JWT_SECRET` – geheimer Schlüssel für Token-Signierung

## Tests & CI

- Schnelltests (ohne DB):
  - Backend: `cd backend && pytest -m "not db_smoke"`
  - Frontend: `cd frontend && npm run build`
- Optionaler DB-Smoke-Test (führt nur `SELECT 1` aus, keine Mutationen):
  - `cd backend && DATABASE_URL=<postgres-connection> pytest -m db_smoke`
- CI: baut Frontend und führt Backend-Tests ohne DB aus; der Smoke-Job läuft nur, wenn `DATABASE_URL` gesetzt ist.

Letzte lokale Läufe:

- Backend: `pytest -m "not db_smoke"` → alle Tests grün.
- Frontend: `npm run build` → erfolgreich.

## API Endpoints (aktuell)

- `GET /api/health` – Health check
- `GET /api/groups?actorId=` – Gruppen für anonymen Actor (oder alle ohne Parameter)
- `GET /api/groups` mit `Authorization: Bearer <jwt>` – Gruppen für authentifizierten User
- `POST /api/groups` – Neue Gruppe erstellen (anonym mit `actorId`, oder mit JWT)
- `DELETE /api/groups/{id}` – Gruppe löschen (keine Rollenprüfung in Phase 1)
- `POST /api/auth/claim` – Lokalen Actor mit authentifiziertem User verknüpfen (JWT nötig)

## Auth Setup

Backend (.env):

```
JWT_SECRET=<your-jwt-secret>
```

DB Migration (fügt Nutzer-Tabellen und user_id auf group_members hinzu):

```
psql <connection> -f migrations/0002_supabase_auth.sql
```

Minimaler Flow zum Testen:

1. Starte Backend (`python main.py`) und Frontend (`npm run dev`).
2. Öffne http://localhost:3000, erzeuge einen lokalen Actor (wird in localStorage gespeichert).
3. Lege eine Gruppe an – sie gehört dem lokalen Actor.
4. Melde dich über OAuth2-Proxy an (Google). Nach Redirect wird dein User mit dem Actor verknüpft (`/api/auth/claim`).
5. Lade die Gruppenliste neu: sie wird jetzt über den JWT geladen und die bestehenden Mitgliedschaften sind dem User zugeordnet.
