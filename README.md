# Gruppen-Urlaubsplaner

Ein minimales Setup für die Gruppen-Reiseplanung Anwendung.

## Struktur

```
├── frontend/          # React + Vite + TypeScript
├── backend/          # Python + FastAPI + PostgreSQL
└── README.md
```

## Development Setup

### Database (PostgreSQL)

```bash
cd backend
./setup_postgres.sh     # Erstellt DB und User automatisch
```

### Backend (Python + FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # oder venv\Scripts\activate auf Windows
pip install -r requirements.txt
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

Frontend (frontend/.env.local):

```
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_ANON_KEY=<anon-key>
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
