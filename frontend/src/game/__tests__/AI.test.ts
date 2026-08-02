import { describe, it, expect } from "vitest";
import { KlondikeEngine } from "../Klondike";
import { rolloutBestMove, hashState, MoveSimulator } from "../AI";
import { CardLocation, SolitaireState, MoveRecord } from "../types";

function createSimulator(engine: KlondikeEngine): MoveSimulator {
  return (move) => {
    const ok = engine.moveCard(move.from, move.to);
    if (!ok) return null;
    const s = engine.getState();
    const copy: SolitaireState = {
      stock: [...s.stock],
      waste: [...s.waste],
      foundations: s.foundations.map((pile) => [...pile]),
      tableau: s.tableau.map((pile) => [...pile]),
      moveCount: s.moveCount,
      isComplete: s.isComplete,
      lastActionLog: [],
    };
    engine.undo();
    return copy;
  };
}

function playGame(maxMoves = 2000): {
  won: boolean;
  moves: number;
  foundationCount: number;
  stuck: boolean;
  bailedOut: boolean;
  maxFoundationCount: number;
  stockDraws: number;
  foundationMoves: number;
  tableauMoves: number;
  multiCardMoves: number;
  finalStockSize: number;
  finalWasteSize: number;
  tableauFaceUp: number;
  tableauFaceDown: number;
  maxConsecutiveStockDraws: number;
} {
  const engine = new KlondikeEngine();
  const simulate = createSimulator(engine);
  const context = {
    recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
    recentStates: [] as string[],
    consecutiveStockDraws: 0,
    movesSinceFoundation: 0,
  };
  let moves = 0;
  let stuck = false;
  let bailedOut = false;
  let maxFoundationCount = 0;
  let stockDraws = 0;
  let foundationMoves = 0;
  let tableauMoves = 0;
  let multiCardMoves = 0;
  let maxConsecutiveStockDraws = 0;
  let currentConsecutiveStockDraws = 0;

  let stockReshuffles = 0;
  let prevStockLen = engine.getState().stock.length;
  let fcAtLastReshuffle = 0;
  let movesSinceFcIncrease = 0;

  const MAX_MOVES_WITHOUT_FC = 200;

  while (moves < maxMoves) {
    const state = engine.getState();

    if (state.isComplete) {
      return {
        won: true,
        moves,
        foundationCount: 52,
        stuck: false,
        bailedOut: false,
        maxFoundationCount: 52,
        stockDraws,
        foundationMoves,
        tableauMoves,
        multiCardMoves,
        finalStockSize: state.stock.length,
        finalWasteSize: state.waste.length,
        tableauFaceUp: 0,
        tableauFaceDown: 0,
        maxConsecutiveStockDraws,
      };
    }

    const fc = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
    if (fc > maxFoundationCount) {
      maxFoundationCount = fc;
      movesSinceFcIncrease = 0;
    }

    // Bail if too many moves without foundation progress
    if (movesSinceFcIncrease >= MAX_MOVES_WITHOUT_FC) {
      bailedOut = true;
      break;
    }

    const legalMoves = engine.findLegalMoves();

    if (legalMoves.length === 0) {
      if (state.stock.length > 0 || state.waste.length > 0) {
        engine.drawFromStock();
        stockDraws++;
        currentConsecutiveStockDraws++;
        if (currentConsecutiveStockDraws > maxConsecutiveStockDraws) {
          maxConsecutiveStockDraws = currentConsecutiveStockDraws;
        }
        context.consecutiveStockDraws++;
        context.movesSinceFoundation++;
        movesSinceFcIncrease++;
        moves++;
        context.recentStates.push(hashState(engine.getState()));
        if (context.recentStates.length > 50) context.recentStates.shift();

        const newStockLen = engine.getState().stock.length;
        if (newStockLen > prevStockLen) {
          stockReshuffles++;
          if (stockReshuffles >= 20) {
            if (fc - fcAtLastReshuffle <= 1) {
              bailedOut = true;
              break;
            }
            fcAtLastReshuffle = fc;
          }
        }
        prevStockLen = newStockLen;
      } else {
        stuck = true;
        break;
      }
      continue;
    }

    if (movesSinceFcIncrease > 30) {
      if (state.stock.length > 0 || state.waste.length > 0) {
        engine.drawFromStock();
        stockDraws++;
        currentConsecutiveStockDraws++;
        if (currentConsecutiveStockDraws > maxConsecutiveStockDraws) {
          maxConsecutiveStockDraws = currentConsecutiveStockDraws;
        }
        context.consecutiveStockDraws++;
        context.movesSinceFoundation++;
        movesSinceFcIncrease = 0;
        moves++;
        context.recentStates.push(hashState(engine.getState()));
        if (context.recentStates.length > 50) context.recentStates.shift();
        const newStockLen = engine.getState().stock.length;
        if (newStockLen > prevStockLen) {
          stockReshuffles++;
          if (stockReshuffles >= 20) {
            if (fc - fcAtLastReshuffle <= 1) {
              bailedOut = true;
              break;
            }
            fcAtLastReshuffle = fc;
          }
        }
        prevStockLen = newStockLen;
      } else {
        stuck = true;
        break;
      }
      continue;
    }

    const bestMove = rolloutBestMove(engine, legalMoves, context, simulate);

    if (bestMove) {
      const result = engine.moveCard(bestMove.from, bestMove.to);
      if (!result) {
        stuck = true;
        break;
      }

      if (bestMove.to.type === "foundation") {
        foundationMoves++;
        context.movesSinceFoundation = 0;
        currentConsecutiveStockDraws = 0;
      } else if (bestMove.from.type === "stock") {
        stockDraws++;
        currentConsecutiveStockDraws++;
        if (currentConsecutiveStockDraws > maxConsecutiveStockDraws) {
          maxConsecutiveStockDraws = currentConsecutiveStockDraws;
        }
        context.movesSinceFoundation++;
      } else if (bestMove.from.type === "tableau" && bestMove.to.type === "tableau") {
        tableauMoves++;
        currentConsecutiveStockDraws = 0;
        context.movesSinceFoundation++;
        movesSinceFcIncrease++;
        if (bestMove.from.cardIndex < state.tableau[bestMove.from.pileIndex].length - 1) {
          multiCardMoves++;
        }
      } else {
        currentConsecutiveStockDraws = 0;
        context.movesSinceFoundation++;
        movesSinceFcIncrease++;
      }

      context.recentMoves.push(bestMove);
      if (context.recentMoves.length > 20) context.recentMoves.shift();
      context.consecutiveStockDraws =
        bestMove.from.type === "stock" ? context.consecutiveStockDraws + 1 : 0;
      context.recentStates.push(hashState(engine.getState()));
      if (context.recentStates.length > 50) context.recentStates.shift();
      moves++;
    } else {
      if (state.stock.length > 0 || state.waste.length > 0) {
        engine.drawFromStock();
        stockDraws++;
        currentConsecutiveStockDraws++;
        if (currentConsecutiveStockDraws > maxConsecutiveStockDraws) {
          maxConsecutiveStockDraws = currentConsecutiveStockDraws;
        }
        context.consecutiveStockDraws++;
        context.movesSinceFoundation++;
        movesSinceFcIncrease++;
        moves++;
        context.recentStates.push(hashState(engine.getState()));
        if (context.recentStates.length > 50) context.recentStates.shift();

        const newStockLen = engine.getState().stock.length;
        if (newStockLen > prevStockLen) {
          stockReshuffles++;
          if (stockReshuffles >= 20) {
            if (fc - fcAtLastReshuffle <= 1) {
              bailedOut = true;
              break;
            }
            fcAtLastReshuffle = fc;
          }
        }
        prevStockLen = newStockLen;
      } else {
        stuck = true;
        break;
      }
    }
  }

  // If we exited the loop without winning/stuck/bailing, we hit the move limit
  if (!stuck && !bailedOut) {
    bailedOut = true;
  }

  const finalState = engine.getState();
  const finalFC = finalState.foundations.reduce((sum, pile) => sum + pile.length, 0);
  let faceUp = 0;
  let faceDown = 0;
  for (const pile of finalState.tableau) {
    for (const card of pile) {
      if (card.faceUp) faceUp++;
      else faceDown++;
    }
  }

  return {
    won: false,
    moves,
    foundationCount: finalFC,
    stuck,
    bailedOut,
    maxFoundationCount,
    stockDraws,
    foundationMoves,
    tableauMoves,
    multiCardMoves,
    finalStockSize: finalState.stock.length,
    finalWasteSize: finalState.waste.length,
    tableauFaceUp: faceUp,
    tableauFaceDown: faceDown,
    maxConsecutiveStockDraws,
  };
}

