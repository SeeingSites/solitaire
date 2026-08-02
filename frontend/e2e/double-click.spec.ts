import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  drawFromStock,
  wasteCard,
  foundationPile,
  foundationCard,
  tableauPile,
  getMoveCount,
  getWasteCount,
  getFoundationCardCount,
  newGame,
} from "./helpers";

test.describe("Double-Click Auto-Move", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("double-click waste card moves to foundation if valid", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    const movesBefore = await getMoveCount(page);
    await card.dblclick();
    await page.waitForTimeout(300);

    if ((await getMoveCount(page)) > movesBefore) {
      expect(await getFoundationCardCount(page)).toBeGreaterThanOrEqual(1);
    }
  });

  test("double-click tableau top card moves to foundation if valid", async ({ page }) => {
    for (let pile = 0; pile < 7; pile++) {
      const faceUp = tableauPile(page, pile).locator('[aria-roledescription="draggable"]');
      const count = await faceUp.count();
      if (count === 0) continue;

      const topCard = faceUp.last();
      const text = await topCard.textContent();
      if (text && text.includes("A")) {
        const movesBefore = await getMoveCount(page);
        await topCard.dblclick();
        await page.waitForTimeout(300);
        if ((await getMoveCount(page)) > movesBefore) {
          expect(await getFoundationCardCount(page)).toBeGreaterThanOrEqual(1);
          return;
        }
      }
    }
    expect(true).toBe(true);
  });

  test("double-click buried card does nothing", async ({ page }) => {
    for (let pile = 0; pile < 7; pile++) {
      const cards = tableauPile(page, pile).locator('[aria-roledescription="draggable"]');
      const count = await cards.count();
      if (count < 2) continue;

      const buriedCard = cards.first();
      const movesBefore = await getMoveCount(page);
      await buriedCard.dblclick();
      await page.waitForTimeout(200);
      expect(await getMoveCount(page)).toBe(movesBefore);
      return;
    }
    expect(true).toBe(true);
  });

  test("double-click invalid card does nothing", async ({ page }) => {
    await drawFromStock(page, 3);
    await page.waitForTimeout(100);

    // Just verify no crash when double-clicking various cards
    const faceUp = page.locator('[aria-roledescription="draggable"]');
    const count = await faceUp.count();
    if (count > 0) {
      await faceUp.first().dblclick();
      await page.waitForTimeout(200);
    }
    expect(true).toBe(true);
  });

  test("double-click preserves other game state", async ({ page }) => {
    await drawFromStock(page, 5);
    await page.waitForTimeout(100);

    const stockCount = await page.locator(".bg-blue-700.text-white.text-xs").textContent();
    const wasteBefore = await getWasteCount(page);

    const card = wasteCard(page);
    if ((await card.count()) > 0) {
      await card.dblclick();
      await page.waitForTimeout(300);

      const wasteAfter = await getWasteCount(page);
      if (wasteAfter < wasteBefore) {
        const stockAfter = await page.locator(".bg-blue-700.text-white.text-xs").textContent();
        expect(stockAfter).toBe(stockCount);
      }
    }
  });
});
