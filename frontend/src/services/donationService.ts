const localhostHosts = new Set(["localhost", "127.0.0.1"]);

function resolveStripeBase(rawBase: string): string {
  const trimmed = rawBase.trim();
  if (!trimmed) return "";
  const normalized = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;

  if (typeof window === "undefined") {
    return normalized;
  }

  try {
    const candidate = new URL(normalized, window.location.origin);
    const envHostIsLocal = localhostHosts.has(candidate.hostname);
    const windowHostIsLocal = localhostHosts.has(window.location.hostname);
    const localHostMismatch =
      envHostIsLocal &&
      windowHostIsLocal &&
      candidate.hostname !== window.location.hostname;

    if ((envHostIsLocal && !windowHostIsLocal) || localHostMismatch) {
      return "";
    }
  } catch {
    return "";
  }

  return normalized;
}

const rawStripeBase = (import.meta.env.VITE_STRIPE_BASE_URL ?? "").trim();
const stripeBase = resolveStripeBase(rawStripeBase);

function stripePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${stripeBase}${normalized}`;
}

type CreateCheckoutResponse = {
  url?: string;
  error?: string;
};

export async function createDonationCheckoutSession(
  amountInEur: number,
  actorId: string,
  userId?: string,
): Promise<string> {
  const res = await fetch(stripePath("/create-checkout-session"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountInEur, actorId, userId }),
  });

  if (!res.ok) {
    let details = `Stripe checkout failed: ${res.status}`;
    try {
      const body = (await res.json()) as CreateCheckoutResponse;
      if (body?.error) {
        details = body.error;
      }
    } catch {
      // ignore json parse issues
    }

    throw new Error(details);
  }

  const data = (await res.json()) as CreateCheckoutResponse;

  if (!data.url) {
    throw new Error("Stripe checkout URL missing");
  }

  return data.url;
}
