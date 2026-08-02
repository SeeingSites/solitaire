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
        className={`card-back w-20 h-28 rounded-lg bg-gradient-to-br from-blue-800 to-blue-900
                   border-2 border-blue-700 shadow-lg flex items-center justify-center
                   ${className}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <div className="w-16 h-24 rounded border border-blue-600 flex items-center justify-center">
          <span className="text-blue-400 text-2xl">♠</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`card w-20 h-28 rounded-lg bg-white border-2 border-gray-300 shadow-lg
                 flex flex-col justify-between p-1 cursor-grab active:cursor-grabbing select-none
                 ${isDragging ? "shadow-2xl scale-105" : "hover:shadow-xl hover:-translate-y-1"}
                 transition-all duration-150 ${className}`}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      {...listeners}
      {...attributes}
    >
      <div className={`flex flex-col items-start ${getSuitColor(card.suit)}`}>
        <span className="text-sm font-bold leading-none">{getRankDisplay(card.rank)}</span>
        <span className="text-lg leading-none">{getSuitSymbol(card.suit)}</span>
      </div>

      <div className={`flex-1 flex items-center justify-center ${getSuitColor(card.suit)}`}>
        <span className="text-3xl">{getSuitSymbol(card.suit)}</span>
      </div>

      <div className={`flex flex-col items-end rotate-180 ${getSuitColor(card.suit)}`}>
        <span className="text-sm font-bold leading-none">{getRankDisplay(card.rank)}</span>
        <span className="text-lg leading-none">{getSuitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}
