import { useDraggable } from "@dnd-kit/core";
import { Card as CardType, Suit } from "../game/types";
import { SUIT_SYMBOLS } from "../game/constants";
import { isRed } from "../game/Deck";

interface CardProps {
  card: CardType;
  draggableId?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
}

function getRankDisplay(rank: string): string {
  return rank;
}

function getSuitColor(suit: Suit): string {
  return isRed(suit) ? "text-red-600" : "text-gray-900";
}

function getSuitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

const cardStyle = {
  width: "var(--card-w)",
  height: "var(--card-h)",
  borderRadius: "var(--card-radius)",
  borderWidth: "var(--card-border)",
  borderStyle: "solid",
  overflow: "hidden",
} as React.CSSProperties;

const innerStyle = {
  width: "calc(var(--card-w) - var(--card-border) * 2 - 6px)",
  height: "calc(var(--card-h) - var(--card-border) * 2 - 6px)",
  borderRadius: "calc(var(--card-radius) - 3px)",
};

const fontRank = { fontSize: "var(--card-font-rank)" };
const fontSuit = { fontSize: "var(--card-font-suit)" };
const fontCenter = { fontSize: "var(--card-font-center)" };

export default function Card({
  card,
  draggableId,
  onClick,
  onDoubleClick,
  className = "",
}: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId || `card-${card.id}`,
    disabled: !card.faceUp,
  });

  const style = isDragging ? { opacity: 0.45, zIndex: 100, transform: "scale(1.05) rotate(1.5deg)" } : {};

  if (!card.faceUp) {
    return (
      <div
        className={`card-back border-blue-800 shadow-xl flex items-center justify-center ${className}`}
        style={cardStyle}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="rounded border-2 border-blue-500/60 flex items-center justify-center bg-blue-900/40"
          style={innerStyle}
        >
          <span className="text-blue-300 font-bold" style={fontCenter}>
            ♠
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`card bg-gradient-to-b from-white to-gray-50 border-gray-200 shadow-xl
                 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none
                 ${isDragging ? "shadow-2xl" : "hover:shadow-2xl"}
                 transition-all duration-150 ${className}`}
      style={{ ...cardStyle, ...style } as React.CSSProperties}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      {...listeners}
      {...attributes}
    >
      <div
        className={`flex flex-col items-start leading-none ${getSuitColor(card.suit)}`}
        style={{ padding: "var(--card-pad)" }}
      >
        <span className="font-bold tracking-tight" style={fontRank}>
          {getRankDisplay(card.rank)}
        </span>
        <span className="-mt-0.5" style={fontSuit}>{getSuitSymbol(card.suit)}</span>
      </div>

      <div className={`flex-1 flex items-center justify-center ${getSuitColor(card.suit)} opacity-90`}>
        <span style={fontCenter}>{getSuitSymbol(card.suit)}</span>
      </div>

      <div
        className={`flex flex-col items-end rotate-180 leading-none ${getSuitColor(card.suit)}`}
        style={{ padding: "var(--card-pad)" }}
      >
        <span className="font-bold tracking-tight" style={fontRank}>
          {getRankDisplay(card.rank)}
        </span>
        <span className="-mt-0.5" style={fontSuit}>{getSuitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}
