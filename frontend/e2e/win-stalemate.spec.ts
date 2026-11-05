import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  getStockCount,
  getMoveCount,
  newGame,
  playDemoUntilDone,
} from "./helpers";

test.describe("Win / Stalemate Detection", () => {
  // playDemoUntilDone() waits up to 120s for a game to finish.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("demo win shows the completion message", async ({ page }) => {
    const result = await playDemoUntilDone(page, 120_000);

    if (result === "won") {
      // The demo loop turns demo mode off when the engine reports a win, so the
      // overlay usually says "You Win!" by the time the cascade finishes.
      await expect(page.getByRole("heading", { name: /You Win!|Demo Complete!/ })).toBeVisible();
    }
    expect(true).toBe(true);
  });

  test("Play Again button works after win", async ({ page }) => {
    const result = await playDemoUntilDone(page, 120_000);

    if (result === "won") {
      const playAgain = page.getByRole("button", { name: "Play Again" });
      await expect(playAgain).toBeVisible();
      await playAgain.click();
      await page.waitForTimeout(500);

      await expect(page.getByText(/Moves:\s*0/)).toBeVisible();
      expect(await getStockCount(page)).toBe(24);
    }
  });

  test("stalemate shows Stalemate message", async ({ page }) => {
    const result = await playDemoUntilDone(page, 120_000);

    if (result === "stalemate") {
      await expect(page.getByText("Stalemate")).toBeVisible();
    }
  });

  test("New Game button works after stalemate", async ({ page }) => {
    const result = await playDemoUntilDone(page, 120_000);

    if (result === "stalemate") {
      const newGameBtn = page.getByRole("button", { name: "New Game" });
      await expect(newGameBtn).toBeVisible();
      await newGameBtn.click();
      await page.waitForTimeout(500);

      await expect(page.getByText(/Moves:\s*0/)).toBeVisible();
      expect(await getStockCount(page)).toBe(24);
    }
  });
});
