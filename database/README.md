# Database (PostgreSQL)

This folder contains a docker-compose setup for a local PostgreSQL instance used by the app.

## Quick start

1. Configure Doppler in repo root: `doppler setup --project group-trip-planner --config dev`
2. Start Postgres: `doppler run -- docker compose up -d`
3. Connection string: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}` (defaults to `postgresql://gtp:gtp_pw@localhost:5432/gtp`).

## Notes

- Data persists via the `db_data` named volume.
- Healthcheck waits for Postgres readiness.
- Adjust exposed port in `docker-compose.yml` if 5432 is taken.

## Encrypted Backups (daily/weekly/monthly)

The stack includes a `postgres-backup` service that creates encrypted and compressed backups:

- Format: `pg_dump | gzip | gpg (AES256)`
- Local target (server disk): `database/backups/` on the host
- Buckets: `daily/`, `weekly/`, `monthly/` with independent retention
- Optional offsite mirror: `rsync` over SSH (NAS/server) or `ftp`/`ftps`

### Required env

In Doppler secrets (`group-trip-planner` / `dev`):

- `BACKUP_ENCRYPTION_PASSPHRASE` (required)

### Retention and schedule env

- `BACKUP_DAILY_CRON` (default `0 2 * * *`)
- `BACKUP_WEEKLY_CRON` (default `0 3 * * 0`)
- `BACKUP_MONTHLY_CRON` (default `0 4 1 * *`)
- `BACKUP_RETENTION_DAILY` (default `14`)
- `BACKUP_RETENTION_WEEKLY` (default `8`)
- `BACKUP_RETENTION_MONTHLY` (default `12`)

### Offsite mirror modes

- `BACKUP_REMOTE_MODE=disabled` (default)
- `BACKUP_REMOTE_MODE=rsync` with:
  - `REMOTE_RSYNC_HOST`, `REMOTE_RSYNC_USER`, `REMOTE_RSYNC_PATH`
  - optional: `REMOTE_RSYNC_PORT`, `REMOTE_SSH_KEY_MOUNT`, `REMOTE_SSH_KEY_PATH`, `REMOTE_SSH_STRICT_HOST_KEY_CHECKING`
- `BACKUP_REMOTE_MODE=ftp` with:
  - `REMOTE_FTP_HOST`, `REMOTE_FTP_USER`, `REMOTE_FTP_PASSWORD`
  - optional: `REMOTE_FTP_PORT`, `REMOTE_FTP_PATH`, `REMOTE_FTP_SSL`, `REMOTE_FTP_VERIFY_CERT`

### Start with backup service

```bash
docker compose up -d
```

### Restore example

```bash
gpg --decrypt --batch --yes --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" backup.sql.gz.gpg \
	| gunzip \
	| psql "postgresql://<user>:<password>@<host>:<port>/<db>"
```
