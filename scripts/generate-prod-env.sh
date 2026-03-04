#!/usr/bin/env bash
# =============================================================================
# generate-prod-env.sh — Generate a production-ready .env with random secrets
# =============================================================================
#
# Usage:
#   bash scripts/generate-prod-env.sh            # writes ../.env.production
#   bash scripts/generate-prod-env.sh --print    # prints to stdout instead
#
# All secrets are generated via /dev/urandom + openssl (no Python needed).
# Safe to re-run — will NOT overwrite an existing file unless --force is given.
# =============================================================================
set -euo pipefail

DOMAIN="planning.made-simple.online"
EMAIL="admin@made-simple.online"
OUT_FILE="$(dirname "$0")/../.env.production"
PRINT_ONLY=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --print)  PRINT_ONLY=true ;;
    --force)  FORCE=true ;;
    *)        echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

if [[ "$PRINT_ONLY" == false && -f "$OUT_FILE" && "$FORCE" == false ]]; then
  echo "ERROR: $OUT_FILE already exists. Use --force to overwrite."
  exit 1
fi

# ── Secret generators ────────────────────────────────────────────────────────

rand_token()  { openssl rand -base64 "$1" | tr -d '\n/+='; }
rand_hex()    { openssl rand -hex "$1"; }
rand_urlsafe(){ openssl rand -base64 "$1" | tr '+/' '-_' | tr -d '=\n' | head -c "$1"; }

POSTGRES_PW="$(rand_token 24 | head -c 32)"
JWT_SECRET="$(rand_token 32 | head -c 43)"
SUPPORTER_WH="$(rand_token 24 | head -c 32)"
BACKUP_PASS="$(rand_token 32 | head -c 48)"
OAUTH_COOKIE="$(openssl rand -base64 32 | tr -d '\n')"  # exactly 44 chars base64
GARAGE_RPC="$(rand_hex 32)"
GARAGE_ADMIN="$(rand_hex 32)"
GARAGE_ACCESS="$(rand_token 16 | head -c 20)"
GARAGE_SECRET="$(rand_token 32 | head -c 40)"
MONITORING_PW="$(rand_token 16 | head -c 20)"
MONITORING_PW_HASH="$(docker run --rm caddy:2.8.4-alpine caddy hash-password --plaintext "$MONITORING_PW" 2>/dev/null)"
if [[ -z "$MONITORING_PW_HASH" ]]; then
  echo "WARNING: Could not generate Caddy hash (is Docker running?). MONITORING_PASSWORD_HASH left blank."
  MONITORING_PW_HASH=""
fi

# ── Build the file ───────────────────────────────────────────────────────────

ENV_CONTENT="$(cat <<ENVEOF
# =============================================================================
# Group Trip Planner — Production Environment
# Generated: $(date -Iseconds)
# Domain: ${DOMAIN}
# =============================================================================
# Load via:  doppler run -- docker compose up
# Or:        set -a; source .env.production; set +a; docker compose up -d
# =============================================================================

# ── Domain / Reverse Proxy ───────────────────────────────────────────────────

CADDY_DOMAIN=${DOMAIN}
CADDY_EMAIL=${EMAIL}
MONITORING_USER=monitor
MONITORING_PASSWORD=${MONITORING_PW}
MONITORING_PASSWORD_HASH=${MONITORING_PW_HASH}

# ── Image Tags / Registry ────────────────────────────────────────────────────

GHCR_OWNER=marc-dietrich
IMAGE_TAG=latest

# ── Database ─────────────────────────────────────────────────────────────────

POSTGRES_USER=gtp
POSTGRES_PASSWORD=${POSTGRES_PW}
POSTGRES_DB=gtp
POSTGRES_HOST_PORT=5432
DATABASE_URL=postgresql+asyncpg://gtp:${POSTGRES_PW}@postgres:5432/gtp
DATABASE_SSL_REQUIRE=false

# ── Backend ──────────────────────────────────────────────────────────────────

HOST=0.0.0.0
PORT=8000
APP_NAME="Gruppen-Urlaubsplaner API"
APP_VERSION=0.1.0
DEBUG=false

JWT_SECRET=${JWT_SECRET}
JWT_ALGORITHM=HS256

SUPPORTER_WEBHOOK_SECRET=${SUPPORTER_WH}
SUPPORTER_BADGE_DURATION_DAYS=183

FRONTEND_BASE_URL=https://${DOMAIN}
FRONTEND_PATH_PREFIX=/group-trip-planner
ENFORCE_HTTPS=true
INVITE_TOKEN_TTL_DAYS=7
VOICE_MOCK_ENABLED=false

CORS_ORIGINS='["https://${DOMAIN}"]'

# ── Object Storage (Garage / S3-compatible) ──────────────────────────────────

