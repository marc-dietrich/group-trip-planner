import dotenv from "dotenv";
import express from "express";
import Stripe from "stripe";

dotenv.config();

const requiredEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CHECKOUT_SUCCESS_URL",
  "CHECKOUT_CANCEL_URL",
];

const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const supporterApiBase = (
  process.env.SUPPORTER_API_BASE_URL || "http://localhost:8000"
).trim();
const supporterWebhookSecret = (
  process.env.SUPPORTER_WEBHOOK_SECRET || "dev-supporter-secret"
).trim();

async function grantSupporterBadge({ actorId, completedAt }) {
  if (!supporterApiBase || !supporterWebhookSecret || !actorId) {
    return;
  }

  const base = supporterApiBase.endsWith("/")
    ? supporterApiBase.slice(0, -1)
    : supporterApiBase;
  const endpoint = `${base}/api/actors/${encodeURIComponent(actorId)}/supporter/grant`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Supporter-Secret": supporterWebhookSecret,
    },
    body: JSON.stringify({
      donatedAt: completedAt,
      durationDays: 183,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supporter grant failed (${response.status}): ${body}`);
  }
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Stripe-Signature",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`,
    );
  });
  next();
});

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        return res
          .status(400)
          .json({ error: "Missing Stripe signature header" });
      }

      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log(
          `Payment successful: session=${session.id} amount_total=${session.amount_total} currency=${session.currency}`,
        );

        const actorId = session.metadata?.actor_id;
        const completedAt =
          typeof session.created === "number"
            ? new Date(session.created * 1000).toISOString()
            : new Date().toISOString();

        if (actorId && supporterApiBase && supporterWebhookSecret) {
          try {
            await grantSupporterBadge({ actorId, completedAt });
            console.log(
              `Supporter badge granted: actor=${actorId} until +183d`,
            );
          } catch (grantError) {
            console.error("Supporter grant call failed:", grantError);
          }
        }
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      return next(error);
    }
  },
);

app.use(express.json());

app.post("/create-checkout-session", async (req, res, next) => {
  try {
    const { amount, actorId, userId } = req.body;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ error: "amount must be a number greater than 0" });
    }

    if (typeof actorId !== "string" || actorId.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "actorId must be a non-empty string" });
    }

    const unitAmount = Math.round(amount * 100);
    if (unitAmount <= 0) {
      return res.status(400).json({ error: "amount must be greater than 0" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "paypal"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: unitAmount,
            product_data: {
              name: "Donation",
            },
          },
        },
      ],
      metadata: {
        actor_id: actorId.trim(),
        user_id: typeof userId === "string" ? userId : "",
      },
      success_url: process.env.CHECKOUT_SUCCESS_URL,
      cancel_url: process.env.CHECKOUT_CANCEL_URL,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return next(error);
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((error, req, res, next) => {
  const isStripeSignatureError =
    error?.type === "StripeSignatureVerificationError";
  if (isStripeSignatureError) {
    return res.status(400).json({ error: "Invalid Stripe signature" });
  }

  const isStripeAuthError = error?.type === "StripeAuthenticationError";
  if (isStripeAuthError) {
    return res.status(502).json({
      error:
        "Stripe authentication failed. Please verify STRIPE_SECRET_KEY on the stripe service.",
    });
  }

  const isStripeRequestError = error?.type === "StripeInvalidRequestError";
  if (isStripeRequestError) {
    return res.status(400).json({
      error:
        "Stripe rejected the request. Please verify amount and checkout URLs.",
    });
  }

  console.error("Unhandled error:", error);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Stripe service listening on port ${port}`);
});
