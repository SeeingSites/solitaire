import { CardLocation, SolitaireState } from "./types";
import { hashState } from "./AI";

export const ENABLE_PLAY_LOGGING = true;

const STORAGE_KEY = "solitaire-play-logs";

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
  if (!currentSessionId) return;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

  postToServer(entry);
}

export function getLogs(): LoggedMove[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
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
  localStorage.removeItem(STORAGE_KEY);
  currentSessionId = null;
}

export function hasLogs(): boolean {
  return getLogs().length > 0;
}