STORAGE_ENABLED=true
STORAGE_S3_ENDPOINT=http://garage:3900
STORAGE_S3_REGION=garage
STORAGE_S3_ACCESS_KEY=${GARAGE_ACCESS}
STORAGE_S3_SECRET_KEY=${GARAGE_SECRET}
STORAGE_S3_BUCKET=group-trip-images
STORAGE_S3_USE_SSL=false

# ── Image Upload / Processing ────────────────────────────────────────────────

IMAGE_UPLOAD_MAX_INPUT_BYTES=5242880
PROFILE_IMAGE_TARGET_BYTES=102400
PROFILE_IMAGE_WIDTH=512
PROFILE_IMAGE_HEIGHT=512
GROUP_IMAGE_TARGET_BYTES=204800
GROUP_IMAGE_WIDTH=1024
GROUP_IMAGE_HEIGHT=512
PRESIGNED_URL_TTL_SECONDS=300

# ── Postgres Backups (local only — remote sync disabled) ─────────────────────

BACKUP_ENCRYPTION_PASSPHRASE=${BACKUP_PASS}
TZ=Europe/Berlin

BACKUP_DAILY_CRON="0 2 * * *"
BACKUP_WEEKLY_CRON="0 3 * * 0"
BACKUP_MONTHLY_CRON="0 4 1 * *"

BACKUP_RETENTION_DAILY=14
BACKUP_RETENTION_WEEKLY=8
BACKUP_RETENTION_MONTHLY=12

BACKUP_RUN_ON_STARTUP=false
BACKUP_REMOTE_MODE=disabled
BACKUP_REMOTE_TIMEOUT_SECONDS=120

# ── OAuth2 Proxy (Google) ───────────────────────────────────────────────────

OAUTH_CLIENT_ID=REPLACE_WITH_GOOGLE_CLIENT_ID
OAUTH_CLIENT_SECRET=REPLACE_WITH_GOOGLE_CLIENT_SECRET
OAUTH_COOKIE_SECRET=${OAUTH_COOKIE}
OAUTH_UPSTREAM=http://backend:8000
OAUTH_REDIRECT_URL=https://${DOMAIN}/oauth2/callback

# ── Stripe Service ───────────────────────────────────────────────────────────

STRIPE_ALLOWED_ORIGIN=https://${DOMAIN}
STRIPE_SECRET_KEY=REPLACE_WITH_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=REPLACE_WITH_STRIPE_WEBHOOK_SECRET
CHECKOUT_SUCCESS_URL=https://${DOMAIN}/group-trip-planner/supporter/thanks
CHECKOUT_CANCEL_URL=https://${DOMAIN}/group-trip-planner/
APP_BASE_URL=https://${DOMAIN}/group-trip-planner
SUPPORTER_API_BASE_URL=http://backend:8000

# ── Contact Service ──────────────────────────────────────────────────────────

CONTACT_ALLOWED_ORIGIN=https://${DOMAIN}
CONTACT_SUPPORT_EMAIL=kontakt@made-simple.online
CONTACT_LOG_FILE=apps/contact-service/data/requests.log
CONTACT_LOG_MAX_BYTES=10485760

# ── Frontend (Vite — build-time vars) ────────────────────────────────────────

VITE_API_BASE_URL=https://${DOMAIN}
VITE_OAUTH_BASE_URL=https://${DOMAIN}
VITE_STRIPE_BASE_URL=https://${DOMAIN}
VITE_CONTACT_SERVICE_BASE_URL=https://${DOMAIN}
VITE_BASE_PATH=/group-trip-planner/
CUSTOM_DOMAIN=true
GITHUB_PAGES=false
BASE_URL=https://${DOMAIN}

# ── Garage Storage ───────────────────────────────────────────────────────────

GARAGE_ACCESS_KEY_ID=${GARAGE_ACCESS}
GARAGE_SECRET_ACCESS_KEY=${GARAGE_SECRET}
GARAGE_RPC_SECRET=${GARAGE_RPC}
GARAGE_ADMIN_TOKEN=${GARAGE_ADMIN}
GARAGE_S3_REGION=garage
GARAGE_S3_ROOT_DOMAIN=.s3.garage.internal
ENVEOF
)"

# ── Output ───────────────────────────────────────────────────────────────────

if [[ "$PRINT_ONLY" == true ]]; then
  echo "$ENV_CONTENT"
else
  echo "$ENV_CONTENT" > "$OUT_FILE"
  echo "✔ Written to $OUT_FILE"
  echo ""
  echo "  ⚠  You still need to fill in manually:"
  echo "     • OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET  (Google Cloud Console)"
  echo "     • STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET  (Stripe Dashboard)"
  echo ""
  echo "  Then import into Doppler:"
  echo "     doppler secrets upload --project gtp --config prd .env.production"
fi