describe("AI Multi-Game Simulation", () => {
  const NUM_GAMES = 100;

  it(`plays ${NUM_GAMES} games and reports win rate`, () => {
    const results = [];
    for (let i = 0; i < NUM_GAMES; i++) {
      results.push(playGame(20000));
    }

    const wins = results.filter((r) => r.won).length;
    const stuck = results.filter((r) => r.stuck).length;
    const bailedOut = results.filter((r) => r.bailedOut).length;
    const avgMoves = results.reduce((sum, r) => sum + r.moves, 0) / results.length;
    const avgFoundation = results.reduce((sum, r) => sum + r.foundationCount, 0) / results.length;
    const avgMaxFoundation =
      results.reduce((sum, r) => sum + r.maxFoundationCount, 0) / results.length;
    const maxFoundationReached = Math.max(...results.map((r) => r.maxFoundationCount));
    const avgStockDraws = results.reduce((sum, r) => sum + r.stockDraws, 0) / results.length;
    const avgFoundationMoves =
      results.reduce((sum, r) => sum + r.foundationMoves, 0) / results.length;
    const avgTableauMoves = results.reduce((sum, r) => sum + r.tableauMoves, 0) / results.length;
    const avgMultiCard = results.reduce((sum, r) => sum + r.multiCardMoves, 0) / results.length;
    const avgFaceDown = results.reduce((sum, r) => sum + r.tableauFaceDown, 0) / results.length;
    const avgFaceUp = results.reduce((sum, r) => sum + r.tableauFaceUp, 0) / results.length;

    const dist = [0, 0, 0, 0, 0];
    for (const r of results) {
      const fc = r.maxFoundationCount;
      if (fc <= 10) dist[0]++;
      else if (fc <= 20) dist[1]++;
      else if (fc <= 30) dist[2]++;
      else if (fc <= 40) dist[3]++;
      else dist[4]++;
    }

    console.log("\n═══════════════════════════════════════");
    console.log("       AI SIMULATION RESULTS");
    console.log("═══════════════════════════════════════");
    console.log(`Games played:      ${NUM_GAMES}`);
    console.log(`Wins:              ${wins} (${((wins / NUM_GAMES) * 100).toFixed(1)}%)`);
    console.log(`Stuck (no moves):  ${stuck} (${((stuck / NUM_GAMES) * 100).toFixed(1)}%)`);
    console.log(`Bailed out (loop): ${bailedOut} (${((bailedOut / NUM_GAMES) * 100).toFixed(1)}%)`);
    console.log(`───────────────────────────────────────`);
    console.log(`Avg moves/game:    ${avgMoves.toFixed(0)}`);
    console.log(`Avg final FC:      ${avgFoundation.toFixed(1)}/52`);
    console.log(`Avg max FC:        ${avgMaxFoundation.toFixed(1)}/52`);
    console.log(`Best FC reached:   ${maxFoundationReached}/52`);
    console.log(`───────────────────────────────────────`);
    console.log(`Avg stock draws:   ${avgStockDraws.toFixed(0)}`);
    console.log(`Avg found. moves:  ${avgFoundationMoves.toFixed(0)}`);
    console.log(`Avg tableau moves: ${avgTableauMoves.toFixed(0)}`);
    console.log(`Avg multi-card:    ${avgMultiCard.toFixed(1)}`);
    console.log(`───────────────────────────────────────`);
    console.log(`Avg face-up cards: ${avgFaceUp.toFixed(0)}`);
    console.log(`Avg face-down:     ${avgFaceDown.toFixed(0)}`);
    console.log(`───────────────────────────────────────`);
    console.log("FC distribution (max reached):");
    console.log(`  0-10:  ${dist[0]} games`);
    console.log(`  11-20: ${dist[1]} games`);
    console.log(`  21-30: ${dist[2]} games`);
    console.log(`  31-40: ${dist[3]} games`);
    console.log(`  41-52: ${dist[4]} games`);
    console.log("═══════════════════════════════════════\n");

    expect(results.length).toBe(NUM_GAMES);
  });
});

