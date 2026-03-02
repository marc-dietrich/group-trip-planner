# Doppler Environment Mapping

This project uses Doppler as source of truth for runtime environment variables.

## Recommended Doppler setup

- Project: `group-trip-planner`
- Configs: `dev`, `staging`, `prod`
- Use `doppler run -- ...` to inject env into each process.

## Key groups

### Core (all environments)

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`
- `DATABASE_SSL_REQUIRE`
- `JWT_SECRET`
- `DEBUG`

### Backend app

- `SUPPORTER_WEBHOOK_SECRET`
- `FRONTEND_BASE_URL`
- `FRONTEND_PATH_PREFIX`
- `ENFORCE_HTTPS`
- `INVITE_TOKEN_TTL_DAYS`
- `VOICE_MOCK_ENABLED`

### Storage / images

- `STORAGE_ENABLED`
- `STORAGE_S3_ENDPOINT`
- `STORAGE_S3_REGION`
- `STORAGE_S3_ACCESS_KEY`
- `STORAGE_S3_SECRET_KEY`
- `STORAGE_S3_BUCKET`
- `STORAGE_S3_USE_SSL`
- `IMAGE_UPLOAD_MAX_INPUT_BYTES`
- `PROFILE_IMAGE_TARGET_BYTES`
- `GROUP_IMAGE_TARGET_BYTES`
- `GARAGE_ACCESS_KEY_ID`
- `GARAGE_SECRET_ACCESS_KEY`

### Stripe service

- `STRIPE_ALLOWED_ORIGIN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CHECKOUT_SUCCESS_URL`
- `CHECKOUT_CANCEL_URL`
- `APP_BASE_URL`
- `SUPPORTER_API_BASE_URL`

### Contact service

- `CONTACT_ALLOWED_ORIGIN`
- `CONTACT_SUPPORT_EMAIL`
- `CONTACT_LOG_FILE`
- `CONTACT_LOG_MAX_BYTES`

### Frontend public vars

- `VITE_API_BASE_URL`
- `VITE_OAUTH_BASE_URL`
- `VITE_STRIPE_BASE_URL`
- `VITE_CONTACT_SERVICE_BASE_URL`
- `CUSTOM_DOMAIN`
- `GITHUB_PAGES`
- `VITE_BUILD_COMMIT`
- `VITE_BUILD_LABEL`
- `BASE_URL`

### OAuth / ingress / monitoring

- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `OAUTH_COOKIE_SECRET`
- `OAUTH_UPSTREAM`
- `OAUTH_REDIRECT_URL`
- `CADDY_DOMAIN`
- `CADDY_EMAIL`
- `MONITORING_USER`
- `MONITORING_PASSWORD_HASH`

### Backup pipeline

- `BACKUP_ENCRYPTION_PASSPHRASE`
- `TZ`
- `BACKUP_DAILY_CRON`
- `BACKUP_WEEKLY_CRON`
- `BACKUP_MONTHLY_CRON`
- `BACKUP_RETENTION_DAILY`
- `BACKUP_RETENTION_WEEKLY`
- `BACKUP_RETENTION_MONTHLY`
- `BACKUP_RUN_ON_STARTUP`
- `BACKUP_REMOTE_MODE`
- `BACKUP_REMOTE_TIMEOUT_SECONDS`
- `REMOTE_RSYNC_HOST`
- `REMOTE_RSYNC_USER`
- `REMOTE_RSYNC_PATH`
- `REMOTE_RSYNC_PORT`
- `REMOTE_SSH_KEY_MOUNT`
- `REMOTE_SSH_KEY_PATH`
- `REMOTE_SSH_STRICT_HOST_KEY_CHECKING`
- `REMOTE_FTP_HOST`
- `REMOTE_FTP_PORT`
- `REMOTE_FTP_USER`
- `REMOTE_FTP_PASSWORD`
- `REMOTE_FTP_PATH`
- `REMOTE_FTP_SSL`
- `REMOTE_FTP_VERIFY_CERT`

## Minimal Doppler workflow

```bash
# authenticate once
 doppler login

# select project/config
 doppler setup --project group-trip-planner --config dev

# verify you can read secrets from Doppler
 doppler secrets download --no-file --format env | head

# run whole stack with injected secrets
 doppler run -- docker compose up -d

# run frontend/backend locally with same source
 doppler run -- npm --prefix frontend run dev
 doppler run -- bash -lc 'source ~/miniconda3/etc/profile.d/conda.sh && conda activate gtp && cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload'
```

## Notes

- `frontend/vite.config.ts` is configured with `envDir: ".."` and consumes env injected by `doppler run`.
- `apps/stripe-service`, `apps/contact-service`, and backend settings consume process env directly (no dotenv file loading).
- Rotate any previously committed secrets before production rollout.
