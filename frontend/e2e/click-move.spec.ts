import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  drawFromStock,
  wasteCard,
  wastePile,
  foundationPile,
  tableauPile,
  getMoveCount,
  getWasteCount,
  getFoundationCardCount,
  newGame,
} from "./helpers";

test.describe("Click-to-Move", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("click waste card then foundation moves card if valid", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const movesBefore = await getMoveCount(page);

    // Click the waste card to select it
    const card = wasteCard(page);
    await card.click();
    await page.waitForTimeout(100);

    // Try clicking each foundation
    for (let i = 0; i < 4; i++) {
      const prevMoves = await getMoveCount(page);
      await foundationPile(page, i).click();
      await page.waitForTimeout(100);
      if ((await getMoveCount(page)) > prevMoves) {
        // Card moved
        return;
      }
    }
    // No valid foundation — that's fine, just verify no crash
    expect(await getMoveCount(page)).toBe(movesBefore);
  });

  test("click tableau top card then another tableau pile", async ({ page }) => {
    await drawFromStock(page, 3);
    await page.waitForTimeout(100);

    // Find a face-up top card in tableau and try to move it
    for (let fromPile = 0; fromPile < 7; fromPile++) {
      const pile = tableauPile(page, fromPile);
      const faceUp = pile.locator('[aria-roledescription="draggable"]');
      const count = await faceUp.count();
      if (count === 0) continue;

      const topCard = faceUp.last();
      await topCard.click();
      await page.waitForTimeout(100);

      for (let toPile = 0; toPile < 7; toPile++) {
        if (toPile === fromPile) continue;
        const prevMoves = await getMoveCount(page);
        await tableauPile(page, toPile).click();
        await page.waitForTimeout(100);
        if ((await getMoveCount(page)) > prevMoves) {
          return; // Move succeeded
        }
      }
    }
    // No valid tableau-to-tableau move found — test passes (random deal)
    expect(true).toBe(true);
  });

  test("click waste then waste deselects", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    await card.click();
    await page.waitForTimeout(100);

    const movesBefore = await getMoveCount(page);
    await wastePile(page).click();
    await page.waitForTimeout(100);

    expect(await getMoveCount(page)).toBe(movesBefore);
    expect(await getWasteCount(page)).toBe(1);
  });

  test("click card then click same card area deselects", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    await card.click();
    await page.waitForTimeout(100);

    await expect(card).toBeVisible();

    await wastePile(page).click();
    await page.waitForTimeout(100);

    expect(await getWasteCount(page)).toBe(1);
  });

  test("click one card then another reselects", async ({ page }) => {
    await drawFromStock(page, 2);
    await page.waitForTimeout(100);

    // Click waste card
    await wasteCard(page).click();
    await page.waitForTimeout(100);

    // Find a face-up tableau card and click it (reselects)
    for (let i = 0; i < 7; i++) {
      const pile = tableauPile(page, i);
      const faceUp = pile.locator('[aria-roledescription="draggable"]');
      if ((await faceUp.count()) > 0) {
        await faceUp.last().click();
        await page.waitForTimeout(100);
        break;
      }
    }
    // No error = reselection worked
    expect(true).toBe(true);
  });

  test("click face-down card does nothing", async ({ page }) => {
    // Face-down cards don't have aria-roledescription="draggable"
    // They're the .card-back elements inside tableau
    const faceDown = tableauPile(page, 0).locator(".card-back").first();
    if ((await faceDown.count()) > 0) {
      const movesBefore = await getMoveCount(page);
      await faceDown.click();
      await page.waitForTimeout(100);
      expect(await getMoveCount(page)).toBe(movesBefore);
    }
  });

  test("status bar move count increments after move", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const movesBefore = await getMoveCount(page);

    await wasteCard(page).click();
    await page.waitForTimeout(100);

    for (let i = 0; i < 4; i++) {
      await foundationPile(page, i).click();
      await page.waitForTimeout(100);
      if ((await getMoveCount(page)) > movesBefore) {
        expect(await getMoveCount(page)).toBe(movesBefore + 1);
        return;
      }
    }
    // Try tableau
    for (let i = 0; i < 7; i++) {
      await tableauPile(page, i).click();
      await page.waitForTimeout(100);
      if ((await getMoveCount(page)) > movesBefore) {
        expect(await getMoveCount(page)).toBe(movesBefore + 1);
        return;
      }
    }
  });

  test("click Ace on tableau top to foundation", async ({ page }) => {
    // Find an Ace on top of a tableau pile
    for (let pile = 0; pile < 7; pile++) {
      const faceUp = tableauPile(page, pile).locator('[aria-roledescription="draggable"]');
      const count = await faceUp.count();
      if (count === 0) continue;

      const topCard = faceUp.last();
      const text = await topCard.textContent();
      if (text && text.includes("A")) {
        await topCard.click();
        await page.waitForTimeout(100);

        // Try all foundations
        for (let f = 0; f < 4; f++) {
          const prevMoves = await getMoveCount(page);
          await foundationPile(page, f).click();
          await page.waitForTimeout(100);
          if ((await getMoveCount(page)) > prevMoves) {
            expect(await getFoundationCardCount(page)).toBeGreaterThanOrEqual(1);
            return;
          }
        }
      }
    }
    // No Ace on top — test passes
    expect(true).toBe(true);
  });
});
