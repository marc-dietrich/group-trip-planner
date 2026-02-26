# Stripe Service

Minimal Stripe payment microservice.

## Endpoints

- `POST /create-checkout-session` with body `{ "amount": number }` where amount is in EUR
- `POST /webhook` for Stripe webhook events
- `GET /health`

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
