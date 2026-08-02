import { SolitaireState, CardLocation, Card, SolitaireEngine } from "./types";
import { FOUNDATION_SUITS, RANK_VALUES, RANKS } from "./constants";

export interface AIMoveContext {
  recentMoves: Array<{ from: CardLocation; to: CardLocation }>;
  recentStates: string[];
  consecutiveStockDraws: number;
  movesSinceFoundation: number;
}

export type MoveSimulator = (move: {
  from: CardLocation;
  to: CardLocation;
}) => SolitaireState | null;

const CYCLE_WINDOW = 40;
const ROLLOUT_DEPTH = 20;
const ROLLOUT_TOP_N = 4;

export function hashState(state: SolitaireState): string {
  const parts: string[] = [];
  if (state.waste.length > 0) {
    const top = state.waste[state.waste.length - 1];
    parts.push(`W${top.suit[0]}${top.rank}`);
  } else {
    parts.push("W0");
  }
  for (const pile of state.foundations) {
    parts.push(pile.map((c) => `${c.suit[0]}${c.rank}`).join(""));
  }
  for (const pile of state.tableau) {
    parts.push(pile.map((c) => `${c.faceUp ? "U" : "D"}${c.suit[0]}${c.rank}`).join(""));
  }
  return parts.join("|");
}

function locationsEqual(a: CardLocation, b: CardLocation): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "stock":
    case "waste":
      return true;
    case "foundation":
      return a.index === (b as { type: "foundation"; index: number }).index;
    case "tableau":
      return a.pileIndex === (b as { type: "tableau"; pileIndex: number }).pileIndex;
    default:
      return false;
  }
}

function isReverseMove(
  move: { from: CardLocation; to: CardLocation },
  recentMoves: Array<{ from: CardLocation; to: CardLocation }>,
): boolean {
  if (recentMoves.length === 0) return false;
  const prev = recentMoves[recentMoves.length - 1];
  return (
    prev.from.type === move.to.type &&
    prev.to.type === move.from.type &&
    locationsEqual(prev.from, move.to) &&
    locationsEqual(prev.to, move.from)
  );
}

function countFaceDown(tableau: Card[][]): number {
  let count = 0;
  for (const pile of tableau) {
    for (const card of pile) {
      if (!card.faceUp) count++;
    }
  }
  return count;
}

function countBuriedFaceUp(tableau: Card[][]): number {
  let count = 0;
  for (const pile of tableau) {
    let foundFaceDown = false;
    for (const card of pile) {
      if (!card.faceUp) foundFaceDown = true;
      else if (foundFaceDown) count++;
    }
  }
  return count;
}

function evaluateState(state: SolitaireState, prevState?: SolitaireState): number {
  let score = 0;

  for (const pile of state.foundations) {
    score += pile.length * 15;
  }

  const faceDown = countFaceDown(state.tableau);
  score -= faceDown * 5;

  if (prevState) {
    const prevFaceDown = countFaceDown(prevState.tableau);
    const flipped = prevFaceDown - faceDown;
    if (flipped > 0) score += flipped * 40;
  }

  score -= countBuriedFaceUp(state.tableau) * 4;

  score -= state.waste.length * 3;

  for (const pile of state.tableau) {
    if (pile.length === 0) score += 12;
  }

  for (let f = 0; f < 4; f++) {
    const foundation = state.foundations[f];
    if (foundation.length > 0) {
      let canContinue = true;
      for (let r = foundation.length; r < 13; r++) {
        const neededRank = RANKS[r];
        const neededSuit = FOUNDATION_SUITS[f];
        let found = false;
        for (const pile of state.tableau) {
          for (const card of pile) {
            if (card.faceUp && card.rank === neededRank && card.suit === neededSuit) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          for (const card of state.waste) {
            if (card.rank === neededRank && card.suit === neededSuit) {
              found = true;
              break;
            }
          }
        }
        if (!found) {
          canContinue = false;
          break;
        }
      }
      if (canContinue) score += 30;
    }
  }

  for (const pile of state.tableau) {
    for (const card of pile) {
      if (!card.faceUp) continue;
      const foundationIdx = FOUNDATION_SUITS.indexOf(card.suit);
      if (foundationIdx < 0) continue;
      const foundation = state.foundations[foundationIdx];
      const nextRank = RANKS[foundation.length];
      if (card.rank === nextRank) {
        score += 15;
      } else if (foundation.length > 0) {
        const cardVal = RANK_VALUES[card.rank];
        const nextVal = RANK_VALUES[nextRank];
        if (cardVal === nextVal - 1) {
          score += 5;
        }
      }
    }
  }

  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    const foundationIdx = FOUNDATION_SUITS.indexOf(topWaste.suit);
    if (foundationIdx >= 0) {
      const foundation = state.foundations[foundationIdx];
      const nextRank = RANKS[foundation.length];
      if (topWaste.rank === nextRank) {
        score += 12;
      }
    }
  }

  for (const pile of state.tableau) {
    for (let i = 0; i < pile.length; i++) {
      const card = pile[i];
      if (!card.faceUp) continue;
      const rv = RANK_VALUES[card.rank];
      if (rv > 5) continue;
      let depthBelow = 0;
      for (let j = i + 1; j < pile.length; j++) {
        if (pile[j].faceUp) depthBelow++;
      }
      if (depthBelow >= 3) score -= 5;
    }
  }

  return score;
}

