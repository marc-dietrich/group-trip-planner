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

## API Endpoints

### Gruppen

- `GET /api/health` - Health check
- `GET /api/groups` - Alle Gruppen abrufen
- `POST /api/groups` - Neue Gruppe erstellen
- `GET /api/groups/{id}` - Einzelne Gruppe abrufen

### Teilnehmer

- `POST /api/groups/{group_id}/participants` - Teilnehmer hinzufügen
- `GET /api/groups/{group_id}/participants` - Teilnehmer abrufen

### Verfügbarkeiten

- `POST /api/participants/{participant_id}/availability` - Verfügbarkeit hinzufügen
- `GET /api/participants/{participant_id}/availability` - Verfügbarkeiten abrufen

## Database Schema

```
Group (Reisegruppe)
├── id, name, description
├── created_at
└── earliest_start_date, latest_end_date

Participant (Teilnehmer)
├── id, group_id, name, email
└── created_at

Availability (Verfügbarkeiten)
├── id, participant_id
├── start_date, end_date
└── created_at
```

## Features (Phase 1)

- [x] Grundsetup Frontend & Backend
- [x] PostgreSQL Integration mit SQLModel
- [x] Gruppe erstellen
- [x] Teilnehmer hinzufügen
- [x] Verfügbarkeiten sammeln
- [ ] Optimale Zeitfenster berechnen