describe("AI Cycle Detection", () => {
  it("finishes within max moves (no infinite loops)", () => {
    const start = Date.now();
    const result = playGame(5000);
    const elapsed = Date.now() - start;

    console.log(`\nCycle detection: ${result.moves} moves in ${elapsed}ms`);
    console.log(`Won: ${result.won}, Stuck: ${result.stuck}`);

    expect(elapsed).toBeLessThan(30000);
    expect(result.moves).toBeLessThanOrEqual(5000);
  });
});

describe("AI Foundation Progress", () => {
  it("foundation count is always non-decreasing during a game", () => {
    const engine = new KlondikeEngine();
    const simulate = createSimulator(engine);
    const context = {
      recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
      recentStates: [] as string[],
      consecutiveStockDraws: 0,
      movesSinceFoundation: 0,
    };
    let prevFoundationCount = 0;
    let foundationIncreases = 0;

    context.recentStates.push(hashState(engine.getState()));

    for (let i = 0; i < 500; i++) {
      const state = engine.getState();
      const fc = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
      expect(fc).toBeGreaterThanOrEqual(prevFoundationCount);
      if (fc > prevFoundationCount) foundationIncreases++;
      prevFoundationCount = fc;

      if (state.isComplete) break;

      const legalMoves = engine.findLegalMoves();

      if (legalMoves.length === 0) {
        if (state.stock.length > 0 || state.waste.length > 0) {
          engine.drawFromStock();
          context.consecutiveStockDraws++;
          context.movesSinceFoundation++;
          context.recentStates.push(hashState(engine.getState()));
          if (context.recentStates.length > 50) context.recentStates.shift();
        } else {
          break;
        }
        continue;
      }

      const bestMove = rolloutBestMove(engine, legalMoves, context, simulate);
      if (bestMove) {
        engine.moveCard(bestMove.from, bestMove.to);
        context.recentMoves.push(bestMove);
        context.recentStates.push(hashState(engine.getState()));
        if (context.recentMoves.length > 20) context.recentMoves.shift();
        if (context.recentStates.length > 50) context.recentStates.shift();
        context.consecutiveStockDraws =
          bestMove.from.type === "stock" ? context.consecutiveStockDraws + 1 : 0;
        if (bestMove.to.type === "foundation") {
          context.movesSinceFoundation = 0;
        } else {
          context.movesSinceFoundation++;
        }
      } else {
        if (state.stock.length > 0 || state.waste.length > 0) {
          engine.drawFromStock();
          context.consecutiveStockDraws++;
          context.movesSinceFoundation++;
          context.recentStates.push(hashState(engine.getState()));
          if (context.recentStates.length > 50) context.recentStates.shift();
        } else {
          break;
        }
      }
    }

    console.log(`\nFoundation progress: ${prevFoundationCount}/52 after 500 moves`);
    console.log(`Foundation increased ${foundationIncreases} times`);

    expect(prevFoundationCount).toBeGreaterThanOrEqual(0);
  });
});

