import { useCallback, useEffect, useState } from "react";
import { useGameStore } from "../store/useGameStore";
import DragDropProvider from "./DragDropProvider";
import StockPile from "./StockPile";
import WastePile from "./WastePile";
import FoundationPile from "./FoundationPile";
import TableauPile from "./TableauPile";
import WinCascade from "./WinCascade";
import { SUIT_SYMBOLS, FOUNDATION_SUITS } from "../game/constants";
import { canStackOnFoundation } from "../game/Deck";
import { CardLocation } from "../game/types";
import { exportLogs, hasLogs } from "../game/PlayLogger";
import { sound } from "../game/Sound";

const SPEED_OPTIONS = [
  { label: "Slow", value: 1000 },
  { label: "Normal", value: 500 },
  { label: "Fast", value: 200 },
];

export default function GameBoard() {
  const {
    state,
    drawFromStock,
    moveCard,
    autoComplete,
    undo,
    redo,
    selectedCard,
    selectCard,
    isDemoMode,
    isStalemate,
    wonByDemo,
    demoSpeed,
    startDemo,
    stopDemo,
    setDemoSpeed,
    drawCount,
    setDrawCount,
    scoringMode,
    vegasRules,
    setVegasRules,
    dealSeed,
    hint,
    requestHint,
    clearHint,
  } = useGameStore();

  const [logsExist, setLogsExist] = useState(hasLogs);
  const [seconds, setSeconds] = useState(0);
  const [soundOn, setSoundOn] = useState(sound.isEnabled());
  const [seedInput, setSeedInput] = useState("");
  const [copied, setCopied] = useState(false);

  const foundationCount = state.foundations.reduce((sum, p) => sum + p.length, 0);
  const standardScore = foundationCount * 10 + Math.max(0, 100 - state.moveCount);
  const vegasScore = -52 + foundationCount * 5;
  const score = scoringMode === "vegas" || vegasRules ? vegasScore : standardScore;

  const [cascadeDone, setCascadeDone] = useState(false);
  const [wasComplete, setWasComplete] = useState(state.isComplete);
  if (state.isComplete !== wasComplete) {
    setWasComplete(state.isComplete);
    setCascadeDone(false);
    if (state.isComplete) sound.win();
  }
  const cascadePhase = !state.isComplete ? "idle" : cascadeDone ? "done" : "cascading";

  useEffect(() => {
    const interval = setInterval(() => setLogsExist(hasLogs()), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (state.moveCount === 0) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state.moveCount > 0]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isDemoMode || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === "u" && state.moveCount > 0) {
        e.preventDefault();
        sound.click();
        undo();
      } else if (key === "r") {
        e.preventDefault();
        sound.click();
        redo();
      } else if (key === "h") {
        e.preventDefault();
        sound.click();
        requestHint();
      } else if (key === "n") {
        e.preventDefault();
        handleNewGame();
      } else if (key === "a") {
        e.preventDefault();
        sound.move();
        autoComplete();
      } else if (key === "d") {
        e.preventDefault();
        sound.draw();
        drawFromStock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDemoMode, state.moveCount, undo, redo, requestHint, autoComplete, drawFromStock]);

  const handleCascadeComplete = useCallback(() => {
    setCascadeDone(true);
  }, []);

  const handleStockClick = () => {
    if (isDemoMode) return;
    sound.draw();
    drawFromStock();
  };

  const handleWasteClick = () => {
    if (isDemoMode) return;
    sound.click();
    if (selectedCard?.type === "waste") {
      selectCard(null);
    } else if (state.waste.length > 0) {
      selectCard({ type: "waste" });
    }
  };

  const handleFoundationClick = (index: number) => {
    if (isDemoMode) return;
    sound.click();
    if (selectedCard) {
      const to: CardLocation = { type: "foundation", index };
      moveCard(selectedCard, to);
      sound.foundation();
    }
  };

  const handleTableauClick = (pileIndex: number, cardIndex: number) => {
    if (isDemoMode) return;
    sound.click();
    if (selectedCard) {
      const to: CardLocation = { type: "tableau", pileIndex, cardIndex };
      moveCard(selectedCard, to);
      sound.move();
    } else {
      selectCard({ type: "tableau", pileIndex, cardIndex });
    }
  };

  const tryAutoMoveToFoundation = (card: { suit: string; rank: string }) => {
    for (let i = 0; i < 4; i++) {
      if (canStackOnFoundation(card as never, state.foundations[i], FOUNDATION_SUITS[i])) {
        moveCard({ type: "waste" }, { type: "foundation", index: i });
        sound.foundation();
        return true;
      }
    }
    return false;
  };

  const handleWasteDoubleClick = () => {
    if (isDemoMode || state.waste.length === 0) return;
    selectCard(null);
    const card = state.waste[state.waste.length - 1];
    tryAutoMoveToFoundation(card);
  };

  const handleTableauDoubleClick = (pileIndex: number, cardIndex: number) => {
    if (isDemoMode) return;
    const pile = state.tableau[pileIndex];
    if (cardIndex !== pile.length - 1) return;
    selectCard(null);
    const card = pile[cardIndex];
    for (let i = 0; i < 4; i++) {
      if (canStackOnFoundation(card as never, state.foundations[i], FOUNDATION_SUITS[i])) {
        moveCard({ type: "tableau", pileIndex, cardIndex }, { type: "foundation", index: i });
        sound.foundation();
        return;
      }
    }
  };

  const handleAutoComplete = () => {
    if (isDemoMode) return;
    sound.move();
    autoComplete();
  };

  const handleUndo = () => {
    if (isDemoMode) return;
    sound.click();
    undo();
  };

  const handleRedo = () => {
    if (isDemoMode) return;
    sound.click();
    redo();
  };

  const handleNewGame = (seed?: number) => {
    if (isDemoMode) stopDemo();
    setSeconds(0);
    clearHint();
    useGameStore.getState().startGame(seed);
  };

  const startWithSeed = () => {
    const n = parseInt(seedInput.trim(), 10);
    if (!isNaN(n) && n >= 0) {
      handleNewGame(n);
      setSeedInput("");
    }
  };

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(String(dealSeed));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const toggleSound = () => {
    const on = sound.toggle();
    setSoundOn(on);
    if (on) sound.click();
  };

  const handleHint = () => {
    if (isDemoMode) return;
    sound.click();
    requestHint();
  };

  const canUndo = state.moveCount > 0 && !isDemoMode;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toString().padStart(2, "0");

  return (
    <DragDropProvider>
      <div className="flex flex-col gap-3 sm:gap-6 p-2 sm:p-4 touch-manipulation">
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-3">
          <button onClick={handleUndo} disabled={!canUndo} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gray-700/90 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm backdrop-blur-sm min-h-[36px]" title="Undo (U)">Undo</button>
          <button onClick={handleRedo} disabled={isDemoMode} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gray-700/90 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm backdrop-blur-sm min-h-[36px]" title="Redo (R)">Redo</button>
          <button onClick={handleHint} disabled={isDemoMode} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm min-h-[36px]" title="Hint (H)">Hint</button>
          <button onClick={handleAutoComplete} disabled={isDemoMode} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm min-h-[36px]" title="Auto Complete (A)">Auto Complete</button>

          <div className="w-px bg-gray-600 mx-0.5 sm:mx-1" />

          {isDemoMode ? (
            <button onClick={stopDemo} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors text-xs sm:text-sm font-bold animate-pulse min-h-[36px]">Stop Demo</button>
          ) : (
            <button onClick={startDemo} className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors text-xs sm:text-sm min-h-[36px]">Watch Demo</button>
          )}

          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-800/80 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 backdrop-blur-sm">
            <span className="text-[10px] sm:text-xs text-gray-400 mr-0.5 sm:mr-1">Draw:</span>
            <button onClick={() => setDrawCount(1)} className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium transition-colors min-h-[28px] ${drawCount === 1 ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>1</button>
            <button onClick={() => setDrawCount(3)} className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium transition-colors min-h-[28px] ${drawCount === 3 ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>3</button>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-800/80 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 backdrop-blur-sm">
            <span className="text-[10px] sm:text-xs text-gray-400 mr-0.5 sm:mr-1">Rules:</span>
            <button onClick={() => setVegasRules(false)} className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium transition-colors min-h-[28px] ${!vegasRules ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>Standard</button>
            <button onClick={() => setVegasRules(true)} className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium transition-colors min-h-[28px] ${vegasRules ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`} title="Vegas: no waste recycling + Vegas scoring (-52 + 5 per foundation card)">Vegas</button>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-800/80 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 backdrop-blur-sm">
            <span className="text-[10px] sm:text-xs text-gray-400 mr-0.5 sm:mr-1">Speed:</span>
            {SPEED_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setDemoSpeed(opt.value)} className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium transition-colors min-h-[28px] ${demoSpeed === opt.value ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>{opt.label}</button>
            ))}
          </div>

          <button onClick={toggleSound} className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-700/90 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs sm:text-sm min-h-[36px]" title={soundOn ? "Mute sounds" : "Enable sounds"}>{soundOn ? "🔊" : "🔇"}</button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-center text-amber-100/90 text-[11px] sm:text-sm font-medium">
          <span>Moves: {state.moveCount}</span>
          <span>Time: {mins}:{secs}</span>
          <span>Score: {score}{(scoringMode === "vegas" || vegasRules) && <span className="text-[10px] opacity-70"> (Vegas)</span>}</span>
          <span>Foundations: {foundationCount}/52</span>
          <span className="text-[10px] sm:text-xs opacity-70">Draw {drawCount}</span>
          <button onClick={copySeed} className="text-[10px] sm:text-xs opacity-70 hover:opacity-100 transition-opacity" title="Click to copy seed">{copied ? "Copied!" : `Seed: ${dealSeed}`}</button>
          {vegasRules && <span className="text-[10px] sm:text-xs text-amber-300">No Redeals</span>}
          {isDemoMode && <span className="text-purple-300 font-semibold">Demo Mode</span>}
          {hint && <span className="text-amber-300 font-semibold animate-pulse">Hint active</span>}
          {logsExist && <button onClick={exportLogs} className="text-[10px] sm:text-xs text-gray-400 hover:text-gray-200 transition-colors">Export Logs</button>}
        </div>

        <div className="flex justify-center items-center gap-2 text-xs">
          <input
            type="number"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startWithSeed()}
            placeholder="Enter seed…"
            className="w-28 px-2 py-1 rounded bg-gray-800/80 text-white text-xs border border-gray-600 focus:outline-none focus:border-amber-500"
          />
          <button onClick={startWithSeed} disabled={!seedInput.trim()} className="px-2 py-1 bg-amber-700 text-white rounded text-xs hover:bg-amber-600 disabled:opacity-50">Play Seed</button>
          <button onClick={() => handleNewGame()} className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600">New Random</button>
        </div>

        <div data-testid="top-row" className="flex justify-center items-center gap-[var(--card-gap-top)]">
          <StockPile count={state.stock.length} onClick={handleStockClick} />
          <WastePile cards={state.waste} onClick={handleWasteClick} onDoubleClick={handleWasteDoubleClick} isDropTarget={selectedCard?.type === "waste" && !isDemoMode} isHinted={hint?.from.type === "waste"} />
          <div className="w-2 sm:w-4" />
          {state.foundations.map((foundation, index) => (
            <FoundationPile key={`foundation-${index}`} cards={foundation} index={index} onClick={() => handleFoundationClick(index)} isDropTarget={selectedCard !== null && !isDemoMode} isHinted={hint?.to.type === "foundation" && hint.to.index === index} suitSymbol={SUIT_SYMBOLS[["hearts", "diamonds", "clubs", "spades"][index] as keyof typeof SUIT_SYMBOLS]} />
          ))}
        </div>

        <div data-testid="tableau-row" className="flex justify-center gap-[var(--card-gap-tableau)]">
          {state.tableau.map((pile, pileIndex) => (
            <TableauPile key={`tableau-${pileIndex}`} cards={pile} pileIndex={pileIndex} onCardClick={(cardIndex) => handleTableauClick(pileIndex, cardIndex)} onCardDoubleClick={(cardIndex) => handleTableauDoubleClick(pileIndex, cardIndex)} isDropTarget={selectedCard !== null && !isDemoMode} isHintSource={hint?.from.type === "tableau" && hint.from.pileIndex === pileIndex} isHintTarget={hint?.to.type === "tableau" && hint.to.pileIndex === pileIndex} />
          ))}
        </div>

        {cascadePhase === "cascading" && <WinCascade onComplete={handleCascadeComplete} />}

        {cascadePhase === "done" && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-10 rounded-3xl text-center shadow-2xl border border-amber-300/30 max-w-md mx-4">
              <h2 className="text-4xl font-bold text-white mb-3 drop-shadow">{isDemoMode || wonByDemo ? "Demo Complete!" : "You Win!"}</h2>
              <p className="text-amber-50 text-lg mb-2">Completed in {state.moveCount} moves</p>
              <p className="text-amber-100 mb-2">Time: {mins}:{secs} · Score: {score}{vegasRules ? " (Vegas)" : ""}</p>
              <p className="text-amber-200 text-sm mb-6">Seed: {dealSeed}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => handleNewGame()} className="px-8 py-3 bg-white text-amber-700 font-bold rounded-xl hover:bg-amber-50 transition-all hover:scale-105 shadow-lg">Play Again</button>
                <button onClick={copySeed} className="px-6 py-3 bg-amber-800/50 text-white font-medium rounded-xl hover:bg-amber-800/70">{copied ? "Copied!" : "Copy Seed"}</button>
              </div>
            </div>
          </div>
        )}

        {isStalemate && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-red-700 to-red-800 p-8 rounded-2xl text-center shadow-2xl max-w-md mx-4">
              <h2 className="text-3xl font-bold text-white mb-4">Stalemate</h2>
              <p className="text-red-100 mb-2">The game is stuck with no productive moves remaining.</p>
              <p className="text-red-200 text-sm mb-6">Foundation: {foundationCount}/52 | Moves: {state.moveCount} | Seed: {dealSeed}</p>
              <button onClick={() => handleNewGame()} className="px-6 py-3 bg-white text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors">New Game</button>
            </div>
          </div>
        )}
      </div>
    </DragDropProvider>
  );
}
