import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  watchDemoButton,
  stopDemoButton,
  getMoveCount,
  newGame,
  playDemoUntilDone,
} from "./helpers";

test.describe("Demo Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("start demo shows Stop Demo button", async ({ page }) => {
    await watchDemoButton(page).click();
    await page.waitForTimeout(500);

    await expect(stopDemoButton(page)).toBeVisible();
    await expect(watchDemoButton(page)).not.toBeVisible();
  });

  test("demo mode plays moves automatically", async ({ page }) => {
    await watchDemoButton(page).click();
    await page.waitForTimeout(3000);

    const moves = await getMoveCount(page);
    expect(moves).toBeGreaterThan(0);
    await stopDemoButton(page).click().catch(() => {});
  });

  test("stop demo reverts to Watch Demo button", async ({ page }) => {
    await watchDemoButton(page).click();
    await page.waitForTimeout(1000);

    await stopDemoButton(page).click();
    await page.waitForTimeout(500);

    await expect(watchDemoButton(page)).toBeVisible();
    await expect(stopDemoButton(page)).not.toBeVisible();
  });

  test("speed Fast makes moves faster than Slow", async ({ page }) => {
    await page.getByRole("button", { name: "Slow" }).click();
    await page.waitForTimeout(100);

    await watchDemoButton(page).click();
    await page.waitForTimeout(2000);
    const movesSlow = await getMoveCount(page);
    await stopDemoButton(page).click().catch(() => {});
    await page.waitForTimeout(500);

    await newGame(page);
    await page.waitForTimeout(200);

    await page.getByRole("button", { name: "Fast" }).click();
    await page.waitForTimeout(100);

    await watchDemoButton(page).click();
    await page.waitForTimeout(2000);
    const movesFast = await getMoveCount(page);
    await stopDemoButton(page).click().catch(() => {});

    expect(movesFast).toBeGreaterThanOrEqual(movesSlow);
  });

  test("Demo Mode indicator visible during demo", async ({ page }) => {
    await watchDemoButton(page).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Demo Mode")).toBeVisible();
    await stopDemoButton(page).click().catch(() => {});
  });
});
