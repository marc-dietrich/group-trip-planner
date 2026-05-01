import { test, expect, type Frame, type Page } from "@playwright/test";

const appBase = (
  process.env.E2E_BASE_URL || "http://localhost/group-trip-planner/"
).trim();
const healthUrl = new URL("api/health", appBase).toString();
const stripeE2EEnabled = process.env.STRIPE_E2E === "true";

const cardNumberCandidates = [
  'input[name="cardNumber"]',
  'input[name="cardnumber"]',
  'input[autocomplete="cc-number"]',
  'input[placeholder*="1234"]',
  'input[data-elements-stable-field-name="cardNumber"]',
];

const expiryCandidates = [
  'input[name="cardExpiry"]',
  'input[name="exp-date"]',
  'input[autocomplete="cc-exp"]',
  'input[placeholder*="MM"]',
  'input[data-elements-stable-field-name="cardExpiry"]',
];

const cvcCandidates = [
  'input[name="cardCvc"]',
  'input[name="cvc"]',
  'input[autocomplete="cc-csc"]',
  'input[placeholder*="CVC"]',
  'input[placeholder*="Sicherheitscode"]',
  'input[data-elements-stable-field-name="cardCvc"]',
];

const emailCandidates = [
  'input[type="email"]',
  'input[name="email"]',
  'input[autocomplete="email"]',
  'input[placeholder*="email"]',
  'input[placeholder*="Email"]',
];

async function fillInVisibleField(
  page: Page,
  selectors: string[],
  value: string,
): Promise<boolean> {
  const allFrames = page.frames();
  for (const frame of allFrames) {
    for (const selector of selectors) {
      const locator = frame.locator(selector).first();
      const count = await locator.count();
      if (!count) continue;
      const isVisible = await locator.isVisible().catch(() => false);
      if (!isVisible) continue;
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

async function findVisibleFrameBySelectors(
  page: Page,
  selectors: string[],
): Promise<Frame | null> {
  for (const frame of page.frames()) {
    for (const selector of selectors) {
      const locator = frame.locator(selector).first();
      const count = await locator.count();
      if (!count) continue;
      const isVisible = await locator.isVisible().catch(() => false);
      if (isVisible) return frame;
    }
  }
  return null;
}

test.describe("stripe donation checkout", () => {
  test("spendet via Stripe Sandbox und navigiert mit Weiter zurück zur Startseite", async ({
    page,
    request,
  }) => {
    test.skip(
      !stripeE2EEnabled,
      "Setze STRIPE_E2E=true, um den echten Stripe-Sandbox-Test auszuführen.",
    );

    test.setTimeout(180_000);

    const healthResponse = await request.get(healthUrl).catch(() => null);
    test.skip(
      !healthResponse || !healthResponse.ok(),
      `Lokaler Stack nicht erreichbar (${healthUrl}). Starte zuerst Caddy/Backend/Stripe.`,
    );

    await page.addInitScript(() => {
      const actor = {
        actorId: "e2e-stripe-actor",
        displayName: "E2E Tester",
      };
      window.localStorage.setItem("gtp.localActor", JSON.stringify(actor));
    });

    const groupsUrl = new URL("groups", appBase).toString();
    await page.goto(groupsUrl, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Menü" }).click();
    await page.getByRole("button", { name: "Supporter werden" }).click();
    await page.getByRole("button", { name: "5 €" }).click();

    await expect
      .poll(() => page.url(), { timeout: 30_000 })
      .toContain("checkout.stripe.com");

    await expect
      .poll(
        async () =>
          (await findVisibleFrameBySelectors(page, emailCandidates))
            ? "ready"
            : "waiting",
        { timeout: 30_000 },
      )
      .toBe("ready");

    const hasEmailField = await fillInVisibleField(
      page,
      emailCandidates,
      "e2e.stripe@example.com",
    );
    if (!hasEmailField) {
      throw new Error("Stripe E-Mail-Feld wurde nicht gefunden.");
    }

    await expect
      .poll(
        async () =>
          (await findVisibleFrameBySelectors(page, cardNumberCandidates))
            ? "ready"
            : "waiting",
        { timeout: 30_000 },
      )
      .toBe("ready");

    const hasCardField = await fillInVisibleField(
      page,
      cardNumberCandidates,
      "4242 4242 4242 4242",
    );
    if (!hasCardField) {
      throw new Error("Stripe card iframe wurde nicht gefunden.");
    }

    const hasExpiryField = await fillInVisibleField(
      page,
      expiryCandidates,
      "12 / 34",
    );
    if (!hasExpiryField) {
      throw new Error("Stripe Ablaufdatum-Feld wurde nicht gefunden.");
    }

    const hasCvcField = await fillInVisibleField(page, cvcCandidates, "123");
    if (!hasCvcField) {
      throw new Error("Stripe CVC-Feld wurde nicht gefunden.");
    }

    const nameField = page
      .locator(
        'input[name="billingName"], input[autocomplete="cc-name"], input[placeholder*="Name"]',
      )
      .first();
    if ((await nameField.count()) > 0) {
      await nameField.fill("E2E Tester");
    }

    const paymentButton = page
      .getByRole("button", {
        name: /Zahlen|Bezahlen|Pay|Spenden|Donate|Jetzt zahlen/i,
      })
      .first();
    await paymentButton.click();

    await expect
      .poll(() => page.url(), { timeout: 180_000 })
      .toMatch(/supporter\/thanks|\/success(?:\?|$)/);

    if (!/supporter\/thanks/.test(page.url())) {
      await expect
        .poll(() => page.url(), { timeout: 30_000 })
        .toContain("supporter/thanks");
    }

    await expect(
      page.getByRole("link", { name: /^Weiter\s*→?$/ }),
    ).toBeVisible();
    await page.getByRole("link", { name: /^Weiter\s*→?$/ }).click();

    await expect
      .poll(() => page.url(), { timeout: 15_000 })
      .toMatch(/\/(group-trip-planner\/)?groups(?:\?|$)/);
  });
});