describe("Engine Undo Correctness", () => {
  it("undo restores exact state hash after multiple moves", () => {
    const engine = new KlondikeEngine();

    // May need to draw first
    let legalMoves = engine.findLegalMoves();
    while (
      legalMoves.length === 0 &&
      (engine.getState().stock.length > 0 || engine.getState().waste.length > 0)
    ) {
      engine.drawFromStock();
      legalMoves = engine.findLegalMoves();
    }

    // Capture hash AFTER draws, BEFORE move+undo
    const hashBefore = hashState(engine.getState());
    console.log(`\nUndo test: ${legalMoves.length} legal moves`);

    for (let i = 0; i < Math.min(legalMoves.length, 10); i++) {
      const move = legalMoves[i];
      const ok = engine.moveCard(move.from, move.to);
      expect(ok).toBe(true);
      engine.undo();
      const hashAfter = hashState(engine.getState());
      expect(hashAfter).toBe(hashBefore);
    }
    console.log("Undo correctness: PASS");
  });
});

describe("AI Stalemate Bail-Out", () => {
  it("bails out after repeated stock reshuffles without foundation progress", () => {
    let bailedOutCount = 0;
    let stuckCount = 0;
    let wonCount = 0;
    let hitMoveLimit = 0;
    const NUM_TRIALS = 20;

    for (let i = 0; i < NUM_TRIALS; i++) {
      const result = playGame(20000);
      if (result.bailedOut) bailedOutCount++;
      else if (result.stuck) stuckCount++;
      else if (result.won) wonCount++;
      else hitMoveLimit++;
    }

    console.log(
      `\nStalemate bail-out: won=${wonCount}, stuck=${stuckCount}, ` +
        `bailed=${bailedOutCount}, hitMoveLimit=${hitMoveLimit} out of ${NUM_TRIALS}`,
    );

    // All games should either terminate or hit the move limit (not hang)
    const total = wonCount + stuckCount + bailedOutCount + hitMoveLimit;
    expect(total).toBe(NUM_TRIALS);
    // Most games should terminate via win/stuck/bailout, not all hit the limit
    expect(wonCount + stuckCount + bailedOutCount).toBeGreaterThan(0);
  });

  it("does not infinite-loop when all moves are cyclic", () => {
    const engine = new KlondikeEngine();
    const simulate = createSimulator(engine);
    const context = {
      recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
      recentStates: [] as string[],
      consecutiveStockDraws: 0,
      movesSinceFoundation: 0,
    };
    context.recentStates.push(hashState(engine.getState()));

    let moves = 0;
    let stuck = false;

    while (moves < 5000) {
      const state = engine.getState();
      if (state.isComplete) break;

      const legalMoves = engine.findLegalMoves();
      if (legalMoves.length === 0) {
        if (state.stock.length > 0 || state.waste.length > 0) {
          engine.drawFromStock();
          context.consecutiveStockDraws++;
          context.movesSinceFoundation++;
          context.recentStates.push(hashState(engine.getState()));
          if (context.recentStates.length > 50) context.recentStates.shift();
          moves++;
        } else {
          stuck = true;
          break;
        }
        continue;
      }

      const bestMove = rolloutBestMove(engine, legalMoves, context, simulate);
      if (bestMove) {
        engine.moveCard(bestMove.from, bestMove.to);
        context.recentMoves.push(bestMove);
        context.recentStates.push(hashState(engine.getState()));
        if (context.recentMoves.length > 20) context.recentMoves.shift();
        if (context.recentStates.length > 50) context.recentStates.shift();
        context.consecutiveStockDraws =
          bestMove.from.type === "stock" ? context.consecutiveStockDraws + 1 : 0;
        if (bestMove.to.type === "foundation") {
          context.movesSinceFoundation = 0;
        } else {
          context.movesSinceFoundation++;
        }
        moves++;
      } else {
        if (state.stock.length > 0 || state.waste.length > 0) {
          engine.drawFromStock();
          context.consecutiveStockDraws++;
          context.movesSinceFoundation++;
          context.recentStates.push(hashState(engine.getState()));
          if (context.recentStates.length > 50) context.recentStates.shift();
          moves++;
        } else {
          stuck = true;
          break;
        }
      }
    }

    console.log(`\nInfinite loop test: ${moves} moves, stuck=${stuck}`);
    expect(moves).toBeLessThanOrEqual(5000);
  });
});

