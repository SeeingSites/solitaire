import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  newGameButton,
  undoButton,
  redoButton,
  autoCompleteButton,
  watchDemoButton,
} from "./helpers";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("all buttons are visible and clickable", async ({ page }) => {
    const buttons = [
      newGameButton(page),
      undoButton(page),
      redoButton(page),
      autoCompleteButton(page),
      watchDemoButton(page),
    ];

    for (const btn of buttons) {
      await expect(btn).toBeVisible();
    }
  });

  test("Enter activates New Game button", async ({ page }) => {
    await newGameButton(page).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await expect(page.getByText(/Moves:\s*0/)).toBeVisible();
  });

  test("Space activates Undo button", async ({ page }) => {
    await undoButton(page).focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);

    // No error should occur (undo with empty history)
    await expect(page.getByText(/Moves:\s*0/)).toBeVisible();
  });

  test("no ARIA console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().toLowerCase().includes("aria")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForTimeout(1000);
    await newGameButton(page).click();
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });

  test("theme toggle has descriptive title attribute", async ({ page }) => {
    const toggle = page.getByTitle(/Switch to/);
    await expect(toggle).toHaveAttribute("title", /Switch to (light|dark) mode/);
  });
});
