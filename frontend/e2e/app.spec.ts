import { test, expect } from "@playwright/test";
import {
  newGameButton,
  expectInitialState,
  newGame,
  getStockCount,
  getMoveCount,
} from "./helpers";

test.describe("App Shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("loads with correct title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Solitaire" })).toBeVisible();
  });

  test("footer shows game name", async ({ page }) => {
    await expect(page.getByText("Classic Klondike Solitaire")).toBeVisible();
  });

  test("theme toggle switches dark to light", async ({ page }) => {
    const toggle = page.getByTitle(/Switch to/);
    await expect(toggle).toBeVisible();

    // Should start in dark mode (bg-gray-900)
    const root = page.locator("div.min-h-screen");
    await expect(root).toHaveClass(/bg-gray-900/);

    await toggle.click();

    // Should now be light mode (bg-gray-100)
    await expect(root).toHaveClass(/bg-gray-100/);
  });

  test("theme toggle switches light to dark (round-trip)", async ({ page }) => {
    const toggle = page.getByTitle(/Switch to/);
    const root = page.locator("div.min-h-screen");

    // dark -> light -> dark
    await toggle.click();
    await expect(root).toHaveClass(/bg-gray-100/);

    await toggle.click();
    await expect(root).toHaveClass(/bg-gray-900/);
  });

  test("New Game button resets state", async ({ page }) => {
    // Draw a few cards to change state
    await page.locator(".bg-gradient-to-br.from-blue-800").first().click();
    await page.locator(".bg-gradient-to-br.from-blue-800").first().click();
    await page.waitForTimeout(100);

    const stockAfterDraw = await getStockCount(page);
    expect(stockAfterDraw).toBeLessThan(24);

    // Click New Game
    await newGameButton(page).click();
    await page.waitForTimeout(200);

    // State should be reset
    await expect(page.getByText(/Moves:\s*0/)).toBeVisible();
    const stockAfterReset = await getStockCount(page);
    expect(stockAfterReset).toBe(24);
  });
});
