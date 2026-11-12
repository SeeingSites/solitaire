import { create } from "zustand";
import { SolitaireEngine, SolitaireState, CardLocation } from "../game/types";
import { KlondikeEngine } from "../game/Klondike";
import { rolloutBestMove, findBestMove, hashState, MoveSimulator } from "../game/AI";
import { logMove, newSession } from "../game/PlayLogger";

type ScoringMode = "standard" | "vegas";
type DrawCount = 1 | 3;

interface GameStore {
  engine: KlondikeEngine;
  state: SolitaireState;
  theme: "dark" | "light";
  selectedCard: CardLocation | null;
  drawCount: DrawCount;
  scoringMode: ScoringMode;
  hint: { from: CardLocation; to: CardLocation } | null;

  // Demo mode
  isDemoMode: boolean;
  isStalemate: boolean;
  wonByDemo: boolean;
  demoSpeed: number;

  // Stalemate tracking
  stockReshuffles: number;
  foundationCountAtLastReshuffle: number;

  // AI context
  recentMoves: Array<{ from: CardLocation; to: CardLocation }>;
  recentStates: string[];
  movesSinceFoundation: number;
  consecutiveStockDraws: number;
  demoMoveCount: number;

  // Actions
  startGame: () => void;
  drawFromStock: () => void;
  moveCard: (from: CardLocation, to: CardLocation) => void;
  autoComplete: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  setDrawCount: (count: DrawCount) => void;
  setScoringMode: (mode: ScoringMode) => void;
  requestHint: () => void;
  clearHint: () => void;

  // Selection
  selectCard: (location: CardLocation | null) => void;

  // Demo
  startDemo: () => void;
  stopDemo: () => void;
  setDemoSpeed: (ms: number) => void;

  // Theme
  toggleTheme: () => void;
}

