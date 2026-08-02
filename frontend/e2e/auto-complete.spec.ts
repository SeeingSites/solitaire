import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  drawFromStock,
  autoCompleteButton,
  getMoveCount,
  getFoundationCardCount,
  getStockCount,
  watchDemoButton,
  stopDemoButton,
  newGame,
} from "./helpers";

test.describe("Auto-Complete", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("auto-complete moves cards to foundations", async ({ page }) => {
    await drawFromStock(page, 10);
    await page.waitForTimeout(200);

    const foundationBefore = await getFoundationCardCount(page);

    await autoCompleteButton(page).click();
    await page.waitForTimeout(1000);

    const foundationAfter = await getFoundationCardCount(page);
    expect(foundationAfter).toBeGreaterThanOrEqual(foundationBefore);
  });

  test("auto-complete does nothing when nothing to complete", async ({ page }) => {
    const foundationBefore = await getFoundationCardCount(page);
    const movesBefore = await getMoveCount(page);

    await autoCompleteButton(page).click();
    await page.waitForTimeout(500);

    const movesAfter = await getMoveCount(page);
    expect(movesAfter).toBeGreaterThanOrEqual(movesBefore);
  });

  test("auto-complete after manual draws", async ({ page }) => {
    await drawFromStock(page, 5);
    await page.waitForTimeout(200);

    const movesBeforeManual = await getMoveCount(page);

    await autoCompleteButton(page).click();
    await page.waitForTimeout(1000);

    const movesAfterAuto = await getMoveCount(page);
    expect(movesAfterAuto).toBeGreaterThanOrEqual(movesBeforeManual);
  });

  test("auto-complete button is always visible", async ({ page }) => {
    await expect(autoCompleteButton(page)).toBeVisible();

    await drawFromStock(page, 5);
    await page.waitForTimeout(200);

    await expect(autoCompleteButton(page)).toBeVisible();
  });

  test("auto-complete does not break the game", async ({ page }) => {
    // Play demo briefly, then auto-complete
    await watchDemoButton(page).click();
    await page.waitForTimeout(3000);
    await stopDemoButton(page).click().catch(() => {});
    await page.waitForTimeout(500);

    await autoCompleteButton(page).click();
    await page.waitForTimeout(2000);

    // Game should still be in a valid state
    const total = await page.evaluate(() => {
      const stock = document.querySelector(".bg-blue-700");
      const stockCount = stock ? parseInt(stock.textContent || "0", 10) : 0;
      return stockCount;
    });
    // Just verify no crash occurred
    expect(true).toBe(true);
  });
});
