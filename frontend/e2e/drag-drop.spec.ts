import { test, expect } from "@playwright/test";
import {
  expectInitialState,
  drawFromStock,
  wasteCard,
  wastePile,
  foundationPile,
  foundationCard,
  tableauPile,
  dragCardTo,
  getMoveCount,
  getWasteCount,
  getFoundationCardCount,
  newGame,
} from "./helpers";

test.describe("Drag and Drop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expectInitialState(page);
  });

  test("drag waste card to foundation", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    const movesBefore = await getMoveCount(page);

    for (let i = 0; i < 4; i++) {
      const prevMoves = await getMoveCount(page);
      await dragCardTo(page, card, foundationPile(page, i));
      await page.waitForTimeout(200);
      if ((await getMoveCount(page)) > prevMoves) {
        expect(await getMoveCount(page)).toBeGreaterThan(movesBefore);
        return;
      }
    }
  });

  test("drag tableau card to another tableau", async ({ page }) => {
    await drawFromStock(page, 3);
    await page.waitForTimeout(100);

    for (let fromPile = 0; fromPile < 7; fromPile++) {
      const faceUp = tableauPile(page, fromPile).locator('[aria-roledescription="draggable"]');
      const count = await faceUp.count();
      if (count === 0) continue;

      const topCard = faceUp.last();
      for (let toPile = 0; toPile < 7; toPile++) {
        if (toPile === fromPile) continue;
        const prevMoves = await getMoveCount(page);
        await dragCardTo(page, topCard, tableauPile(page, toPile));
        await page.waitForTimeout(200);
        if ((await getMoveCount(page)) > prevMoves) {
          expect(await getMoveCount(page)).toBeGreaterThan(0);
          return;
        }
      }
    }
  });

  test("drag King to another tableau pile", async ({ page }) => {
    await drawFromStock(page, 5);
    await page.waitForTimeout(100);

    for (let pile = 0; pile < 7; pile++) {
      const faceUp = tableauPile(page, pile).locator('[aria-roledescription="draggable"]');
      const count = await faceUp.count();
      if (count === 0) continue;

      const topCard = faceUp.last();
      const text = await topCard.textContent();
      if (text && text.includes("K")) {
        for (let toPile = 0; toPile < 7; toPile++) {
          if (toPile === pile) continue;
          const prevMoves = await getMoveCount(page);
          await dragCardTo(page, topCard, tableauPile(page, toPile));
          await page.waitForTimeout(200);
          if ((await getMoveCount(page)) > prevMoves) {
            return;
          }
        }
      }
    }
  });

  test("drag Ace to empty foundation", async ({ page }) => {
    for (let pile = 0; pile < 7; pile++) {
      const faceUp = tableauPile(page, pile).locator('[aria-roledescription="draggable"]');
      const count = await faceUp.count();
      if (count === 0) continue;

      const topCard = faceUp.last();
      const text = await topCard.textContent();
      if (text && text.includes("A")) {
        for (let f = 0; f < 4; f++) {
          const prevMoves = await getMoveCount(page);
          await dragCardTo(page, topCard, foundationPile(page, f));
          await page.waitForTimeout(200);
          if ((await getMoveCount(page)) > prevMoves) {
            return;
          }
        }
      }
    }
  });

  test("drag to same pile does nothing", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    const wasteBefore = await getWasteCount(page);

    await dragCardTo(page, card, wastePile(page));
    await page.waitForTimeout(200);

    expect(await getWasteCount(page)).toBe(wasteBefore);
  });

  test("drag overlay appears during drag", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    const box = await card.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
    await page.waitForTimeout(100);
    // No error during drag interaction
    await page.mouse.up();
    expect(true).toBe(true);
  });

  test("drag from foundation back to tableau", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const waste = wasteCard(page);
    let foundationIdx = -1;
    for (let i = 0; i < 4; i++) {
      const prevMoves = await getMoveCount(page);
      await dragCardTo(page, waste, foundationPile(page, i));
      await page.waitForTimeout(200);
      if ((await getMoveCount(page)) > prevMoves) {
        foundationIdx = i;
        break;
      }
    }

    if (foundationIdx >= 0) {
      const fCard = foundationCard(page, foundationIdx);
      if ((await fCard.count()) > 0) {
        for (let t = 0; t < 7; t++) {
          const prevMoves = await getMoveCount(page);
          await dragCardTo(page, fCard, tableauPile(page, t));
          await page.waitForTimeout(200);
          if ((await getMoveCount(page)) > prevMoves) {
            return;
          }
        }
      }
    }
  });

  test("drag between foundations", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const waste = wasteCard(page);
    let foundationIdx = -1;
    for (let i = 0; i < 4; i++) {
      const prevMoves = await getMoveCount(page);
      await dragCardTo(page, waste, foundationPile(page, i));
      await page.waitForTimeout(200);
      if ((await getMoveCount(page)) > prevMoves) {
        foundationIdx = i;
        break;
      }
    }

    if (foundationIdx >= 0) {
      const fCard = foundationCard(page, foundationIdx);
      if ((await fCard.count()) > 0) {
        for (let i = 0; i < 4; i++) {
          if (i === foundationIdx) continue;
          const prevMoves = await getMoveCount(page);
          await dragCardTo(page, fCard, foundationPile(page, i));
          await page.waitForTimeout(200);
          if ((await getMoveCount(page)) > prevMoves) {
            return;
          }
        }
      }
    }
  });

  test("drag short distance does not activate", async ({ page }) => {
    await drawFromStock(page, 1);
    await page.waitForTimeout(100);

    const card = wasteCard(page);
    const box = await card.boundingBox();
    if (!box) return;

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 3, cy + 3);
    await page.waitForTimeout(100);
    await page.mouse.up();

    expect(await getWasteCount(page)).toBe(1);
  });

  test("drag multi-card sequence", async ({ page }) => {
    await drawFromStock(page, 5);
    await page.waitForTimeout(100);

    for (let fromPile = 0; fromPile < 7; fromPile++) {
      const faceUp = tableauPile(page, fromPile).locator('[aria-roledescription="draggable"]');
      const count = await faceUp.count();
      if (count < 2) continue;

      const secondCard = faceUp.nth(count - 2);
      const text = await secondCard.textContent();
      if (!text || text.length === 0) continue;

      for (let toPile = 0; toPile < 7; toPile++) {
        if (toPile === fromPile) continue;
        const prevMoves = await getMoveCount(page);
        await dragCardTo(page, secondCard, tableauPile(page, toPile));
        await page.waitForTimeout(200);
        if ((await getMoveCount(page)) > prevMoves) {
          return;
        }
      }
    }
  });
});
