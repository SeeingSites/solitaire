import { useDroppable } from "@dnd-kit/core";
import Card from "./Card";
import { Card as CardType } from "../game/types";

interface WastePileProps {
  cards: CardType[];
  onClick?: () => void;
  onDoubleClick?: () => void;
  isDropTarget?: boolean;
}

export default function WastePile({ cards, onClick, onDoubleClick, isDropTarget }: WastePileProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "waste",
  });

  const isActive = isDropTarget || isOver;
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  return (
    <div
      ref={setNodeRef}
      className={`relative w-20 h-28 rounded-lg border-2 border-dashed
                 ${isActive ? "border-green-500 bg-green-500/10" : "border-gray-600 bg-gray-800/50"}
                 flex items-center justify-center cursor-pointer`}
      onClick={onClick}
    >
      {topCard ? (
        <Card card={topCard} draggableId="waste" onClick={onClick} onDoubleClick={onDoubleClick} />
      ) : (
        <span className="text-gray-500 text-xs">Waste</span>
      )}
    </div>
  );
}
