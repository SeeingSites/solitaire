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

/** Traditional pip positions for number cards (percent of card face). */
const PIP_LAYOUTS: Record<string, { top: string; left: string }[]> = {
  A: [{ top: "50%", left: "50%" }],
  "2": [
    { top: "22%", left: "50%" },
    { top: "78%", left: "50%" },
  ],
  "3": [
    { top: "18%", left: "50%" },
    { top: "50%", left: "50%" },
    { top: "82%", left: "50%" },
  ],
  "4": [
    { top: "20%", left: "28%" },
    { top: "20%", left: "72%" },
    { top: "80%", left: "28%" },
    { top: "80%", left: "72%" },
  ],
  "5": [
    { top: "18%", left: "28%" },
    { top: "18%", left: "72%" },
    { top: "50%", left: "50%" },
    { top: "82%", left: "28%" },
    { top: "82%", left: "72%" },
  ],
  "6": [
    { top: "18%", left: "28%" },
    { top: "18%", left: "72%" },
    { top: "50%", left: "28%" },
    { top: "50%", left: "72%" },
    { top: "82%", left: "28%" },
    { top: "82%", left: "72%" },
  ],
  "7": [
    { top: "16%", left: "28%" },
    { top: "16%", left: "72%" },
    { top: "38%", left: "50%" },
    { top: "50%", left: "28%" },
    { top: "50%", left: "72%" },
    { top: "84%", left: "28%" },
    { top: "84%", left: "72%" },
  ],
  "8": [
    { top: "16%", left: "28%" },
    { top: "16%", left: "72%" },
    { top: "38%", left: "28%" },
    { top: "38%", left: "72%" },
    { top: "62%", left: "28%" },
    { top: "62%", left: "72%" },
    { top: "84%", left: "28%" },
    { top: "84%", left: "72%" },
  ],
  "9": [
    { top: "14%", left: "28%" },
    { top: "14%", left: "72%" },
    { top: "32%", left: "28%" },
    { top: "32%", left: "72%" },
    { top: "50%", left: "50%" },
    { top: "68%", left: "28%" },
    { top: "68%", left: "72%" },
    { top: "86%", left: "28%" },
    { top: "86%", left: "72%" },
  ],
  "10": [
    { top: "12%", left: "28%" },
    { top: "12%", left: "72%" },
    { top: "28%", left: "28%" },
    { top: "28%", left: "72%" },
    { top: "44%", left: "50%" },
    { top: "56%", left: "28%" },
    { top: "56%", left: "72%" },
    { top: "72%", left: "28%" },
    { top: "72%", left: "72%" },
    { top: "88%", left: "28%" },
    { top: "88%", left: "72%" },
  ],
};

function NumberPips({ rank, suit }: { rank: string; suit: Suit }) {
  const layout = PIP_LAYOUTS[rank];
  if (!layout) return null;
  const symbol = getSuitSymbol(suit);
  const color = getSuitColor(suit);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {layout.map((pos, i) => (
        <span
          key={i}
          className={`absolute -translate-x-1/2 -translate-y-1/2 font-bold ${color}`}
          style={{ top: pos.top, left: pos.left, fontSize: "var(--card-font-suit)" }}
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}

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

  const isFace = ["J", "Q", "K"].includes(card.rank);
  const colorClass = getSuitColor(card.suit);

  return (
    <div
      ref={setNodeRef}
      className={`card bg-gradient-to-b from-white to-gray-50 border-gray-200 shadow-xl
                 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none relative
                 ${isDragging ? "shadow-2xl" : "hover:shadow-2xl"}
                 transition-all duration-150 ${className}`}
      style={{ ...cardStyle, ...style } as React.CSSProperties}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      {...listeners}
      {...attributes}
    >
      <div
        className={`flex flex-col items-start leading-none z-10 ${colorClass}`}
        style={{ padding: "var(--card-pad)" }}
      >
        <span className="font-bold tracking-tight" style={fontRank}>
          {card.rank}
        </span>
        <span className="-mt-0.5" style={fontSuit}>{getSuitSymbol(card.suit)}</span>
      </div>

      {isFace ? (
        <div className={`flex-1 flex items-center justify-center ${colorClass} opacity-90 z-10`}>
          <span style={fontCenter}>{getSuitSymbol(card.suit)}</span>
        </div>
      ) : (
        <NumberPips rank={card.rank} suit={card.suit} />
      )}

      <div
        className={`flex flex-col items-end rotate-180 leading-none z-10 ${colorClass}`}
        style={{ padding: "var(--card-pad)" }}
      >
        <span className="font-bold tracking-tight" style={fontRank}>
          {card.rank}
        </span>
        <span className="-mt-0.5" style={fontSuit}>{getSuitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}
