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
  return isRed(suit) ? "text-card-red" : "text-card-black";
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
} as React.CSSProperties;

const innerStyle = {
  width: "calc(var(--card-w) - var(--card-border) * 2 - 4px)",
  height: "calc(var(--card-h) - var(--card-border) * 2 - 4px)",
  borderRadius: "calc(var(--card-radius) - 2px)",
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

  const style = isDragging ? { opacity: 0.4, zIndex: 100 } : {};

  if (!card.faceUp) {
    return (
      <div
        className={`card-back bg-gradient-to-br from-blue-800 to-blue-900
                   border-blue-700 shadow-lg flex items-center justify-center
                   ${className}`}
        style={cardStyle}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="rounded border border-blue-600 flex items-center justify-center"
          style={innerStyle}
        >
          <span className="text-blue-400" style={fontCenter}>
            ♠
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`card bg-white border-gray-300 shadow-lg
                 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none
                 ${isDragging ? "shadow-2xl scale-105" : "hover:shadow-xl hover:-translate-y-1"}
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
        <span className="font-bold" style={fontRank}>
          {getRankDisplay(card.rank)}
        </span>
        <span style={fontSuit}>{getSuitSymbol(card.suit)}</span>
      </div>

      <div className={`flex-1 flex items-center justify-center ${getSuitColor(card.suit)}`}>
        <span style={fontCenter}>{getSuitSymbol(card.suit)}</span>
      </div>

      <div
        className={`flex flex-col items-end rotate-180 leading-none ${getSuitColor(card.suit)}`}
        style={{ padding: "var(--card-pad)" }}
      >
        <span className="font-bold" style={fontRank}>
          {getRankDisplay(card.rank)}
        </span>
        <span style={fontSuit}>{getSuitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}
