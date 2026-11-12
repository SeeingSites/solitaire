import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { Card as CardType, SolitaireState, Suit, Rank } from "../game/types";
import { getCardWidth, getCardHeight, getCardOverlap } from "../game/constants";

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

const RANK_MAP: Record<Rank, string> = {
  A: "ace",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "jack",
  Q: "queen",
  K: "king",
};

const SUIT_MAP: Record<Suit, string> = {
  hearts: "hearts",
  diamonds: "diamonds",
  clubs: "clubs",
  spades: "spades",
};

const CDN = "https://cdn.jsdelivr.net/gh/hayeah/playing-cards-assets@master/svg-cards";

function getCardSvgUrl(rank: Rank, suit: Suit): string {
  return `${CDN}/${RANK_MAP[rank]}_of_${SUIT_MAP[suit]}.svg`;
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

  for (const card of state.stock) addCard(card, stockX, topRowY);
  for (const card of state.waste) addCard(card, wasteX, topRowY);

  for (let f = 0; f < FOUNDATION_COUNT; f++) {
    const fx = foundationStartX + f * (CARD_W + GAP);
    for (const card of state.foundations[f]) addCard(card, fx, topRowY);
  }

  for (let t = 0; t < TABLEAU_COUNT; t++) {
    const tx = tableauStartX + t * (CARD_W + tableauGap);
    for (let i = 0; i < state.tableau[t].length; i++) {
      addCard(state.tableau[t][i], tx, tableauRowY + i * OVERLAP);
    }
  }

  return cards;
}

function CascadeCardFace({ card }: { card: CardType }) {
  const cardStyle = {
    width: "var(--card-w)",
    height: "var(--card-h)",
    borderRadius: "var(--card-radius)",
    borderWidth: "var(--card-border)",
    borderStyle: "solid",
    overflow: "hidden",
  } as React.CSSProperties;

  if (!card.faceUp) {
    return (
      <div className="card-back border-blue-800 shadow-lg flex items-center justify-center" style={cardStyle}>
        <span className="text-blue-300 text-xl">♠</span>
      </div>
    );
  }

  return (
    <div className="bg-white border-gray-300 shadow-lg overflow-hidden" style={cardStyle}>
      <img
        src={getCardSvgUrl(card.rank, card.suit)}
        alt=""
        className="w-full h-full object-contain"
        draggable={false}
      />
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
