import express from "express";
import Stripe from "stripe";

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
const appBaseUrl = (process.env.APP_BASE_URL || allowedOrigin || "").trim();
const supporterApiBase = (
  process.env.SUPPORTER_API_BASE_URL || "http://localhost:8000"
).trim();
const supporterWebhookSecret = (
  process.env.SUPPORTER_WEBHOOK_SECRET || ""
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

function buildSuccessUrl(rawUrl, sessionIdPlaceholder = true) {
  const url = new URL(rawUrl);
  if (!url.searchParams.has("session_id") && sessionIdPlaceholder) {
    url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  }
  if (!url.searchParams.has("source")) {
    url.searchParams.set("source", "stripe");
  }
  return url.toString();
}

function renderSupporterThanksPage({ actorName = "Supporter", appUrl = "/" }) {
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Danke für deinen Support</title>
    <style>
      :root {
        color-scheme: dark;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        background: radial-gradient(circle at 20% 20%, #1f2937 0%, #0f172a 45%, #020617 100%);
        color: #f8fafc;
      }
      .card {
        width: min(92vw, 420px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(10px);
        padding: 28px 22px 24px;
        text-align: center;
        box-shadow: 0 20px 50px rgba(0,0,0,0.4);
      }
      .scene {
        position: relative;
        width: 92px;
        height: 92px;
        margin: 4px auto 20px;
      }
      .mic {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: linear-gradient(145deg, #3b82f6, #2563eb);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 12px 24px rgba(37,99,235,0.45);
        font-size: 40px;
      }
      .crown {
        position: absolute;
        left: 50%;
        top: -24px;
        transform: translate(-50%, -70px);
        font-size: 28px;
        filter: drop-shadow(0 8px 10px rgba(0,0,0,0.35));
        animation: crown-drop 1000ms cubic-bezier(.2,.8,.2,1) 250ms forwards;
      }
      @keyframes crown-drop {
        0% { transform: translate(-50%, -70px) scale(0.9); opacity: 0; }
        65% { transform: translate(-50%, 4px) scale(1.02); opacity: 1; }
        80% { transform: translate(-50%, -2px) scale(0.99); }
        100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
      }
      h1 {
        margin: 0;
        font-size: 1.35rem;
        line-height: 1.25;
      }
      p {
        margin: 10px 0 0;
        color: #cbd5e1;
        font-size: 0.95rem;
      }
      .cta {
        margin-top: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.2);
        color: #f8fafc;
        text-decoration: none;
        padding: 9px 16px;
        font-weight: 600;
        background: rgba(255,255,255,0.08);
      }
      .cta:hover {
        background: rgba(255,255,255,0.15);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="scene" aria-hidden="true">
        <div class="mic">🎤</div>
        <div class="crown">👑</div>
      </div>
      <h1>Danke für deinen Support, ${actorName}!</h1>
      <p>Dein Beitrag hilft uns, Speech/Voice-Features schneller auszurollen.</p>
      <a class="cta" href="${appUrl}">Zurück zur App</a>
    </main>
  </body>
</html>`;
}

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

    const successUrl = buildSuccessUrl(process.env.CHECKOUT_SUCCESS_URL);

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
      success_url: successUrl,
      cancel_url: process.env.CHECKOUT_CANCEL_URL,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return next(error);
  }
});

app.get("/supporter/thanks", (req, res) => {
  const actorName =
    typeof req.query.actor_name === "string" && req.query.actor_name.trim()
      ? req.query.actor_name.trim().slice(0, 60)
      : "Supporter";

  const appUrl = appBaseUrl && appBaseUrl !== "*" ? appBaseUrl : "/";
  return res
    .status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .send(renderSupporterThanksPage({ actorName, appUrl }));
});

app.get("/success", (req, res) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  return res.redirect(`/supporter/thanks${query ? `?${query}` : ""}`);
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