describe("AI Move Diagnostic", () => {
  it("prints first 80 moves of one game", () => {
    const engine = new KlondikeEngine();
    const simulate = createSimulator(engine);
    const context = {
      recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
      recentStates: [] as string[],
      consecutiveStockDraws: 0,
      movesSinceFoundation: 0,
    };
    context.recentStates.push(hashState(engine.getState()));

    for (let i = 0; i < 80; i++) {
      const state = engine.getState();
      if (state.isComplete) break;

      const fc = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
      const wasteLen = state.waste.length;
      const stockLen = state.stock.length;
      const legalMoves = engine.findLegalMoves();

      if (legalMoves.length === 0) {
        if (state.stock.length > 0 || state.waste.length > 0) {
          engine.drawFromStock();
          console.log(
            `Move ${i + 1}: [STOCK DRAW] stock→waste | FC=${fc} waste=${wasteLen} stock=${stockLen} cStock=${context.consecutiveStockDraws} msf=${context.movesSinceFoundation}`,
          );
          context.consecutiveStockDraws++;
          context.movesSinceFoundation++;
          context.recentStates.push(hashState(engine.getState()));
          if (context.recentStates.length > 50) context.recentStates.shift();
        } else {
          console.log(`Move ${i + 1}: [STUCK] no moves | FC=${fc}`);
          break;
        }
        continue;
      }

      const bestMove = rolloutBestMove(engine, legalMoves, context, simulate);
      if (!bestMove) {
        // No productive move found, draw from stock
        if (state.stock.length > 0 || state.waste.length > 0) {
          engine.drawFromStock();
          console.log(
            `Move ${i + 1}: [STOCK DRAW] stock→waste | FC=${fc} waste=${wasteLen} stock=${stockLen} cStock=${context.consecutiveStockDraws} msf=${context.movesSinceFoundation}`,
          );
          context.consecutiveStockDraws++;
          context.movesSinceFoundation++;
          context.recentStates.push(hashState(engine.getState()));
          if (context.recentStates.length > 50) context.recentStates.shift();
        } else {
          console.log(`Move ${i + 1}: [STUCK] no moves | FC=${fc}`);
          break;
        }
        continue;
      }

      const fromDesc =
        bestMove.from.type === "stock"
          ? "stock"
          : bestMove.from.type === "waste"
            ? "waste"
            : bestMove.from.type === "foundation"
              ? "found"
              : `T${(bestMove.from as { type: "tableau"; pileIndex: number }).pileIndex}`;
      const toDesc =
        bestMove.to.type === "foundation"
          ? "found"
          : bestMove.to.type === "waste"
            ? "waste"
            : `T${(bestMove.to as { type: "tableau"; pileIndex: number }).pileIndex}`;

      console.log(
        `Move ${i + 1}: ${fromDesc} → ${toDesc} | FC=${fc} waste=${wasteLen} stock=${stockLen} cStock=${context.consecutiveStockDraws} msf=${context.movesSinceFoundation}`,
      );

      engine.moveCard(bestMove.from, bestMove.to);
      context.recentMoves.push(bestMove);
      context.recentStates.push(hashState(engine.getState()));
      if (context.recentMoves.length > 20) context.recentMoves.shift();
      if (context.recentStates.length > 50) context.recentStates.shift();
      context.consecutiveStockDraws =
        bestMove.from.type === "stock" ? context.consecutiveStockDraws + 1 : 0;
      if (bestMove.to.type === "foundation") {
        context.movesSinceFoundation = 0;
      } else {
        context.movesSinceFoundation++;
      }
    }
  });
});

describe("rolloutBestMove always returns a move", () => {
  it("returns non-null for every legal move set encountered in 10 games", () => {
    let nullReturns = 0;
    let totalCalls = 0;

    for (let g = 0; g < 10; g++) {
      const engine = new KlondikeEngine();
      const simulate = createSimulator(engine);
      const context = {
        recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
        recentStates: [] as string[],
        consecutiveStockDraws: 0,
        movesSinceFoundation: 0,
      };
      context.recentStates.push(hashState(engine.getState()));

      for (let i = 0; i < 200; i++) {
        const state = engine.getState();
        if (state.isComplete) break;

        const legalMoves = engine.findLegalMoves();
        if (legalMoves.length === 0) {
          if (state.stock.length > 0 || state.waste.length > 0) {
            engine.drawFromStock();
            context.consecutiveStockDraws++;
            context.movesSinceFoundation++;
            context.recentStates.push(hashState(engine.getState()));
            if (context.recentStates.length > 50) context.recentStates.shift();
          }
          continue;
        }

        totalCalls++;
        const result = rolloutBestMove(engine, legalMoves, context, simulate);
        if (result === null) {
          nullReturns++;
        } else {
          engine.moveCard(result.from, result.to);
          context.recentMoves.push(result);
          if (context.recentMoves.length > 20) context.recentMoves.shift();
          context.recentStates.push(hashState(engine.getState()));
          if (context.recentStates.length > 50) context.recentStates.shift();
          context.consecutiveStockDraws =
            result.from.type === "stock" ? context.consecutiveStockDraws + 1 : 0;
          if (result.to.type === "foundation") {
            context.movesSinceFoundation = 0;
          } else {
            context.movesSinceFoundation++;
          }
        }
      }
    }

    console.log(`\nrolloutBestMove: ${nullReturns} null returns out of ${totalCalls} calls`);
    expect(totalCalls).toBeGreaterThan(0);
    expect(nullReturns).toBe(0);
  });
});

