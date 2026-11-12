import { useDraggable } from "@dnd-kit/core";
import { Card as CardType, Suit, Rank } from "../game/types";

interface CardProps {
  card: CardType;
  draggableId?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
}

const cardStyle = {
  width: "var(--card-w)",
  height: "var(--card-h)",
  borderRadius: "var(--card-radius)",
  borderWidth: "var(--card-border)",
  borderStyle: "solid",
  overflow: "hidden",
} as React.CSSProperties;

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
  const r = RANK_MAP[rank];
  const s = SUIT_MAP[suit];
  return `${CDN}/${r}_of_${s}.svg`;
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

  const style = isDragging
    ? { opacity: 0.45, zIndex: 100, transform: "scale(1.05) rotate(1.5deg)" }
    : {};

  if (!card.faceUp) {
    return (
      <div
        className={`card-back border-blue-800 shadow-xl flex items-center justify-center ${className}`}
        style={cardStyle}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="rounded border-2 border-blue-500/60 flex items-center justify-center bg-blue-900/40 w-[calc(100%-10px)] h-[calc(100%-10px)]"
        >
          <span className="text-blue-300 font-bold text-2xl sm:text-3xl">♠</span>
        </div>
      </div>
    );
  }

  const svgUrl = getCardSvgUrl(card.rank, card.suit);

  return (
    <div
      ref={setNodeRef}
      className={`card bg-white border-gray-200 shadow-xl cursor-grab active:cursor-grabbing select-none relative overflow-hidden
                 ${isDragging ? "shadow-2xl" : "hover:shadow-2xl"}
                 transition-all duration-150 ${className}`}
      style={{ ...cardStyle, ...style } as React.CSSProperties}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      {...listeners}
      {...attributes}
    >
      <img
        src={svgUrl}
        alt={`${card.rank} of ${card.suit}`}
        className="w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
}
