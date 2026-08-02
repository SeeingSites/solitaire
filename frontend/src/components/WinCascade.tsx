import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { Card as CardType, SolitaireState, Suit } from "../game/types";
import { SUIT_SYMBOLS, getCardWidth, getCardHeight, getCardOverlap } from "../game/constants";
import { isRed } from "../game/Deck";

const GAP = 16;
const SPACER = 32;
const FOUNDATION_COUNT = 4;
const TABLEAU_COUNT = 7;

interface CascadeCard {
  card: CardType;
  startX: number;
  startY: number;
  variant: number;
  delay: number;
  duration: number;
  zIndex: number;
}

function getSuitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

function getSuitColor(suit: Suit): string {
  return isRed(suit) ? "#dc2626" : "#1f2937";
}

function calculateCardPositions(state: SolitaireState): CascadeCard[] {
  const vw = window.innerWidth;
  const CARD_W = getCardWidth();
  const CARD_H = getCardHeight();
  const OVERLAP = getCardOverlap();

  const topRowWidth = 6 * CARD_W + 5 * GAP + SPACER;
  const topRowStartX = (vw - topRowWidth) / 2;
  const topRowY = 24;

  const stockX = topRowStartX;
  const wasteX = stockX + CARD_W + GAP;
  const foundationStartX = wasteX + CARD_W + GAP + SPACER + GAP;

  const tableauGap = Math.max(2, Math.round(CARD_W * 0.06));
  const tableauWidth = TABLEAU_COUNT * CARD_W + (TABLEAU_COUNT - 1) * tableauGap;
  const tableauStartX = (vw - tableauWidth) / 2;
  const tableauRowY = topRowY + CARD_H + 24;

  const cards: CascadeCard[] = [];

  const addCard = (card: CardType, x: number, y: number) => {
    cards.push({
      card,
      startX: x,
      startY: y,
      variant: Math.floor(Math.random() * 6) + 1,
      delay: Math.random() * 600,
      duration: 2500 + Math.random() * 1500,
      zIndex: Math.floor(Math.random() * 52),
    });
  };

  for (const card of state.stock) {
    addCard(card, stockX, topRowY);
  }

  for (const card of state.waste) {
    addCard(card, wasteX, topRowY);
  }

  for (let f = 0; f < FOUNDATION_COUNT; f++) {
    const fx = foundationStartX + f * (CARD_W + GAP);
    for (const card of state.foundations[f]) {
      addCard(card, fx, topRowY);
    }
  }

  for (let t = 0; t < TABLEAU_COUNT; t++) {
    const tx = tableauStartX + t * (CARD_W + tableauGap);
    for (let i = 0; i < state.tableau[t].length; i++) {
      const card = state.tableau[t][i];
      addCard(card, tx, tableauRowY + i * OVERLAP);
    }
  }

  return cards;
}

function CascadeCardFace({ card }: { card: CardType }) {
  const fontCenter = { fontSize: "var(--card-font-center)" };
  const fontRank = { fontSize: "var(--card-font-rank)" };
  const fontSuit = { fontSize: "var(--card-font-suit)" };

  const cardStyle = {
    width: "var(--card-w)",
    height: "var(--card-h)",
    borderRadius: "var(--card-radius)",
    borderWidth: "var(--card-border)",
    borderStyle: "solid",
    overflow: "hidden",
  } as React.CSSProperties;

  const innerStyle = {
    width: "calc(var(--card-w) - var(--card-border) * 2 - 4px)",
    height: "calc(var(--card-h) - var(--card-border) * 2 - 4px)",
    borderRadius: "calc(var(--card-radius) - 2px)",
  };

  if (!card.faceUp) {
    return (
      <div
        className="card-back bg-gradient-to-br from-blue-800 to-blue-900 border-blue-700 shadow-lg flex items-center justify-center"
        style={cardStyle}
      >
        <div
          className="rounded border border-blue-600 flex items-center justify-center"
          style={innerStyle}
        >
          <span className="text-blue-400" style={fontCenter}>
            &#9824;
          </span>
        </div>
      </div>
    );
  }

  const color = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);

  return (
    <div
      className="bg-white border-gray-300 shadow-lg flex flex-col justify-between select-none"
      style={cardStyle}
    >
      <div
        className="flex flex-col items-start leading-none"
        style={{ color, padding: "var(--card-pad)" }}
      >
        <span className="font-bold" style={fontRank}>
          {card.rank}
        </span>
        <span style={fontSuit}>{symbol}</span>
      </div>
      <div className="flex-1 flex items-center justify-center" style={{ color }}>
        <span style={fontCenter}>{symbol}</span>
      </div>
      <div
        className="flex flex-col items-end rotate-180 leading-none"
        style={{ color, padding: "var(--card-pad)" }}
      >
        <span className="font-bold" style={fontRank}>
          {card.rank}
        </span>
        <span className="leading-none" style={fontSuit}>
          {symbol}
        </span>
      </div>
    </div>
  );
}

export default function WinCascade({ onComplete }: { onComplete: () => void }) {
  const state = useGameStore((s) => s.state);
  const [started, setStarted] = useState(false);

  const cascadeCards = useMemo(() => calculateCardPositions(state), [state]);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const maxDuration = useMemo(() => {
    return Math.max(...cascadeCards.map((c) => c.delay + c.duration));
  }, [cascadeCards]);

  useEffect(() => {
    if (started) {
      const timer = setTimeout(() => onComplete(), maxDuration + 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [started, maxDuration, onComplete]);

  if (!started) return null;

  return (
    <div className="fixed inset-0 z-50 cursor-pointer" onClick={onComplete}>
      {cascadeCards.map((cc) => (
        <div
          key={cc.card.id}
          className="cascade-card"
          style={{
            left: cc.startX,
            top: cc.startY,
            zIndex: cc.zIndex,
            animation: `cascade-${cc.variant} ${cc.duration}ms linear ${cc.delay}ms forwards`,
          }}
        >
          <CascadeCardFace card={cc.card} />
        </div>
      ))}
    </div>
  );
}
