# Database (PostgreSQL)

This folder contains a docker-compose setup for a local PostgreSQL instance used by the app.

## Quick start

1. Copy the env file: `cp .env.example .env`
2. Start Postgres: `docker compose up -d`
3. Connection string: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}` (defaults to `postgresql://gtp:gtp_pw@localhost:5432/gtp`).

## Notes

- Data persists via the `db_data` named volume.
- Healthcheck waits for Postgres readiness.
- Adjust exposed port in `docker-compose.yml` if 5432 is taken.
