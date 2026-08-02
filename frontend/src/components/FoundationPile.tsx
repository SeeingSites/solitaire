import { useDroppable } from "@dnd-kit/core";
import Card from "./Card";
import { Card as CardType } from "../game/types";

interface FoundationPileProps {
  cards: CardType[];
  index: number;
  onClick?: () => void;
  isDropTarget?: boolean;
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
  suitSymbol,
}: FoundationPileProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `foundation-${index}`,
  });

  const isActive = isDropTarget || isOver;

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-lg border-2 border-dashed
                 ${isActive ? "border-green-500 bg-green-500/10" : "border-gray-600 bg-gray-800/50"}
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