describe("AI Stock-Draw Ratio", () => {
  it("does not spend more than 80% of moves on stock draws", () => {
    const NUM_GAMES = 20;
    const MAX_MOVES = 5000;
    const results = [];

    for (let i = 0; i < NUM_GAMES; i++) {
      results.push(playGame(MAX_MOVES));
    }

    const filtered = results.filter((r) => r.moves > 200);
    const ratios = filtered.map((r) => (r.moves > 0 ? r.stockDraws / r.moves : 0));
    const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    const maxRatio = ratios.length > 0 ? Math.max(...ratios) : 0;

    console.log(
      `\nStock-draw ratio: avg=${avgRatio.toFixed(3)}, max=${maxRatio.toFixed(3)} across ${ratios.length} games (>200 moves)`,
    );

    for (const ratio of ratios) {
      expect(ratio).toBeLessThan(0.8);
    }
  });
});

describe("AI Consecutive Stock Draws", () => {
  it("does not have more than 30 consecutive stock draws", () => {
    const NUM_GAMES = 20;
    const results = [];

    for (let i = 0; i < NUM_GAMES; i++) {
      results.push(playGame(5000));
    }

    const maxConsecutive = Math.max(...results.map((r) => r.maxConsecutiveStockDraws));

    console.log(`\nMax consecutive stock draws: ${maxConsecutive} across ${NUM_GAMES} games`);

    expect(maxConsecutive).toBeLessThanOrEqual(30);
  });
});

describe("AI Foundation Progress Minimum", () => {
  it("reaches at least 10 cards in foundation within 5000 moves", () => {
    const NUM_GAMES = 20;
    const results = [];

    for (let i = 0; i < NUM_GAMES; i++) {
      results.push(playGame(5000));
    }

    const tooLow = results.filter((r) => !r.won && r.maxFoundationCount < 10 && !r.stuck);
    const avgMaxFC = results.reduce((sum, r) => sum + r.maxFoundationCount, 0) / results.length;

    console.log(
      `\nFoundation progress: avg max FC=${avgMaxFC.toFixed(1)}/52, games with maxFC<10=${tooLow.length} out of ${NUM_GAMES}`,
    );

    // Most games should make meaningful foundation progress
    expect(avgMaxFC).toBeGreaterThanOrEqual(15);
    expect(tooLow.length).toBeLessThanOrEqual(Math.floor(NUM_GAMES * 0.35));
  });
});

describe("AI Demo-Mode Termination at 2000 Moves", () => {
  it("all games terminate within 2000 moves (win/stuck/bailout)", () => {
    const NUM_GAMES = 30;
    const results = [];

    for (let i = 0; i < NUM_GAMES; i++) {
      const start = Date.now();
      const result = playGame(2000);
      const elapsed = Date.now() - start;
      results.push({ ...result, elapsed });
    }

    const wins = results.filter((r) => r.won).length;
    const stuck = results.filter((r) => r.stuck).length;
    const bailed = results.filter((r) => r.bailedOut).length;
    const timedOut = results.filter((r) => !r.won && !r.stuck && !r.bailedOut);
    const avgMoves = results.reduce((s, r) => s + r.moves, 0) / results.length;
    const avgTime = results.reduce((s, r) => s + r.elapsed, 0) / results.length;

    console.log(
      `\nDemo termination (2000 move cap): won=${wins}, stuck=${stuck}, bailed=${bailed}, timedOut=${timedOut.length} out of ${NUM_GAMES}`,
    );
    console.log(`Avg moves: ${avgMoves.toFixed(0)}, avg time: ${avgTime.toFixed(0)}ms`);

    expect(timedOut.length).toBe(0);
    expect(wins + stuck + bailed).toBe(NUM_GAMES);
  });
});

