import { describe, it, expect } from "vitest";
import { KlondikeEngine } from "../Klondike";
import { rolloutBestMove, hashState, MoveSimulator } from "../AI";
import { CardLocation } from "../types";

// getState() copies piles but shares card objects, so serialize to snapshot.
const snap = (engine: KlondikeEngine) =>
  JSON.stringify({ ...engine.getState(), lastActionLog: [] });

describe("stock draws are undoable", () => {
  it("undo after a draw returns the card face-down to the stock", () => {
    const engine = new KlondikeEngine();
    const before = snap(engine);

    expect(engine.drawFromStock()).toBe(true);
    expect(engine.getState().waste).toHaveLength(1);
    expect(engine.getState().moveCount).toBe(1);

    expect(engine.undo()).toBe(true);
    expect(snap(engine)).toBe(before);
    expect(engine.getState().stock.every((c) => !c.faceUp)).toBe(true);
  });

  it("redo replays an undone draw", () => {
    const engine = new KlondikeEngine();
    engine.drawFromStock();
    const afterDraw = snap(engine);

    engine.undo();
    expect(engine.redo()).toBe(true);
    expect(snap(engine)).toBe(afterDraw);
  });

  it("undo of a reshuffling draw restores the full waste pile in order", () => {
    const engine = new KlondikeEngine();
    while (engine.getState().stock.length > 0) engine.drawFromStock();
    const exhausted = snap(engine);
    expect(engine.getState().waste).toHaveLength(24);

    // Stock is empty: this draw recycles the waste and draws one card.
    expect(engine.drawFromStock()).toBe(true);
    expect(engine.getState().stock).toHaveLength(23);
    expect(engine.getState().waste).toHaveLength(1);

    engine.undo();
    expect(snap(engine)).toBe(exhausted);

    engine.redo();
    expect(engine.getState().stock).toHaveLength(23);
    expect(engine.getState().waste).toHaveLength(1);
  });

  it("undoing every action of a mixed game returns to the deal", () => {
    const engine = new KlondikeEngine();
    const dealt = snap(engine);
    let actions = 0;

    for (let i = 0; i < 120; i++) {
      const moves = engine.findLegalMoves();
      if (moves.length > 0 && i % 3 !== 0) {
        if (engine.moveCard(moves[0].from, moves[0].to)) actions++;
      } else if (engine.drawFromStock()) {
        actions++;
      }
    }
    expect(engine.getState().moveCount).toBe(actions);

    for (let i = 0; i < actions; i++) expect(engine.undo()).toBe(true);
    expect(engine.undo()).toBe(false);
    expect(snap(engine)).toBe(dealt);
  });

  it("a draw clears the redo stack", () => {
    const engine = new KlondikeEngine();
    engine.drawFromStock();
    engine.undo();
    engine.drawFromStock();
    expect(engine.redo()).toBe(false);
  });
});

describe("AI look-ahead leaves the real game untouched", () => {
  it("rolloutBestMove does not change engine state", () => {
    const simulateFor =
      (engine: KlondikeEngine): MoveSimulator =>
      (move) => {
        if (!engine.moveCard(move.from, move.to)) return null;
        const s = engine.getState();
        engine.undo();
        return { ...s, lastActionLog: [] };
      };

    for (let g = 0; g < 5; g++) {
      const engine = new KlondikeEngine();
      const context = {
        recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
        recentStates: [hashState(engine.getState())],
        consecutiveStockDraws: 0,
        movesSinceFoundation: 0,
      };

      for (let i = 0; i < 60; i++) {
        const legal = engine.findLegalMoves();
        if (legal.length === 0) {
          if (!engine.drawFromStock()) break;
          continue;
        }
        const before = snap(engine);
        const move = rolloutBestMove(engine, legal, context, simulateFor(engine));
        expect(snap(engine)).toBe(before);
        if (!move) break;
        engine.moveCard(move.from, move.to);
      }
    }
  });
});
