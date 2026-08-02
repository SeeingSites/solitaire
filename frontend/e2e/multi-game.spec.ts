import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  watchDemoButton,
  stopDemoButton,
  getStockCount,
  getFoundationCardCount,
  getMoveCount,
  getTotalVisibleCards,
  setupConsoleTracking,
  newGame,
  playDemoUntilDone,
} from "./helpers";

test.describe("Multi-Game Stress Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("play 5 complete games via demo mode", async ({ page }) => {
    test.setTimeout(600_000);
    const results: string[] = [];

    for (let game = 0; game < 5; game++) {
      const result = await playDemoUntilDone(page, 120_000);
      results.push(result);

      if (result === "won") {
        const playAgain = page.getByRole("button", { name: "Play Again" });
        if (await playAgain.isVisible().catch(() => false)) {
          await playAgain.click();
        } else {
          await newGame(page);
        }
      } else {
        await newGame(page);
      }
      await page.waitForTimeout(300);
    }

    expect(results.length).toBe(5);
    for (const r of results) {
      expect(["won", "stalemate", "timeout"]).toContain(r);
    }
  });

  test("no console errors across 3 games", async ({ page }) => {
    const console = setupConsoleTracking(page);

    for (let game = 0; game < 3; game++) {
      await watchDemoButton(page).click();
      await page.waitForTimeout(3000);
      await stopDemoButton(page).click().catch(() => {});
      await page.waitForTimeout(300);

      await newGame(page);
      await page.waitForTimeout(300);
    }

    console.cleanup();

    const criticalErrors = console.errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("net::ERR") &&
        !e.includes("ResizeObserver"),
    );
    expect(criticalErrors).toEqual([]);
  });

  test("stock count is always 24 at game start", async ({ page }) => {
    for (let game = 0; game < 3; game++) {
      await newGame(page);
      await page.waitForTimeout(200);
      expect(await getStockCount(page)).toBe(24);
    }
  });

  test("total visible cards is always 52", async ({ page }) => {
    for (let game = 0; game < 3; game++) {
      const total = await getTotalVisibleCards(page);
      expect(total).toBe(52);

      await watchDemoButton(page).click();
      await page.waitForTimeout(2000);
      await stopDemoButton(page).click().catch(() => {});
      await page.waitForTimeout(300);

      const totalAfter = await getTotalVisibleCards(page);
      expect(totalAfter).toBe(52);

      await newGame(page);
      await page.waitForTimeout(200);
    }
  });

  test("foundation count is monotonically non-decreasing during demo", async ({ page }) => {
    let prevFoundation = 0;

    await watchDemoButton(page).click();

    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      const current = await getFoundationCardCount(page);
      expect(current).toBeGreaterThanOrEqual(prevFoundation);
      prevFoundation = current;

      const stopVisible = await stopDemoButton(page).isVisible().catch(() => false);
      if (!stopVisible) break;
    }

    await stopDemoButton(page).click().catch(() => {});
  });

  test("move count resets on new game", async ({ page }) => {
    await watchDemoButton(page).click();
    await page.waitForTimeout(3000);
    await stopDemoButton(page).click().catch(() => {});
    await page.waitForTimeout(300);

    const movesBefore = await getMoveCount(page);
    expect(movesBefore).toBeGreaterThan(0);

    await newGame(page);
    await page.waitForTimeout(200);

    expect(await getMoveCount(page)).toBe(0);
  });

  test("rapid new-game clicks do not break state", async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.getByRole("button", { name: "New Game" }).click();
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(500);

    expect(await getStockCount(page)).toBe(24);
    expect(await getTotalVisibleCards(page)).toBe(52);
    await expect(page.getByText(/Moves:\s*0/)).toBeVisible();
  });

  test("DOM node count stays bounded across games", async ({ page }) => {
    const nodeCounts: number[] = [];

    for (let game = 0; game < 3; game++) {
      await watchDemoButton(page).click();
      await page.waitForTimeout(3000);
      await stopDemoButton(page).click().catch(() => {});
      await page.waitForTimeout(300);

      const nodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
      nodeCounts.push(nodeCount);

      await newGame(page);
      await page.waitForTimeout(300);
    }

    const first = nodeCounts[0];
    const last = nodeCounts[nodeCounts.length - 1];
    expect(last).toBeLessThan(first * 1.5);
  });
});
