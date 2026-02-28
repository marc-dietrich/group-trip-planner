#!/usr/bin/env bash

set -euo pipefail

source /app/runtime-env.sh

MODE="${BACKUP_REMOTE_MODE}"

if [[ "${MODE}" == "disabled" || -z "${MODE}" ]]; then
  echo "[backup] remote sync disabled"
  exit 0
fi

if [[ "${MODE}" == "rsync" ]]; then
  if [[ -z "${REMOTE_RSYNC_HOST}" || -z "${REMOTE_RSYNC_USER}" || -z "${REMOTE_RSYNC_PATH}" ]]; then
    echo "[backup] rsync mode requires REMOTE_RSYNC_HOST, REMOTE_RSYNC_USER and REMOTE_RSYNC_PATH"
    exit 1
  fi

  SSH_OPTS="-p ${REMOTE_RSYNC_PORT} -o StrictHostKeyChecking=${REMOTE_SSH_STRICT_HOST_KEY_CHECKING}"
  if [[ -n "${REMOTE_SSH_KEY_PATH}" ]]; then
    SSH_OPTS="${SSH_OPTS} -i ${REMOTE_SSH_KEY_PATH}"
  fi

  timeout "${BACKUP_REMOTE_TIMEOUT_SECONDS}" ssh ${SSH_OPTS} "${REMOTE_RSYNC_USER}@${REMOTE_RSYNC_HOST}" "mkdir -p '${REMOTE_RSYNC_PATH}'"
  timeout "${BACKUP_REMOTE_TIMEOUT_SECONDS}" rsync -az --delete -e "ssh ${SSH_OPTS}" /backups/ "${REMOTE_RSYNC_USER}@${REMOTE_RSYNC_HOST}:${REMOTE_RSYNC_PATH}/"
  echo "[backup] rsync mirror completed"
  exit 0
fi

if [[ "${MODE}" == "ftp" ]]; then
  if [[ -z "${REMOTE_FTP_HOST}" || -z "${REMOTE_FTP_USER}" || -z "${REMOTE_FTP_PASSWORD}" ]]; then
    echo "[backup] ftp mode requires REMOTE_FTP_HOST, REMOTE_FTP_USER and REMOTE_FTP_PASSWORD"
    exit 1
  fi

  FTP_SSL="yes"
  if [[ "${REMOTE_FTP_SSL}" == "false" ]]; then
    FTP_SSL="no"
  fi

  FTP_VERIFY="yes"
  if [[ "${REMOTE_FTP_VERIFY_CERT}" == "false" ]]; then
    FTP_VERIFY="no"
  fi

  timeout "${BACKUP_REMOTE_TIMEOUT_SECONDS}" lftp -e "set net:timeout ${BACKUP_REMOTE_TIMEOUT_SECONDS}; set ftp:ssl-allow ${FTP_SSL}; set ssl:verify-certificate ${FTP_VERIFY}; mkdir -p ${REMOTE_FTP_PATH}; mirror -R --delete /backups ${REMOTE_FTP_PATH}; bye" -p "${REMOTE_FTP_PORT}" -u "${REMOTE_FTP_USER},${REMOTE_FTP_PASSWORD}" "${REMOTE_FTP_HOST}"
  echo "[backup] ftp mirror completed"
  exit 0
fi

echo "[backup] unsupported BACKUP_REMOTE_MODE: ${MODE}"
exit 1
