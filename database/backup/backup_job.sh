#!/usr/bin/env bash

set -euo pipefail

PERIOD="${1:-daily}"
if [[ "${PERIOD}" != "daily" && "${PERIOD}" != "weekly" && "${PERIOD}" != "monthly" ]]; then
  echo "[backup] invalid period: ${PERIOD}"
  exit 1
fi

source /app/runtime-env.sh

case "${PERIOD}" in
  daily)
    RETENTION="${BACKUP_RETENTION_DAILY}"
    ;;
  weekly)
    RETENTION="${BACKUP_RETENTION_WEEKLY}"
    ;;
  monthly)
    RETENTION="${BACKUP_RETENTION_MONTHLY}"
    ;;
esac

STAMP="$(date +%Y-%m-%dT%H-%M-%S%z)"
TARGET_DIR="/backups/${PERIOD}"
TMP_FILE="/tmp/${POSTGRES_DB}_${PERIOD}_${STAMP}.sql.gz.gpg"
TARGET_FILE="${TARGET_DIR}/$(basename "${TMP_FILE}")"

mkdir -p "${TARGET_DIR}"

echo "[backup] creating ${PERIOD} backup"

export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump \
  --host="${POSTGRES_HOST}" \
  --port="${POSTGRES_PORT}" \
  --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DB}" \
  --format=plain \
  --no-owner \
  --no-privileges \
| gzip -9 \
| gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "${BACKUP_ENCRYPTION_PASSPHRASE}" --output "${TMP_FILE}"
unset PGPASSWORD

mv "${TMP_FILE}" "${TARGET_FILE}"

echo "[backup] backup stored at ${TARGET_FILE}"

if [[ "${RETENTION}" =~ ^[0-9]+$ ]]; then
  mapfile -t FILES < <(find "${TARGET_DIR}" -maxdepth 1 -type f -name '*.sql.gz.gpg' -print | sort -r)
  if (( ${#FILES[@]} > RETENTION )); then
    for OLD in "${FILES[@]:${RETENTION}}"; do
      rm -f "${OLD}"
      echo "[backup] removed old backup ${OLD}"
    done
  fi
fi

/app/sync_remote.sh

echo "[backup] ${PERIOD} backup completed"
