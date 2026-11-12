import { useDroppable } from "@dnd-kit/core";
import Card from "./Card";
import { Card as CardType } from "../game/types";

interface TableauPileProps {
  cards: CardType[];
  pileIndex: number;
  onCardClick?: (cardIndex: number) => void;
  onCardDoubleClick?: (cardIndex: number) => void;
  isDropTarget?: boolean;
  isHintSource?: boolean;
  isHintTarget?: boolean;
}

const cardStyle = {
  width: "var(--card-w)",
  borderRadius: "var(--card-radius)",
};

export default function TableauPile({
  cards,
  pileIndex,
  onCardClick,
  onCardDoubleClick,
  isDropTarget,
  isHintSource,
  isHintTarget,
}: TableauPileProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tableau-${pileIndex}`,
  });

  const isActive = isDropTarget || isOver;
  const isHinted = isHintSource || isHintTarget;

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-lg border-2 border-dashed touch-manipulation
                 ${isHinted ? "border-amber-400 bg-amber-400/15" : ""}
                 ${isActive && !isHinted ? "border-green-500 bg-green-500/10" : ""}
                 ${!isActive && !isHinted ? "border-gray-600/50 bg-transparent" : ""}`}
      style={{
        ...cardStyle,
        minHeight: "var(--card-h)",
      }}
    >
      {cards.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-600 text-[10px]">{pileIndex + 1}</span>
        </div>
      )}

      {cards.map((card, index) => (
        <div
          key={card.id}
          className="absolute"
          style={{
            top: `calc(var(--card-overlap) * ${index})`,
            left: 0,
            zIndex: index,
          }}
        >
          <Card
            card={card}
            draggableId={`tableau-${pileIndex}-${index}`}
            onClick={() => onCardClick?.(index)}
            onDoubleClick={() => onCardDoubleClick?.(index)}
          />
        </div>
      ))}
    </div>
  );
}