function quickEvaluate(state: SolitaireState): number {
  let score = 0;
  for (const pile of state.foundations) {
    score += pile.length * 100;
  }
  const faceDown = countFaceDown(state.tableau);
  score -= faceDown * 8;
  score -= countBuriedFaceUp(state.tableau) * 5;
  score -= state.waste.length * 2;
  for (const pile of state.tableau) {
    if (pile.length === 0) score += 30;
  }
  for (const pile of state.tableau) {
    for (const card of pile) {
      if (!card.faceUp) continue;
      const foundationIdx = FOUNDATION_SUITS.indexOf(card.suit);
      if (foundationIdx < 0) continue;
      const foundation = state.foundations[foundationIdx];
      const nextRank = RANKS[foundation.length];
      if (card.rank === nextRank) {
        score += 25;
      } else if (foundation.length > 0) {
        const cardVal = RANK_VALUES[card.rank];
        const nextVal = RANK_VALUES[nextRank];
        if (cardVal === nextVal - 1) {
          score += 8;
        }
      }
    }
  }
  return score;
}

export function findBestMove(
  state: SolitaireState,
  legalMoves: Array<{ from: CardLocation; to: CardLocation }>,
  context?: AIMoveContext,
  simulate?: MoveSimulator,
): { from: CardLocation; to: CardLocation } | null {
  if (legalMoves.length === 0) return null;

  const ctx: AIMoveContext = context || {
    recentMoves: [],
    recentStates: [],
    consecutiveStockDraws: 0,
    movesSinceFoundation: 0,
  };

  if (!simulate) {
    return legalMoves[0];
  }

  const recentStateSet = new Set(ctx.recentStates.slice(-CYCLE_WINDOW));

  const simulations: Array<{
    move: { from: CardLocation; to: CardLocation };
    hash: string;
    isCycle: boolean;
    score: number;
    isUnproductive: boolean;
  }> = [];

  for (const move of legalMoves) {
    const resultState = simulate(move);
    if (!resultState) continue;

    const reverse = isReverseMove(move, ctx.recentMoves);
    const hash = hashState(resultState);
    const hashCycle = recentStateSet.has(hash);

    let willFlipCard = false;
    let willEmptyPile = false;
    let isKingToEmpty = false;
    let isUnproductiveTableauMove = false;

    if (move.from.type === "tableau" && move.to.type === "tableau") {
      const sourcePile = state.tableau[move.from.pileIndex];
      const destPile = state.tableau[move.to.pileIndex];
      const cardBelowIndex = move.from.cardIndex - 1;
      willFlipCard = cardBelowIndex >= 0 && !sourcePile[cardBelowIndex].faceUp;
      willEmptyPile = move.from.cardIndex === 0;
      const isDestEmpty = destPile.length === 0;
      const movedCard = sourcePile[move.from.cardIndex];
      isKingToEmpty = isDestEmpty && movedCard?.rank === "K";
      isUnproductiveTableauMove = !willFlipCard && !willEmptyPile && !isKingToEmpty;
    } else if (move.from.type === "tableau") {
      const sourcePile = state.tableau[move.from.pileIndex];
      const cardBelowIndex = move.from.cardIndex - 1;
      willFlipCard = cardBelowIndex >= 0 && !sourcePile[cardBelowIndex].faceUp;
      willEmptyPile = move.from.cardIndex === 0;
    }

    let moveBonus = 0;
    if (move.from.type === "waste" && move.to.type === "foundation") {
      moveBonus = 100;
    } else if (move.from.type === "waste" && move.to.type === "tableau") {
      moveBonus = 20;
    } else if (move.from.type === "tableau" && move.to.type === "foundation") {
      moveBonus = 60;
    } else if (move.from.type === "tableau" && move.to.type === "tableau") {
      const movedCard = state.tableau[move.from.pileIndex][move.from.cardIndex];
      const destPile = state.tableau[move.to.pileIndex];
      const isDestEmpty = destPile.length === 0;
      isKingToEmpty = isDestEmpty && movedCard?.rank === "K";

      if (isKingToEmpty && !willEmptyPile) {
        moveBonus = 30;
      } else if (isKingToEmpty && willEmptyPile) {
        moveBonus = -25;
      } else if (!isUnproductiveTableauMove && movedCard) {
        const foundationIdx = FOUNDATION_SUITS.indexOf(movedCard.suit);
        if (foundationIdx >= 0) {
          const foundation = state.foundations[foundationIdx];
          const nextRank = RANKS[foundation.length];
          if (movedCard.rank === nextRank) {
            moveBonus = 10;
          }
        }
      }
    }

    if (willFlipCard) {
      moveBonus += 35;
      if (move.from.type === "tableau") {
        const sourcePile = state.tableau[move.from.pileIndex];
        const cardBelowIndex = move.from.cardIndex - 1;
        if (cardBelowIndex >= 0) {
          const revealedCard = sourcePile[cardBelowIndex];
          const foundationIdx = FOUNDATION_SUITS.indexOf(revealedCard.suit);
          if (foundationIdx >= 0) {
            const foundation = state.foundations[foundationIdx];
            const nextRank = RANKS[foundation.length];
            if (revealedCard.rank === nextRank) {
              moveBonus += 20;
            }
          }
        }
      }
    }

    if (
      move.from.type === "tableau" &&
      move.to.type === "tableau" &&
      willEmptyPile &&
      !isKingToEmpty
    ) {
      const nonEmptyPiles = state.tableau.filter((p) => p.length > 0).length;
      if (nonEmptyPiles > 1) {
        moveBonus -= 15;
      }
    }

    const shufflingPenalty = isUnproductiveTableauMove
      ? -50 - Math.min(ctx.movesSinceFoundation * 3, 60)
      : 0;

    simulations.push({
      move,
      hash,
      isCycle: reverse || hashCycle,
      isUnproductive: isUnproductiveTableauMove,
      score: evaluateState(resultState, state) + moveBonus + shufflingPenalty,
    });
  }

  if (simulations.length === 0) return null;

  simulations.sort((a, b) => b.score - a.score);

  if (ctx.movesSinceFoundation > 8) {
    const productiveMove = simulations.find((s) => !s.isCycle && !s.isUnproductive);
    if (productiveMove) return productiveMove.move;
  }

  const bestNonCyclic = simulations.find((s) => !s.isCycle);
  return bestNonCyclic ? bestNonCyclic.move : null;
}

