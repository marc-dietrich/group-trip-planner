# Stripe Service

Minimal Stripe payment microservice.

## Endpoints

- `POST /create-checkout-session` with body `{ "amount": number, "actorId": string, "userId"?: string }` where amount is in EUR
- `POST /webhook` for Stripe webhook events
- `GET /health`

## Environment Variables

- `STRIPE_SECRET_KEY` (required)
- `STRIPE_WEBHOOK_SECRET` (required)
- `CHECKOUT_SUCCESS_URL` (required)
- `CHECKOUT_CANCEL_URL` (required)
- Optional: `ALLOWED_ORIGIN` (fallback `*`)
- Optional: `PORT` (fallback `3000`)
- Optional: `SUPPORTER_API_BASE_URL` (e.g. `http://localhost:8000`, used after successful webhook)
- Optional: `SUPPORTER_WEBHOOK_SECRET` (must match backend `SUPPORTER_WEBHOOK_SECRET`)

## Local run

```bash
npm install
npm start
```

## Docker

```bash
docker build -t stripe-service .
docker run --rm -p 3000:3000 --env-file .env stripe-service
```