const loadTheme = (): "dark" | "light" => {
  try {
    const saved = localStorage.getItem("solitaire-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return "dark";
};

const saveTheme = (theme: "dark" | "light") => {
  try {
    localStorage.setItem("solitaire-theme", theme);
  } catch {
    /* ignore */
  }
};

const loadDrawCount = (): DrawCount => {
  try {
    const saved = localStorage.getItem("solitaire-draw");
    if (saved === "3") return 3;
  } catch {
    /* ignore */
  }
  return 1;
};

const saveDrawCount = (count: DrawCount) => {
  try {
    localStorage.setItem("solitaire-draw", String(count));
  } catch {
    /* ignore */
  }
};

const loadScoringMode = (): ScoringMode => {
  try {
    const saved = localStorage.getItem("solitaire-scoring");
    if (saved === "vegas") return "vegas";
  } catch {
    /* ignore */
  }
  return "standard";
};

const saveScoringMode = (mode: ScoringMode) => {
  try {
    localStorage.setItem("solitaire-scoring", mode);
  } catch {
    /* ignore */
  }
};

let demoTimer: ReturnType<typeof setTimeout> | null = null;
let demoGeneration = 0;

const STALEMATERESHUFFLE_THRESHOLD = 20;
const STALEMATE_FC_THRESHOLD = 1;
const MAX_DEMO_MOVES = 2000;
const MAX_MOVES_WITHOUT_FC = 200;

function checkStalemate(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  currentFoundationCount: number,
): boolean {
  const store = get();
  const reshuffles = (store.stockReshuffles ?? 0) + 1;
  const fcAtLast = store.foundationCountAtLastReshuffle ?? 0;
  const fcProgress = currentFoundationCount - fcAtLast;

  if (reshuffles >= STALEMATERESHUFFLE_THRESHOLD && fcProgress <= STALEMATE_FC_THRESHOLD) {
    set({
      isDemoMode: false,
      isStalemate: true,
      stockReshuffles: reshuffles,
      foundationCountAtLastReshuffle: currentFoundationCount,
    });
    return true;
  }

  set({ stockReshuffles: reshuffles, foundationCountAtLastReshuffle: currentFoundationCount });
  return false;
}

function bailDemo(set: (partial: Partial<GameStore>) => void): void {
  set({ isDemoMode: false, isStalemate: true });
}

function clearDemoTimer() {
  if (demoTimer !== null) {
    clearTimeout(demoTimer);
    demoTimer = null;
  }
}

function runDemoLoop(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  generation: number,
) {
  const {
    engine,
    isDemoMode,
    demoSpeed,
    recentMoves,
    recentStates,
    movesSinceFoundation,
    consecutiveStockDraws,
    demoMoveCount,
  } = get();

  if (!isDemoMode || generation !== demoGeneration) return;

  if (engine.isWon()) {
    set({ isDemoMode: false, wonByDemo: true });
    return;
  }

  if (demoMoveCount >= MAX_DEMO_MOVES) {
    bailDemo(set);
    return;
  }

  const state = engine.getState();
  const legalMoves = engine.findLegalMoves();
  const prevFoundationCount = state.foundations.reduce((sum, p) => sum + p.length, 0);

  const stockWasEmpty = state.stock.length === 0;

  if (movesSinceFoundation > 5 && (state.stock.length > 0 || state.waste.length > 0)) {
    engine.drawFromStock();
    const newState = engine.getState();
    const newHash = hashState(newState);
    const newStates = [...recentStates, newHash];
    if (newStates.length > 50) newStates.shift();
    const newStockLen = newState.stock.length;
    const newFoundationCount = newState.foundations.reduce((sum, p) => sum + p.length, 0);
    const foundationProgressed = newFoundationCount > prevFoundationCount;
    set({
      state: newState,
      recentStates: newStates,
      consecutiveStockDraws: consecutiveStockDraws + 1,
      movesSinceFoundation: foundationProgressed ? 0 : 3,
      demoMoveCount: demoMoveCount + 1,
    });
    if (stockWasEmpty && newStockLen > 0) {
      const stalemateResult = checkStalemate(get, set, prevFoundationCount);
      if (stalemateResult) return;
    }
    demoTimer = setTimeout(() => runDemoLoop(get, set, generation), demoSpeed);
    return;
  }

  if (legalMoves.length === 0) {
    if (state.stock.length > 0 || state.waste.length > 0) {
      engine.drawFromStock();
      const newState = engine.getState();
      const newHash = hashState(newState);
      const newStates = [...recentStates, newHash];
      if (newStates.length > 50) newStates.shift();
      const newStockLen = newState.stock.length;
      set({
        state: newState,
        recentStates: newStates,
        consecutiveStockDraws: consecutiveStockDraws + 1,
        movesSinceFoundation: movesSinceFoundation + 1,
        demoMoveCount: demoMoveCount + 1,
      });
      if (stockWasEmpty && newStockLen > 0) {
        const stalemateResult = checkStalemate(get, set, prevFoundationCount);
        if (stalemateResult) return;
      }
      demoTimer = setTimeout(() => runDemoLoop(get, set, generation), demoSpeed);
    } else {
      bailDemo(set);
    }
    return;
  }

  const simulate: MoveSimulator = (move) => {
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

  const bestMove = rolloutBestMove(
    engine,
    legalMoves,
    {
      recentMoves,
      recentStates,
      consecutiveStockDraws,
      movesSinceFoundation,
    },
    simulate,
  );

  if (bestMove) {
    engine.moveCard(bestMove.from, bestMove.to);
    const newState = engine.getState();
    const newHash = hashState(newState);
    const newFoundationCount = newState.foundations.reduce((sum, p) => sum + p.length, 0);
    const foundationProgressed = newFoundationCount > prevFoundationCount;
    const newStates = [...recentStates, newHash];
    if (newStates.length > 50) newStates.shift();
    set({
      state: newState,
      recentMoves: [...recentMoves.slice(-19), bestMove],
      recentStates: newStates,
      movesSinceFoundation: foundationProgressed ? 0 : movesSinceFoundation + 1,
      consecutiveStockDraws: bestMove.from.type === "stock" ? consecutiveStockDraws + 1 : 0,
      demoMoveCount: demoMoveCount + 1,
    });
    if (!foundationProgressed && movesSinceFoundation + 1 >= MAX_MOVES_WITHOUT_FC) {
      bailDemo(set);
      return;
    }
  } else {
    if (state.stock.length > 0 || state.waste.length > 0) {
      engine.drawFromStock();
      const newState = engine.getState();
      const newHash = hashState(newState);
      const newStates = [...recentStates, newHash];
      if (newStates.length > 50) newStates.shift();
      const newStockLen = newState.stock.length;
      set({
        state: newState,
        recentStates: newStates,
        consecutiveStockDraws: consecutiveStockDraws + 1,
        movesSinceFoundation: movesSinceFoundation + 1,
        demoMoveCount: demoMoveCount + 1,
      });
      if (stockWasEmpty && newStockLen > 0) {
        const stalemateResult = checkStalemate(get, set, prevFoundationCount);
        if (stalemateResult) return;
      }
    } else {
      bailDemo(set);
      return;
    }
  }

  demoTimer = setTimeout(() => runDemoLoop(get, set, generation), demoSpeed);
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialDraw = loadDrawCount();
  const engine = new KlondikeEngine(initialDraw);
  return {
    engine,
    state: engine.getState(),
    theme: loadTheme(),
    selectedCard: null,
    drawCount: initialDraw,
    scoringMode: loadScoringMode(),
    hint: null,
    isDemoMode: false,
    isStalemate: false,
    wonByDemo: false,
    demoSpeed: 500,
    recentMoves: [],
    recentStates: [],
    movesSinceFoundation: 0,
    consecutiveStockDraws: 0,
    stockReshuffles: 0,
    foundationCountAtLastReshuffle: 0,
    demoMoveCount: 0,

    startGame: () => {
      clearDemoTimer();
      newSession();
      const { drawCount } = get();
      const engine = new KlondikeEngine(drawCount);
      set({
        engine,
        state: engine.getState(),
        selectedCard: null,
        hint: null,
        isDemoMode: false,
        isStalemate: false,
        wonByDemo: false,
        recentMoves: [],
        recentStates: [],
        movesSinceFoundation: 0,
        consecutiveStockDraws: 0,
        stockReshuffles: 0,
        foundationCountAtLastReshuffle: 0,
        demoMoveCount: 0,
      });
    },

    drawFromStock: () => {
      const { engine } = get();
      engine.drawFromStock();
      set({ state: engine.getState(), selectedCard: null, hint: null });
    },

    moveCard: (from: CardLocation, to: CardLocation) => {
      const { engine } = get();
      const preState = engine.getState();
      const legalMoves = engine.findLegalMoves();
      if (engine.moveCard(from, to)) logMove(preState, legalMoves, { from, to });
      set({ state: engine.getState(), selectedCard: null, hint: null });
    },

    autoComplete: () => {
      const { engine } = get();
      engine.autoComplete();
      set({ state: engine.getState(), selectedCard: null, hint: null });
    },

    undo: () => {
      const { engine } = get();
      engine.undo();
      set({ state: engine.getState(), selectedCard: null, hint: null, wonByDemo: false });
    },

    redo: () => {
      const { engine } = get();
      engine.redo();
      set({ state: engine.getState(), selectedCard: null, hint: null });
    },

    reset: () => {
      clearDemoTimer();
      const { drawCount } = get();
      const engine = new KlondikeEngine(drawCount);
      set({
        engine,
        state: engine.getState(),
        selectedCard: null,
        hint: null,
        isDemoMode: false,
        isStalemate: false,
        wonByDemo: false,
        recentMoves: [],
        recentStates: [],
        movesSinceFoundation: 0,
        consecutiveStockDraws: 0,
        stockReshuffles: 0,
        foundationCountAtLastReshuffle: 0,
        demoMoveCount: 0,
      });
    },

    setDrawCount: (count: DrawCount) => {
      saveDrawCount(count);
      const { engine } = get();
      engine.setDrawCount(count);
      set({ drawCount: count });
    },

    setScoringMode: (mode: ScoringMode) => {
      saveScoringMode(mode);
      set({ scoringMode: mode });
    },

    requestHint: () => {
      const { engine, recentMoves, recentStates, consecutiveStockDraws, movesSinceFoundation } = get();
      const legalMoves = engine.findLegalMoves();
      if (legalMoves.length === 0) {
        set({ hint: null });
        return;
      }

      const simulate: MoveSimulator = (move) => {
        const ok = engine.moveCard(move.from, move.to);
        if (!ok) return null;
        const s = engine.getState();
        engine.undo();
        return { ...s, lastActionLog: [] };
      };

      const best = findBestMove(
        engine.getState(),
        legalMoves,
        {
          recentMoves,
          recentStates,
          consecutiveStockDraws,
          movesSinceFoundation,
        },
        simulate,
      );

      set({ hint: best });
      // Auto-clear after 4 seconds
      setTimeout(() => {
        if (get().hint === best) set({ hint: null });
      }, 4000);
    },

    clearHint: () => set({ hint: null }),

    selectCard: (location: CardLocation | null) => {
      set({ selectedCard: location, hint: null });
    },

    startDemo: () => {
      clearDemoTimer();
      demoGeneration++;
      const state = get().engine.getState();
      set({
        isDemoMode: true,
        isStalemate: false,
        wonByDemo: false,
        hint: null,
        recentMoves: [],
        recentStates: [hashState(state)],
        movesSinceFoundation: 0,
        consecutiveStockDraws: 0,
        stockReshuffles: 0,
        foundationCountAtLastReshuffle: 0,
        demoMoveCount: 0,
      });
      runDemoLoop(get, set, demoGeneration);
    },

    stopDemo: () => {
      clearDemoTimer();
      set({ isDemoMode: false });
    },

    setDemoSpeed: (ms: number) => {
      set({ demoSpeed: ms });
    },

    toggleTheme: () => {
      const { theme } = get();
      const newTheme = theme === "dark" ? "light" : "dark";
      saveTheme(newTheme);
      set({ theme: newTheme });
    },
  };
});
