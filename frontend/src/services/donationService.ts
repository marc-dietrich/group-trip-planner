const rawStripeBase = (import.meta.env.VITE_STRIPE_BASE_URL ?? "").trim();
const stripeBase = rawStripeBase.endsWith("/")
  ? rawStripeBase.slice(0, -1)
  : rawStripeBase;

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
): Promise<string> {
  const res = await fetch(stripePath("/create-checkout-session"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountInEur }),
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
