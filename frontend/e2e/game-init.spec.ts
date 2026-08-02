import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  getStockCount,
  getWasteCount,
  getFoundationCardCount,
  getTableauCardCount,
  getTotalVisibleCards,
  tableauPile,
  foundationPile,
  wastePile,
  statusText,
} from "./helpers";

test.describe("Game Initialization", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("new game deals 7 tableau piles", async ({ page }) => {
    const tableauContainer = page.locator(".flex.justify-center.gap-2").last();
    const pileCount = await tableauContainer.locator("> div").count();
    expect(pileCount).toBe(7);
  });

  test("stock starts with 24 cards", async ({ page }) => {
    expect(await getStockCount(page)).toBe(24);
  });

  test("waste starts empty", async ({ page }) => {
    expect(await getWasteCount(page)).toBe(0);
    await expect(wastePile(page)).toContainText("Waste");
  });

  test("foundations start empty with suit symbols", async ({ page }) => {
    const suitSymbols = ["♥", "♦", "♣", "♠"];
    for (let i = 0; i < 4; i++) {
      await expect(foundationPile(page, i)).toContainText(suitSymbols[i]);
    }
  });

  test("status bar shows initial state", async ({ page }) => {
    await expect(statusText(page)).toContainText("Moves: 0");
    await expect(statusText(page)).toContainText("Stock: 24");
    await expect(statusText(page)).toContainText("Waste: 0");
  });

  test("total visible cards is 52", async ({ page }) => {
    const total = await getTotalVisibleCards(page);
    expect(total).toBe(52);
  });
});
