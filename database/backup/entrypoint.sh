#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
  echo "[backup] BACKUP_ENCRYPTION_PASSPHRASE is required"
  exit 1
fi

mkdir -p /backups/daily /backups/weekly /backups/monthly /var/log

cat > /app/runtime-env.sh <<EOF
#!/usr/bin/env bash
export TZ="${TZ:-UTC}"
export POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER="${POSTGRES_USER:-gtp}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-gtp_pw}"
export POSTGRES_DB="${POSTGRES_DB:-gtp}"
export BACKUP_ENCRYPTION_PASSPHRASE="${BACKUP_ENCRYPTION_PASSPHRASE}"
export BACKUP_RETENTION_DAILY="${BACKUP_RETENTION_DAILY:-14}"
export BACKUP_RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-8}"
export BACKUP_RETENTION_MONTHLY="${BACKUP_RETENTION_MONTHLY:-12}"
export BACKUP_REMOTE_MODE="${BACKUP_REMOTE_MODE:-disabled}"
export BACKUP_REMOTE_TIMEOUT_SECONDS="${BACKUP_REMOTE_TIMEOUT_SECONDS:-120}"
export REMOTE_RSYNC_HOST="${REMOTE_RSYNC_HOST:-}"
export REMOTE_RSYNC_USER="${REMOTE_RSYNC_USER:-}"
export REMOTE_RSYNC_PATH="${REMOTE_RSYNC_PATH:-}"
export REMOTE_RSYNC_PORT="${REMOTE_RSYNC_PORT:-22}"
export REMOTE_SSH_KEY_PATH="${REMOTE_SSH_KEY_PATH:-}"
export REMOTE_SSH_STRICT_HOST_KEY_CHECKING="${REMOTE_SSH_STRICT_HOST_KEY_CHECKING:-yes}"
export REMOTE_FTP_HOST="${REMOTE_FTP_HOST:-}"
export REMOTE_FTP_PORT="${REMOTE_FTP_PORT:-21}"
export REMOTE_FTP_USER="${REMOTE_FTP_USER:-}"
export REMOTE_FTP_PASSWORD="${REMOTE_FTP_PASSWORD:-}"
export REMOTE_FTP_PATH="${REMOTE_FTP_PATH:-/gtp-backups}"
export REMOTE_FTP_SSL="${REMOTE_FTP_SSL:-true}"
export REMOTE_FTP_VERIFY_CERT="${REMOTE_FTP_VERIFY_CERT:-true}"
EOF

chmod +x /app/runtime-env.sh

DAILY_CRON="${BACKUP_DAILY_CRON:-0 2 * * *}"
WEEKLY_CRON="${BACKUP_WEEKLY_CRON:-0 3 * * 0}"
MONTHLY_CRON="${BACKUP_MONTHLY_CRON:-0 4 1 * *}"

cat > /etc/crontabs/root <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

${DAILY_CRON} /app/backup_job.sh daily >> /var/log/backup.log 2>&1
${WEEKLY_CRON} /app/backup_job.sh weekly >> /var/log/backup.log 2>&1
${MONTHLY_CRON} /app/backup_job.sh monthly >> /var/log/backup.log 2>&1
EOF

if [[ "${BACKUP_RUN_ON_STARTUP:-false}" == "true" ]]; then
  /app/backup_job.sh daily >> /var/log/backup.log 2>&1
fi

echo "[backup] crond started (daily: ${DAILY_CRON}, weekly: ${WEEKLY_CRON}, monthly: ${MONTHLY_CRON})"
exec crond -f -l 8
