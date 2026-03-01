# Stripe Service

Minimal Stripe payment microservice.

## Endpoints

- `POST /create-checkout-session` with body `{ "amount": number, "actorId": string, "userId"?: string }` where amount is in EUR
- `POST /webhook` for Stripe webhook events
- `GET /supporter/thanks` tiny thank-you page (with crown-drop animation)
- `GET /success` redirect helper to `/supporter/thanks`
- `GET /health`

## Environment Variables

- `STRIPE_SECRET_KEY` (required)
- `STRIPE_WEBHOOK_SECRET` (required)
- `CHECKOUT_SUCCESS_URL` (required)
- `CHECKOUT_CANCEL_URL` (required)
- Optional: `ALLOWED_ORIGIN` (fallback `*`)
- Optional: `APP_BASE_URL` (link target on thank-you page, e.g. `http://localhost:5173`)
- Optional: `PORT` (fallback `3000`)
- Optional: `SUPPORTER_API_BASE_URL` (e.g. `http://localhost:8000`, used after successful webhook)
- Optional: `SUPPORTER_WEBHOOK_SECRET` (must match backend `SUPPORTER_WEBHOOK_SECRET`)

## Redirect setup (recommended)

Set Stripe checkout success URL to the stripe-service page:

`CHECKOUT_SUCCESS_URL=http://localhost:3001/supporter/thanks`

After successful payment, Stripe redirects the user there and the page shows a short thank-you animation.

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