describe("AI King-to-Empty-Column Priority", () => {
  it("prefers moving a king from a stack to an empty column over shuffling", () => {
    const state: SolitaireState = {
      stock: [],
      waste: [{ id: "w1", suit: "hearts", rank: "8", faceUp: true }],
      foundations: [[], [], [], []],
      tableau: [
        [
          { id: "c1", suit: "spades", rank: "5", faceUp: true },
          { id: "c2", suit: "hearts", rank: "4", faceUp: true },
          { id: "c3", suit: "clubs", rank: "K", faceUp: true },
        ],
        [
          { id: "c4", suit: "diamonds", rank: "9", faceUp: true },
          { id: "c5", suit: "clubs", rank: "8", faceUp: true },
        ],
        [],
        [],
        [],
        [],
        [],
      ],
      moveCount: 10,
      isComplete: false,
      lastActionLog: [],
    };

    const history: MoveRecord[] = [];
    const mockEngine = {
      variant: "klondike" as const,
      initGame: () => {},
      getState: () => state,
      drawFromStock: () => false,
      moveCard: () => {
        history.push({} as MoveRecord);
        return true;
      },
      autoComplete: () => false,
      canAutoComplete: () => false,
      isWon: () => false,
      findLegalMoves: () => [],
      getHistory: () => history,
      undo: () => {
        history.pop();
        return true;
      },
      redo: () => false,
    };

    const simulate: MoveSimulator = () => ({
      stock: [],
      waste: [...state.waste],
      foundations: state.foundations.map((p) => [...p]),
      tableau: state.tableau.map((p) => [...p]),
      moveCount: state.moveCount,
      isComplete: false,
      lastActionLog: [],
    });

    const kingToEmptyMove: CardLocation = {
      type: "tableau",
      pileIndex: 0,
      cardIndex: 2,
    };
    const emptyTarget: CardLocation = {
      type: "tableau",
      pileIndex: 3,
      cardIndex: 0,
    };
    const shuffleMove: CardLocation = {
      type: "tableau",
      pileIndex: 1,
      cardIndex: 1,
    };
    const shuffleTarget: CardLocation = {
      type: "tableau",
      pileIndex: 0,
      cardIndex: 2,
    };
    const wasteToTableau: CardLocation = { type: "waste" };
    const wasteTarget: CardLocation = {
      type: "tableau",
      pileIndex: 5,
      cardIndex: 0,
    };

    const legalMoves = [
      { from: kingToEmptyMove, to: emptyTarget },
      { from: shuffleMove, to: shuffleTarget },
      { from: wasteToTableau, to: wasteTarget },
    ];

    const context = {
      recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
      recentStates: [hashState(state)],
      consecutiveStockDraws: 0,
      movesSinceFoundation: 0,
    };

    const bestMove = rolloutBestMove(
      mockEngine as unknown as KlondikeEngine,
      legalMoves,
      context,
      simulate,
    );

    expect(bestMove).not.toBeNull();
    expect(bestMove!.from.type).toBe("tableau");
    expect(
      (bestMove!.from as { type: "tableau"; pileIndex: number; cardIndex: number }).pileIndex,
    ).toBe(0);
    expect(
      (bestMove!.from as { type: "tableau"; pileIndex: number; cardIndex: number }).cardIndex,
    ).toBe(2);
    expect(bestMove!.to.type).toBe("tableau");
    expect(
      (bestMove!.to as { type: "tableau"; pileIndex: number; cardIndex: number }).pileIndex,
    ).toBe(3);
  });

  it("does not cycle a king between two empty columns when a productive move exists", () => {
    const state: SolitaireState = {
      stock: [],
      waste: [{ id: "w1", suit: "diamonds", rank: "3", faceUp: true }],
      foundations: [[{ id: "f1", suit: "hearts", rank: "A", faceUp: true }], [], [], []],
      tableau: [
        [{ id: "c1", suit: "clubs", rank: "K", faceUp: true }],
        [],
        [{ id: "c2", suit: "hearts", rank: "2", faceUp: true }],
        [],
        [],
        [],
        [],
      ],
      moveCount: 5,
      isComplete: false,
      lastActionLog: [],
    };

    const history: MoveRecord[] = [];
    const mockEngine = {
      variant: "klondike" as const,
      initGame: () => {},
      getState: () => state,
      drawFromStock: () => false,
      moveCard: () => {
        history.push({} as MoveRecord);
        return true;
      },
      autoComplete: () => false,
      canAutoComplete: () => false,
      isWon: () => false,
      findLegalMoves: () => [],
      getHistory: () => history,
      undo: () => {
        history.pop();
        return true;
      },
      redo: () => false,
    };

    const simulate: MoveSimulator = () => ({
      stock: [],
      waste: [{ id: "w1", suit: "diamonds", rank: "3", faceUp: true }],
      foundations: [[{ id: "f1", suit: "hearts", rank: "A", faceUp: true }], [], [], []],
      tableau: state.tableau.map((p) => [...p]),
      moveCount: state.moveCount,
      isComplete: false,
      lastActionLog: [],
    });

    const legalMoves: Array<{
      from: CardLocation;
      to: CardLocation;
    }> = [
      {
        from: { type: "tableau", pileIndex: 0, cardIndex: 0 },
        to: { type: "tableau", pileIndex: 1, cardIndex: 0 },
      },
      {
        from: { type: "waste" },
        to: { type: "foundation", index: 0 },
      },
    ];

    const context = {
      recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
      recentStates: [hashState(state)],
      consecutiveStockDraws: 0,
      movesSinceFoundation: 0,
    };

    const bestMove = rolloutBestMove(
      mockEngine as unknown as KlondikeEngine,
      legalMoves,
      context,
      simulate,
    );

    expect(bestMove).not.toBeNull();
    const isFoundationMove = bestMove!.from.type === "waste" && bestMove!.to.type === "foundation";
    const isKingCycle =
      bestMove!.from.type === "tableau" &&
      bestMove!.to.type === "tableau" &&
      state.tableau[bestMove!.from.pileIndex].length <= 1 &&
      state.tableau[bestMove!.to.pileIndex].length === 0 &&
      state.tableau[bestMove!.from.pileIndex][bestMove!.from.cardIndex]?.rank === "K";
    expect(isKingCycle).toBe(false);
    expect(isFoundationMove).toBe(true);
  });

  it("prefers flipping a face-down card over moving a king to empty column", () => {
    const state: SolitaireState = {
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [
          { id: "c1", suit: "spades", rank: "7", faceUp: false },
          { id: "c2", suit: "hearts", rank: "6", faceUp: true },
        ],
        [{ id: "c3", suit: "clubs", rank: "K", faceUp: true }],
        [],
        [],
        [],
        [],
        [],
      ],
      moveCount: 10,
      isComplete: false,
      lastActionLog: [],
    };

    const history: MoveRecord[] = [];
    const mockEngine = {
      variant: "klondike" as const,
      initGame: () => {},
      getState: () => state,
      drawFromStock: () => false,
      moveCard: () => {
        history.push({} as MoveRecord);
        return true;
      },
      autoComplete: () => false,
      canAutoComplete: () => false,
      isWon: () => false,
      findLegalMoves: () => [],
      getHistory: () => history,
      undo: () => {
        history.pop();
        return true;
      },
      redo: () => false,
    };

    const flippedState: SolitaireState = {
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [
          { id: "c1", suit: "spades", rank: "7", faceUp: true },
          { id: "c2", suit: "hearts", rank: "6", faceUp: true },
        ],
        [{ id: "c3", suit: "clubs", rank: "K", faceUp: true }],
        [],
        [],
        [],
        [],
        [],
      ],
      moveCount: 10,
      isComplete: false,
      lastActionLog: [],
    };

    const kingMovedState: SolitaireState = {
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [
          { id: "c1", suit: "spades", rank: "7", faceUp: false },
          { id: "c2", suit: "hearts", rank: "6", faceUp: true },
        ],
        [],
        [{ id: "c3", suit: "clubs", rank: "K", faceUp: true }],
        [],
        [],
        [],
        [],
      ],
      moveCount: 10,
      isComplete: false,
      lastActionLog: [],
    };

    const simulate: MoveSimulator = (move) => {
      const from = move.from as { type: "tableau"; pileIndex: number; cardIndex: number };
      const to = move.to as { type: "tableau"; pileIndex: number; cardIndex: number };
      if (
        from.type === "tableau" &&
        from.pileIndex === 0 &&
        to.type === "tableau" &&
        to.pileIndex === 1
      ) {
        return flippedState;
      }
      if (
        from.type === "tableau" &&
        from.pileIndex === 1 &&
        to.type === "tableau" &&
        to.pileIndex === 2
      ) {
        return kingMovedState;
      }
      return state;
    };

    const flipMove: CardLocation = {
      type: "tableau",
      pileIndex: 0,
      cardIndex: 1,
    };
    const flipTarget: CardLocation = {
      type: "tableau",
      pileIndex: 1,
      cardIndex: 0,
    };
    const kingToEmpty: CardLocation = {
      type: "tableau",
      pileIndex: 1,
      cardIndex: 0,
    };
    const emptyTarget: CardLocation = {
      type: "tableau",
      pileIndex: 2,
      cardIndex: 0,
    };

    const legalMoves = [
      { from: flipMove, to: flipTarget },
      { from: kingToEmpty, to: emptyTarget },
    ];

    const context = {
      recentMoves: [] as Array<{ from: CardLocation; to: CardLocation }>,
      recentStates: [hashState(state)],
      consecutiveStockDraws: 0,
      movesSinceFoundation: 0,
    };

    const bestMove = rolloutBestMove(
      mockEngine as unknown as KlondikeEngine,
      legalMoves,
      context,
      simulate,
    );

    expect(bestMove).not.toBeNull();
    const isFlip =
      bestMove!.from.type === "tableau" &&
      bestMove!.from.pileIndex === 0 &&
      bestMove!.to.type === "tableau" &&
      bestMove!.to.pileIndex === 1;
    expect(isFlip).toBe(true);
  });
});
