#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

docker compose \
  -f docker-compose.yml \
  -f services/storage-service/docker-compose.yml \
  -f services/oauth-proxy-service/docker-compose.yml \
  -f services/caddy-service/docker-compose.yml \
  -f services/contact-service/docker-compose.yml \
  -f services/stripe-service/docker-compose.yml \
  up -d "$@"
