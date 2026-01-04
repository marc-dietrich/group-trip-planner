import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/__dialog-sandbox";

const viewports = [
  { name: "mobile-portrait", width: 375, height: 667 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test.describe(`availability dialog @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("start/end have same size and no scroll", async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByRole("button", { name: "+ Hinzufügen" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const card = dialog.locator("> div").first();
      const sizes: Record<string, number> = {};

      const recordSizeAndScroll = async (label: string) => {
        const box = await card.boundingBox();
        expect(box).not.toBeNull();
        sizes[label] = box!.height;

        const hasOverflow = await card.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
        expect(hasOverflow, "card should not scroll internally").toBeFalsy();

        const pageOverflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollHeight > doc.clientHeight + 1;
        });
        expect(pageOverflow, "page should not scroll").toBeFalsy();
      };

      await recordSizeAndScroll("start");

      const firstDay = dialog
        .locator(".grid button:not(:disabled)")
        .filter({ hasText: /^\d+$/ })
        .first();
      await firstDay.click();
      await expect(dialog.getByText(/Enddatum/i)).toBeVisible();
      await recordSizeAndScroll("end");

      const endDay = dialog
        .locator(".grid button:not(:disabled)")
        .filter({ hasText: /^\d+$/ })
        .first();
      await endDay.click();
      await expect(dialog.getByText(/Prüfen/i)).toBeVisible();
      await recordSizeAndScroll("review");

      expect(sizes.start).toBeDefined();
      expect(sizes.end).toBeDefined();
      const diff = Math.abs((sizes.start ?? 0) - (sizes.end ?? 0));
      expect(diff).toBeLessThanOrEqual(4);
    });
  });
}
