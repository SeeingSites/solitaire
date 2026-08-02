import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  drawFromStock,
  wasteCard,
  foundationPile,
  tableauPile,
  undoButton,
  redoButton,
  getMoveCount,
  getWasteCount,
  getStockCount,
  getTotalVisibleCards,
  newGame,
} from "./helpers";

test.describe("Undo / Redo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("undo reverses last move", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(1);

    await undoButton(page).click();
    await page.waitForTimeout(200);

    expect(await getMoveCount(page)).toBe(0);
    expect(await getWasteCount(page)).toBe(0);
  });

  test("undo multiple moves", async ({ page }) => {
    await drawFromStock(page, 3);
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(3);

    for (let i = 0; i < 3; i++) {
      await undoButton(page).click();
      await page.waitForTimeout(100);
    }

    expect(await getMoveCount(page)).toBe(0);
    expect(await getWasteCount(page)).toBe(0);
    expect(await getStockCount(page)).toBe(24);
  });

  test("redo redoes undone move", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(1);

    await undoButton(page).click();
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(0);

    await redoButton(page).click();
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(1);
    expect(await getWasteCount(page)).toBe(1);
  });

  test("undo then new move clears redo stack", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(200);

    await undoButton(page).click();
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(0);

    await drawFromStock(page, 1);
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(1);

    // Redo should no longer work
    const prevMoves = await getMoveCount(page);
    await redoButton(page).click();
    await page.waitForTimeout(200);
    expect(await getMoveCount(page)).toBe(prevMoves);
  });

  test("undo with empty history does nothing", async ({ page }) => {
    const totalCards = await getTotalVisibleCards(page);
    await undoButton(page).click();
    await page.waitForTimeout(200);

    expect(await getTotalVisibleCards(page)).toBe(totalCards);
    expect(await getMoveCount(page)).toBe(0);
  });

  test("redo with nothing to redo does nothing", async ({ page }) => {
    const totalCards = await getTotalVisibleCards(page);
    await redoButton(page).click();
    await page.waitForTimeout(200);

    expect(await getTotalVisibleCards(page)).toBe(totalCards);
    expect(await getMoveCount(page)).toBe(0);
  });

  test("undo restores flipped cards", async ({ page }) => {
    await drawFromStock(page, 5);
    await page.waitForTimeout(200);

    const faceDownBefore = await page.locator(".card-back").count();

    for (let i = 0; i < 5; i++) {
      await undoButton(page).click();
      await page.waitForTimeout(100);
    }

    const faceDownAfter = await page.locator(".card-back").count();
    expect(faceDownAfter).toBe(faceDownBefore);
  });
});