function greedyQuickSelect(
  state: SolitaireState,
  simulate: MoveSimulator,
  moves: Array<{ from: CardLocation; to: CardLocation }>,
): { from: CardLocation; to: CardLocation } | null {
  let bestScore = -Infinity;
  let bestMove: { from: CardLocation; to: CardLocation } | null = null;

  for (const move of moves) {
    const result = simulate(move);
    if (!result) continue;

    let moveBonus = 0;
    if (move.from.type === "waste" && move.to.type === "foundation") moveBonus = 200;
    else if (move.from.type === "tableau" && move.to.type === "foundation") moveBonus = 150;
    else if (move.from.type === "tableau" && move.to.type === "tableau") {
      const sourcePile = state.tableau[move.from.pileIndex];
      const destPile = state.tableau[move.to.pileIndex];
      const cardBelowIndex = move.from.cardIndex - 1;
      const willFlipCard = cardBelowIndex >= 0 && !sourcePile[cardBelowIndex].faceUp;
      const willEmptyPile = move.from.cardIndex === 0;
      const isDestEmpty = destPile.length === 0;
      const movedCard = sourcePile[move.from.cardIndex];
      const isKingToEmpty = isDestEmpty && movedCard?.rank === "K";

      if (isKingToEmpty && !willEmptyPile) {
        moveBonus = 60;
      } else if (isKingToEmpty && willEmptyPile) {
        moveBonus = -30;
      } else if (willFlipCard) {
        moveBonus = 100;
      } else if (willEmptyPile) {
        moveBonus = 60;
      } else {
        moveBonus = -40;
      }
    }

    const score = quickEvaluate(result) + moveBonus;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

export function rolloutBestMove(
  engine: SolitaireEngine,
  legalMoves: Array<{ from: CardLocation; to: CardLocation }>,
  context: AIMoveContext,
  simulate: MoveSimulator,
): { from: CardLocation; to: CardLocation } | null {
  if (legalMoves.length === 0) return null;

  const recentStateSet = new Set(context.recentStates.slice(-CYCLE_WINDOW));
  const currentState = engine.getState();

  const candidates: Array<{
    move: { from: CardLocation; to: CardLocation };
    immediateScore: number;
    isCycle: boolean;
  }> = [];

  for (const move of legalMoves) {
    const resultState = simulate(move);
    if (!resultState) continue;

    const reverse = isReverseMove(move, context.recentMoves);
    const hash = hashState(resultState);
    const hashCycle = recentStateSet.has(hash);

    let moveBonus = 0;
    if (move.from.type === "waste" && move.to.type === "foundation") {
      moveBonus = 100;
    } else if (move.from.type === "waste" && move.to.type === "tableau") {
      moveBonus = 20;
    } else if (move.from.type === "tableau" && move.to.type === "foundation") {
      moveBonus = 60;
    } else if (move.from.type === "tableau" && move.to.type === "tableau") {
      const sourcePile = currentState.tableau[move.from.pileIndex];
      const destPile = currentState.tableau[move.to.pileIndex];
      const cardBelowIndex = move.from.cardIndex - 1;
      const willFlipCard = cardBelowIndex >= 0 && !sourcePile[cardBelowIndex].faceUp;
      const willEmptyPile = move.from.cardIndex === 0;
      const isDestEmpty = destPile.length === 0;
      const movedCard = sourcePile[move.from.cardIndex];
      const isKingToEmpty = isDestEmpty && movedCard?.rank === "K";

      if (isKingToEmpty && !willEmptyPile) {
        moveBonus = 30;
      } else if (isKingToEmpty && willEmptyPile) {
        moveBonus = -25;
      } else if (!willFlipCard && !willEmptyPile) {
        moveBonus = -50 - Math.min(context.movesSinceFoundation * 3, 60);
      } else if (willFlipCard) {
        moveBonus = 40;
        if (cardBelowIndex >= 0) {
          const revealedCard = sourcePile[cardBelowIndex];
          const foundationIdx = FOUNDATION_SUITS.indexOf(revealedCard.suit);
          if (foundationIdx >= 0) {
            const foundation = currentState.foundations[foundationIdx];
            const nextRank = RANKS[foundation.length];
            if (revealedCard.rank === nextRank) {
              moveBonus += 20;
            }
          }
        }
      } else if (willEmptyPile) {
        moveBonus = 20;
      }
    }

    candidates.push({
      move,
      immediateScore: evaluateState(resultState, currentState) + moveBonus,
      isCycle: reverse || hashCycle,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.immediateScore - a.immediateScore);

  const nonCyclic = candidates.filter((c) => !c.isCycle);
  const pool = nonCyclic.length > 0 ? nonCyclic : candidates;
  const top = pool.slice(0, Math.min(ROLLOUT_TOP_N, pool.length));

  if (top.length <= 1) return top[0].move;

  const historyLen = engine.getHistory().length;

  let bestCombined = -Infinity;
  let bestMove = top[0].move;

  for (const candidate of top) {
    const ok = engine.moveCard(candidate.move.from, candidate.move.to);
    if (!ok) continue;

    const afterFirst = engine.getState();
    if (afterFirst.isComplete) {
      while (engine.getHistory().length > historyLen) engine.undo();
      return candidate.move;
    }

    let rolloutScore = quickEvaluate(afterFirst);

    for (let d = 0; d < ROLLOUT_DEPTH; d++) {
      const current = engine.getState();
      if (current.isComplete) {
        rolloutScore += 10000;
        break;
      }

      const moves = engine.findLegalMoves();
      if (moves.length === 0) {
        if (current.stock.length > 0 || current.waste.length > 0) {
          engine.drawFromStock();
          rolloutScore = quickEvaluate(engine.getState());
          continue;
        }
        break;
      }

      const greedyMove = greedyQuickSelect(current, simulate, moves);
      if (!greedyMove) break;

      const mok = engine.moveCard(greedyMove.from, greedyMove.to);
      if (!mok) break;

      const s = quickEvaluate(engine.getState());
      if (s > rolloutScore) rolloutScore = s;
    }

    while (engine.getHistory().length > historyLen) engine.undo();

    const combined = rolloutScore * 0.6 + candidate.immediateScore * 0.4;
    if (combined > bestCombined) {
      bestCombined = combined;
      bestMove = candidate.move;
    }
  }

  while (engine.getHistory().length > historyLen) engine.undo();

  return bestMove;
}

export function isStockDrawSignal(move: { from: CardLocation; to: CardLocation }): boolean {
  return move.from.type === "stock" && move.to.type === "waste";
}
