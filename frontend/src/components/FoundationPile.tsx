import { useDroppable } from "@dnd-kit/core";
import Card from "./Card";
import { Card as CardType } from "../game/types";

interface FoundationPileProps {
  cards: CardType[];
  index: number;
  onClick?: () => void;
  isDropTarget?: boolean;
  isHinted?: boolean;
  suitSymbol?: string;
}

const cardStyle = {
  width: "var(--card-w)",
  height: "var(--card-h)",
  borderRadius: "var(--card-radius)",
};

export default function FoundationPile({
  cards,
  index,
  onClick,
  isDropTarget,
  isHinted,
  suitSymbol,
}: FoundationPileProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `foundation-${index}`,
  });

  const isActive = isDropTarget || isOver;

  return (
    <div
      ref={setNodeRef}
      data-testid={`foundation-${index}`}
      data-count={cards.length}
      className={`relative rounded-lg border-2 border-dashed touch-manipulation
                 ${isHinted ? "border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-400/40 animate-pulse" : ""}
                 ${isActive && !isHinted ? "border-green-500 bg-green-500/10" : ""}
                 ${!isActive && !isHinted ? "border-gray-600 bg-gray-800/50" : ""}
                 flex items-center justify-center cursor-pointer`}
      style={cardStyle}
      onClick={onClick}
    >
      {cards.length > 0 ? (
        <Card
          card={cards[cards.length - 1]}
          draggableId={`foundation-${index}`}
          onClick={onClick}
        />
      ) : (
        <span className="text-gray-500" style={{ fontSize: "var(--card-font-center)" }}>
          {suitSymbol || "?"}
        </span>
      )}
    </div>
  );
}
