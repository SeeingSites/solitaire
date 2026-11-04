import { CardLocation, SolitaireState } from "./types";
import { hashState } from "./AI";

export const ENABLE_PLAY_LOGGING = true;

const STORAGE_KEY = "solitaire-play-logs";

/** Keep only the newest entries; each is ~1 KB and localStorage holds ~5 MB. */
export const MAX_LOG_ENTRIES = 1000;

export type LoggedMove = {
  timestamp: number;
  gameStateHash: string;
  legalMoves: Array<{ from: CardLocation; to: CardLocation }>;
  chosenMove: { from: CardLocation; to: CardLocation };
  foundationCount: number;
  wasteSize: number;
  faceDownCount: number;
  moveCount: number;
};

let currentSessionId: string | null = null;

function countFaceDown(tableau: SolitaireState["tableau"]): number {
  let count = 0;
  for (const pile of tableau) {
    for (const card of pile) {
      if (!card.faceUp) count++;
    }
  }
  return count;
}

export function newSession(): string {
  currentSessionId = Date.now().toString(36);
  return currentSessionId;
}

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

async function postToServer(entry: LoggedMove): Promise<void> {
  // /api/logs only exists on the Vite dev server (see vite.config.js).
  if (!import.meta.env.DEV || !currentSessionId) return;
  try {
    await fetch(`/api/logs/${currentSessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    // Server unavailable (e.g. production build) — silently ignore
  }
}

export function logMove(
  state: SolitaireState,
  legalMoves: Array<{ from: CardLocation; to: CardLocation }>,
  chosenMove: { from: CardLocation; to: CardLocation },
): void {
  if (!ENABLE_PLAY_LOGGING) return;

  // Logging must never break gameplay: it runs mid-move, after the engine
  // has changed but before the UI state is published.
  try {
    recordMove(state, legalMoves, chosenMove);
  } catch {
    // Ignore: a lost log entry is harmless.
  }
}

function recordMove(
  state: SolitaireState,
  legalMoves: Array<{ from: CardLocation; to: CardLocation }>,
  chosenMove: { from: CardLocation; to: CardLocation },
): void {
  if (!currentSessionId) newSession();

  const entry: LoggedMove = {
    timestamp: Date.now(),
    gameStateHash: hashState(state),
    legalMoves,
    chosenMove,
    foundationCount: state.foundations.reduce((sum, p) => sum + p.length, 0),
    wasteSize: state.waste.length,
    faceDownCount: countFaceDown(state.tableau),
    moveCount: state.moveCount,
  };

  const logs = getLogs();
  logs.push(entry);
  saveLogs(logs.slice(-MAX_LOG_ENTRIES));

  void postToServer(entry);
}

function saveLogs(logs: LoggedMove[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Quota exceeded (other data on the origin) or storage disabled: keep
    // the newest half and try once more, then give up quietly.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-Math.floor(logs.length / 2))));
    } catch {
      // Storage unavailable.
    }
  }
}

export function getLogs(): LoggedMove[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function exportLogs(): void {
  const logs = getLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `solitaire-logs-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable.
  }
  currentSessionId = null;
}

export function hasLogs(): boolean {
  return getLogs().length > 0;
}
