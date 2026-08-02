import { type Page, type Locator, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** The stock pile (blue gradient card-back with spade symbol). */
export function stockPile(page: Page): Locator {
  return page.locator(".bg-gradient-to-br.from-blue-800").first();
}

/** The waste droppable area. Identified as the first dashed-border div in the top row that contains "Waste" or a card. */
export function wastePile(page: Page): Locator {
  // Waste is the second child in the top flex row (after stock)
  return page.locator(".flex.justify-center.gap-4 > div:nth-child(2)");
}

/** A specific foundation pile by index (0-3). Each shows a suit symbol. */
export function foundationPile(page: Page, index: number): Locator {
  // Layout: stock(1) waste(2) spacer(3) foundation-0(4) foundation-1(5) foundation-2(6) foundation-3(7)
  return page.locator(`.flex.justify-center.gap-4 > div:nth-child(${index + 4})`);
}

/** A specific tableau pile by index (0-6). Each has border-dashed and varying height. */
export function tableauPile(page: Page, index: number): Locator {
  // Tableau is the second flex.justify-center.gap-2 container
  return page.locator(".flex.justify-center.gap-2").last().locator(`> div:nth-child(${index + 1})`);
}

/** A face-up draggable card by its visible text content (e.g. "A♠"). */
export function faceUpCard(page: Page, text: string): Locator {
  return page.locator('[aria-roledescription="draggable"]').filter({ hasText: text }).first();
}

/** Any face-up draggable card in the waste pile. */
export function wasteCard(page: Page): Locator {
  return wastePile(page).locator('[aria-roledescription="draggable"]').first();
}

/** Any face-up draggable card in a specific foundation pile. */
export function foundationCard(page: Page, index: number): Locator {
  return foundationPile(page, index).locator('[aria-roledescription="draggable"]').first();
}

/** A face-down card (card-back with blue gradient). */
export function faceDownCards(page: Page): Locator {
  return page.locator(".card-back");
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function undoButton(page: Page): Locator {
  return page.getByRole("button", { name: "Undo" });
}

export function redoButton(page: Page): Locator {
  return page.getByRole("button", { name: "Redo" });
}

export function autoCompleteButton(page: Page): Locator {
  return page.getByRole("button", { name: "Auto Complete" });
}

export function watchDemoButton(page: Page): Locator {
  return page.getByRole("button", { name: "Watch Demo" });
}

export function stopDemoButton(page: Page): Locator {
  return page.getByRole("button", { name: "Stop Demo" });
}

export function newGameButton(page: Page): Locator {
  return page.getByRole("button", { name: "New Game" });
}

export function statusText(page: Page): Locator {
  return page.getByText(/Moves:\s*\d+/);
}

// ---------------------------------------------------------------------------
// State extraction from DOM
// ---------------------------------------------------------------------------

export async function getMoveCount(page: Page): Promise<number> {
  const text = await statusText(page).textContent();
  const match = text?.match(/Moves:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function getStockCount(page: Page): Promise<number> {
  const badge = page.locator(".bg-blue-700.text-white.text-xs");
  if ((await badge.count()) === 0) return 0;
  const text = await badge.textContent();
  return text ? parseInt(text, 10) : 0;
}

export async function getWasteCount(page: Page): Promise<number> {
  const text = await page.getByText(/Waste:\s*\d+/).textContent();
  const match = text?.match(/Waste:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function getFoundationCardCount(page: Page): Promise<number> {
  let count = 0;
  for (let i = 0; i < 4; i++) {
    const cards = foundationPile(page, i).locator('[aria-roledescription="draggable"], .card-back');
    count += await cards.count();
  }
  return count;
}

export async function getTableauCardCount(page: Page): Promise<number> {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const pile = tableauPile(page, i);
    count += await pile.locator('[aria-roledescription="draggable"], .card-back').count();
  }
  return count;
}

export async function getTotalVisibleCards(page: Page): Promise<number> {
  const stock = await getStockCount(page);
  const waste = await getWasteCount(page);
  const foundations = await getFoundationCardCount(page);
  const tableau = await getTableauCardCount(page);
  return stock + waste + foundations + tableau;
}

// ---------------------------------------------------------------------------
// Interaction helpers
// ---------------------------------------------------------------------------

export async function drawFromStock(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await stockPile(page).click();
    await page.waitForTimeout(50);
  }
}

/**
 * Drag one locator to another using mouse actions.
 * Works with @dnd-kit's PointerSensor (5px activation distance).
 */
export async function dragCardTo(
  page: Page,
  from: Locator,
  to: Locator,
): Promise<void> {
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) throw new Error("Element not visible for drag");

  const fromX = fromBox.x + fromBox.width / 2;
  const fromY = fromBox.y + fromBox.height / 2;
  const toX = toBox.x + toBox.width / 2;
  const toY = toBox.y + toBox.height / 2;

  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = fromX + ((toX - fromX) * i) / steps;
    const y = fromY + ((toY - fromY) * i) / steps;
    await page.mouse.move(x, y);
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
}

/** Wait for the move count to increase above the given value. */
export async function waitForMove(
  page: Page,
  previousMoveCount: number,
  timeout = 5000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const current = await getMoveCount(page);
    if (current > previousMoveCount) return;
    await page.waitForTimeout(50);
  }
}

/** Start demo mode, wait for game to end, return result. */
export async function playDemoUntilDone(
  page: Page,
  timeout = 120_000,
): Promise<"won" | "stalemate" | "timeout"> {
  await watchDemoButton(page).click();

  const start = Date.now();
  while (Date.now() - start < timeout) {
    const winVisible = await page.getByText("You Win!").isVisible().catch(() => false);
    if (winVisible) {
      await stopDemoButton(page).click().catch(() => {});
      return "won";
    }
    const stalemateVisible = await page
      .getByText("Stalemate")
      .isVisible()
      .catch(() => false);
    if (stalemateVisible) return "stalemate";

    const stopVisible = await stopDemoButton(page).isVisible().catch(() => false);
    if (!stopVisible) {
      await page.waitForTimeout(500);
      const stillNoDemo = !(await stopDemoButton(page).isVisible().catch(() => false));
      if (stillNoDemo) return "timeout";
    }
    await page.waitForTimeout(200);
  }
  await stopDemoButton(page).click().catch(() => {});
  return "timeout";
}

// ---------------------------------------------------------------------------
// Console error tracking
// ---------------------------------------------------------------------------

export function setupConsoleTracking(page: Page): {
  errors: string[];
  warnings: string[];
  cleanup: () => void;
} {
  const data = { errors: [] as string[], warnings: [] as string[] };
  const handler = (msg: import("@playwright/test").ConsoleMessage) => {
    if (msg.type() === "error") data.errors.push(msg.text());
    if (msg.type() === "warning") data.warnings.push(msg.text());
  };
  page.on("console", handler);
  return {
    get errors() {
      return data.errors;
    },
    get warnings() {
      return data.warnings;
    },
    cleanup: () => page.removeListener("console", handler),
  };
}

// ---------------------------------------------------------------------------
// Common assertions
// ---------------------------------------------------------------------------

export async function expectInitialState(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Solitaire" })).toBeVisible();
  await expect(statusText(page)).toContainText("Moves: 0");
  await expect(statusText(page)).toContainText("Stock: 24");
  await expect(statusText(page)).toContainText("Waste: 0");
  // 7 tableau piles (each with dashed border)
  const tableauContainer = page.locator(".flex.justify-center.gap-2").last();
  await expect(tableauContainer).toBeVisible();
  const pileCount = await tableauContainer.locator("> div").count();
  expect(pileCount).toBe(7);
  // 4 foundation piles with suit symbols
  const suitSymbols = ["♥", "♦", "♣", "♠"];
  for (let i = 0; i < 4; i++) {
    await expect(foundationPile(page, i)).toContainText(suitSymbols[i]);
  }
}

export async function expectGameInProgress(page: Page): Promise<void> {
  const total = await getTotalVisibleCards(page);
  expect(total).toBe(52);
}

export async function newGame(page: Page): Promise<void> {
  await newGameButton(page).click();
  await page.waitForTimeout(200);
}
