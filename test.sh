#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="all"

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [frontend|backend|services|all]"
  exit 1
fi

if [[ $# -eq 1 ]]; then
  MODE="$1"
fi

case "$MODE" in
  frontend|backend|services|all)
    ;;
  *)
    echo "Usage: $0 [frontend|backend|services|all]"
    exit 1
    ;;
esac

run_frontend_tests() {
  echo "==> Running frontend tests"
  (
    cd frontend
    npm run test -- --run
  )
}

run_backend_tests() {
  echo "==> Running backend tests"
  (
    cd backend
    if [[ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]] && command -v conda >/dev/null 2>&1; then
      source "$HOME/miniconda3/etc/profile.d/conda.sh"
      if conda env list | awk '{print $1}' | grep -qx "gtp"; then
        conda activate gtp
      fi
    fi
    python -m pytest -m "not db_smoke"
  )
}

run_services_tests() {
  echo "==> Running services tests"
  export OAUTH_CLIENT_ID="${OAUTH_CLIENT_ID:-dummy-client-id}"
  export OAUTH_CLIENT_SECRET="${OAUTH_CLIENT_SECRET:-dummy-client-secret}"
  export OAUTH_COOKIE_SECRET="${OAUTH_COOKIE_SECRET:-MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=}"
  export POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-0}"
  export BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-0}"
  export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-0}"
  export CADDY_HTTP_HOST_PORT="${CADDY_HTTP_HOST_PORT:-0}"
  export CADDY_HTTPS_HOST_PORT="${CADDY_HTTPS_HOST_PORT:-0}"
  export OAUTH_HOST_PORT="${OAUTH_HOST_PORT:-0}"
  export GARAGE_S3_HOST_PORT="${GARAGE_S3_HOST_PORT:-0}"
  export GARAGE_ADMIN_HOST_PORT="${GARAGE_ADMIN_HOST_PORT:-0}"
  export STRIPE_HOST_PORT="${STRIPE_HOST_PORT:-0}"
  export CONTACT_HOST_PORT="${CONTACT_HOST_PORT:-0}"
  export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_dummy}"
  export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_dummy}"
  export CHECKOUT_SUCCESS_URL="${CHECKOUT_SUCCESS_URL:-http://frontend/supporter/thanks}"
  export CHECKOUT_CANCEL_URL="${CHECKOUT_CANCEL_URL:-http://frontend/}"
  export STRIPE_CHECKOUT_PRODUCT_TEXT="${STRIPE_CHECKOUT_PRODUCT_TEXT:-Service Test}"
  export SUPPORTER_WEBHOOK_SECRET="${SUPPORTER_WEBHOOK_SECRET:-test-supporter-secret}"
  export MONITORING_USER="${MONITORING_USER:-monitor}"
  export MONITORING_PASSWORD_HASH="${MONITORING_PASSWORD_HASH:-\$2a\$14\$eImiTXuWVxfM37uY4JANjQ==}"
  export CADDY_EMAIL="${CADDY_EMAIL:-dev@example.com}"

  local compose_files=(
    -f docker-compose.yml
    -f services/storage-service/docker-compose.yml
    -f services/oauth-proxy-service/docker-compose.yml
    -f services/caddy-service/docker-compose.yml
    -f services/contact-service/docker-compose.yml
    -f services/stripe-service/docker-compose.yml
    -f services/audio-service/docker-compose.yml
    -f services/tests/docker-compose.test.yml
  )

  cleanup_services_stack() {
    docker compose "${compose_files[@]}" down --remove-orphans || true
  }

  local service_exit=0
  trap cleanup_services_stack EXIT INT TERM
  cleanup_services_stack
  docker compose "${compose_files[@]}" up -d --build postgres backend frontend garage oauth-proxy caddy contact-service stripe-service audio-service
  docker compose "${compose_files[@]}" run --rm services-test-runner || service_exit=$?
  cleanup_services_stack
  trap - EXIT INT TERM

  if [[ $service_exit -ne 0 ]]; then
    return $service_exit
  fi
}

if [[ "$MODE" == "frontend" || "$MODE" == "all" ]]; then
  run_frontend_tests
fi

if [[ "$MODE" == "backend" || "$MODE" == "all" ]]; then
  run_backend_tests
fi

if [[ "$MODE" == "services" || "$MODE" == "all" ]]; then
  run_services_tests
fi

case "$MODE" in
  frontend)
    echo "✅ Frontend tests passed"
    ;;
  backend)
    echo "✅ Backend tests passed"
    ;;
  services)
    echo "✅ Services tests passed"
    ;;
  all)
    echo "✅ Frontend, backend and services tests passed"
    ;;
esac
