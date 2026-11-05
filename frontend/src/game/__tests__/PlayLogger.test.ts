import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KlondikeEngine } from "../Klondike";
import { logMove, getLogs, clearLogs, MAX_LOG_ENTRIES } from "../PlayLogger";

const move = {
  from: { type: "waste" as const },
  to: { type: "foundation" as const, index: 0 },
};

describe("PlayLogger", () => {
  beforeEach(() => {
    clearLogs();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}"))),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearLogs();
  });

  it("caps stored entries to the newest MAX_LOG_ENTRIES", () => {
    const state = new KlondikeEngine().getState();
    for (let i = 0; i < MAX_LOG_ENTRIES + 25; i++) {
      logMove({ ...state, moveCount: i }, [], move);
    }
    const logs = getLogs();
    expect(logs).toHaveLength(MAX_LOG_ENTRIES);
    expect(logs[logs.length - 1].moveCount).toBe(MAX_LOG_ENTRIES + 24);
  });

  it("never throws when storage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const state = new KlondikeEngine().getState();
    expect(() => logMove(state, [], move)).not.toThrow();
  });

  it("returns no logs when stored data is corrupt", () => {
    localStorage.setItem("solitaire-play-logs", "{not json");
    expect(getLogs()).toEqual([]);
    localStorage.setItem("solitaire-play-logs", '{"an":"object"}');
    expect(getLogs()).toEqual([]);
  });
});
