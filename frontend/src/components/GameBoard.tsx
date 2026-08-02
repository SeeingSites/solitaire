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
    demoSpeed,
    startDemo,
    stopDemo,
    setDemoSpeed,
  } = useGameStore();

  const [cascadePhase, setCascadePhase] = useState<"idle" | "cascading" | "done">("idle");
  const [logsExist, setLogsExist] = useState(hasLogs);

  useEffect(() => {
    if (state.isComplete && cascadePhase === "idle") {
      setCascadePhase("cascading");
    } else if (!state.isComplete && cascadePhase !== "idle") {
      setCascadePhase("idle");
    }
  }, [state.isComplete, cascadePhase]);

  useEffect(() => {
    const interval = setInterval(() => setLogsExist(hasLogs()), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCascadeComplete = useCallback(() => {
    setCascadePhase("done");
  }, []);

  const handleStockClick = () => {
    if (isDemoMode) return;
    drawFromStock();
  };

  const handleWasteClick = () => {
    if (isDemoMode) return;
    if (selectedCard?.type === "waste") {
      selectCard(null);
    } else if (state.waste.length > 0) {
      selectCard({ type: "waste" });
    }
  };

  const handleFoundationClick = (index: number) => {
    if (isDemoMode) return;
    if (selectedCard) {
      const to: CardLocation = { type: "foundation", index };
      moveCard(selectedCard, to);
    }
  };

  const handleTableauClick = (pileIndex: number, cardIndex: number) => {
    if (isDemoMode) return;
    if (selectedCard) {
      const to: CardLocation = { type: "tableau", pileIndex, cardIndex };
      moveCard(selectedCard, to);
    } else {
      selectCard({ type: "tableau", pileIndex, cardIndex });
    }
  };

  const tryAutoMoveToFoundation = (card: { suit: string; rank: string }) => {
    for (let i = 0; i < 4; i++) {
      if (canStackOnFoundation(card as never, state.foundations[i], FOUNDATION_SUITS[i])) {
        moveCard({ type: "waste" }, { type: "foundation", index: i });
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
        return;
      }
    }
  };

  const handleAutoComplete = () => {
    if (isDemoMode) return;
    autoComplete();
  };

  const handleUndo = () => {
    if (isDemoMode) return;
    undo();
  };

  const handleRedo = () => {
    if (isDemoMode) return;
    redo();
  };

  const handleNewGame = () => {
    if (isDemoMode) stopDemo();
    setCascadePhase("idle");
    useGameStore.getState().startGame();
  };

  const canUndo = state.moveCount > 0 && !isDemoMode;

  return (
    <DragDropProvider>
      <div className="flex flex-col gap-6 p-4">
        {/* Top row: Stock, Waste, Foundations */}
        <div className="flex justify-center gap-4">
          <StockPile count={state.stock.length} onClick={handleStockClick} />
          <WastePile
            cards={state.waste}
            onClick={handleWasteClick}
            onDoubleClick={handleWasteDoubleClick}
            isDropTarget={selectedCard?.type === "waste" && !isDemoMode}
          />
          <div className="w-8" /> {/* Spacer */}
          {state.foundations.map((foundation, index) => (
            <FoundationPile
              key={`foundation-${index}`}
              cards={foundation}
              index={index}
              onClick={() => handleFoundationClick(index)}
              isDropTarget={selectedCard !== null && !isDemoMode}
              suitSymbol={
                SUIT_SYMBOLS[
                  ["hearts", "diamonds", "clubs", "spades"][index] as keyof typeof SUIT_SYMBOLS
                ]
              }
            />
          ))}
        </div>

        {/* Tableau */}
        <div className="flex justify-center gap-2">
          {state.tableau.map((pile, pileIndex) => (
            <TableauPile
              key={`tableau-${pileIndex}`}
              cards={pile}
              pileIndex={pileIndex}
              onCardClick={(cardIndex) => handleTableauClick(pileIndex, cardIndex)}
              onCardDoubleClick={(cardIndex) => handleTableauDoubleClick(pileIndex, cardIndex)}
              isDropTarget={selectedCard !== null && !isDemoMode}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={isDemoMode}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Redo
          </button>
          <button
            onClick={handleAutoComplete}
            disabled={isDemoMode}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Auto Complete
          </button>

          {/* Separator */}
          <div className="w-px bg-gray-600 mx-1" />

          {/* Demo controls */}
          {isDemoMode ? (
            <button
              onClick={stopDemo}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500
                       transition-colors text-sm font-bold animate-pulse"
            >
              Stop Demo
            </button>
          ) : (
            <button
              onClick={startDemo}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500
                       transition-colors text-sm"
            >
              Watch Demo
            </button>
          )}

          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
            <span className="text-xs text-gray-400 mr-1">Speed:</span>
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDemoSpeed(opt.value)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors
                  ${
                    demoSpeed === opt.value
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Game Status */}
        <div className="flex items-center justify-center gap-3 text-center text-gray-400 text-sm">
          <span>
            Moves: {state.moveCount} | Stock: {state.stock.length} | Waste: {state.waste.length}
          </span>
          {isDemoMode && <span className="text-purple-400 font-medium">Demo Mode</span>}
          {logsExist && (
            <button
              onClick={exportLogs}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Export Logs
            </button>
          )}
        </div>

        {/* Win Cascade */}
        {cascadePhase === "cascading" && <WinCascade onComplete={handleCascadeComplete} />}

        {/* Win Message */}
        {cascadePhase === "done" && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-8 rounded-2xl text-center shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-4">
                {isDemoMode ? "Demo Complete!" : "You Win!"}
              </h2>
              <p className="text-amber-100 mb-6">Completed in {state.moveCount} moves</p>
              <button
                onClick={handleNewGame}
                className="px-6 py-3 bg-white text-amber-700 font-bold rounded-lg hover:bg-amber-50 transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Stalemate Message */}
        {isStalemate && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-red-700 to-red-800 p-8 rounded-2xl text-center shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-4">Stalemate</h2>
              <p className="text-red-100 mb-2">
                The game is stuck with no productive moves remaining.
              </p>
              <p className="text-red-200 text-sm mb-6">
                Foundation: {state.foundations.reduce((sum, p) => sum + p.length, 0)}/52 | Moves:{" "}
                {state.moveCount}
              </p>
              <button
                onClick={handleNewGame}
                className="px-6 py-3 bg-white text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </DragDropProvider>
  );
}
