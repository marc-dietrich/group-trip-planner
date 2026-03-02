# OAuth2 Proxy (Google)

Lightweight reverse proxy that handles Google OAuth and forwards authenticated requests to your upstream (default backend: `http://backend:8000`).

## Quick start

1. `cd oauth-proxy`
2. Configure Doppler once in repo root: `doppler setup --project group-trip-planner --config dev`
3. Ensure `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, and `OAUTH_COOKIE_SECRET` exist in Doppler.
4. Start: `doppler run -- docker compose up -d`
5. Open: http://localhost:4180 (login via Google, then proxy forwards to upstream).

## Key envs

- `OAUTH_UPSTREAM`: backend target (default `http://backend:8000`)
- `OAUTH_REDIRECT_URL`: must match the authorized redirect URI in your Google OAuth app, default `http://localhost:4180/oauth2/callback`
- `OAUTH_COOKIE_SECRET`: 32-byte base64 string (rotation-friendly)

## Notes

- Listens on port 4180 by default; change the port mapping in `docker-compose.yml` if needed.
- For HTTPS in front, terminate TLS at a reverse proxy or add certs and enable the TLS flags in `docker-compose.yml` as needed.
