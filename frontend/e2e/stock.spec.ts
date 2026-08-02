import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  stockPile,
  getStockCount,
  getWasteCount,
  drawFromStock,
  wasteCard,
  statusText,
} from "./helpers";

test.describe("Stock Pile Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("click stock draws one card", async ({ page }) => {
    await stockPile(page).click();
    await page.waitForTimeout(100);

    expect(await getStockCount(page)).toBe(23);
    expect(await getWasteCount(page)).toBe(1);
    await expect(statusText(page)).toContainText("Waste: 1");
  });

  test("click stock 3 times draws 3 cards", async ({ page }) => {
    await drawFromStock(page, 3);

    expect(await getStockCount(page)).toBe(21);
    expect(await getWasteCount(page)).toBe(3);
  });

  test("drawn card is face-up in waste", async ({ page }) => {
    await stockPile(page).click();
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    await expect(card).toBeVisible();
    const text = await card.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("draw all 24 stock cards", async ({ page }) => {
    await drawFromStock(page, 24);
    await page.waitForTimeout(200);

    expect(await getStockCount(page)).toBe(0);
    expect(await getWasteCount(page)).toBe(24);
    await expect(page.getByText("Empty")).toBeVisible();
  });

  test("empty stock reshuffles waste", async ({ page }) => {
    await drawFromStock(page, 24);
    await page.waitForTimeout(200);
    expect(await getStockCount(page)).toBe(0);

    await stockPile(page).click();
    await page.waitForTimeout(300);

    const stockAfter = await getStockCount(page);
    expect(stockAfter).toBeGreaterThan(0);
  });

  test("full cycle: draw all, reshuffle, draw again", async ({ page }) => {
    await drawFromStock(page, 24);
    await page.waitForTimeout(200);
    expect(await getStockCount(page)).toBe(0);

    await stockPile(page).click();
    await page.waitForTimeout(300);
    const stockAfterReshuffle = await getStockCount(page);
    expect(stockAfterReshuffle).toBeGreaterThan(0);

    await stockPile(page).click();
    await page.waitForTimeout(100);
    expect(await getStockCount(page)).toBe(stockAfterReshuffle - 1);
  });
});
