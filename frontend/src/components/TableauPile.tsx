import { useDroppable } from "@dnd-kit/core";
import Card from "./Card";
import { Card as CardType } from "../game/types";
import { CARD_OVERLAP, CARD_HEIGHT } from "../game/constants";

interface TableauPileProps {
  cards: CardType[];
  pileIndex: number;
  onCardClick?: (cardIndex: number) => void;
  onCardDoubleClick?: (cardIndex: number) => void;
  isDropTarget?: boolean;
}

export default function TableauPile({
  cards,
  pileIndex,
  onCardClick,
  onCardDoubleClick,
  isDropTarget,
}: TableauPileProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tableau-${pileIndex}`,
  });

  const isActive = isDropTarget || isOver;
  const pileHeight =
    cards.length > 0 ? (cards.length - 1) * CARD_OVERLAP + CARD_HEIGHT : CARD_HEIGHT;

  return (
    <div
      ref={setNodeRef}
      className={`relative w-20 rounded-lg border-2 border-dashed
                 ${isActive ? "border-green-500 bg-green-500/10" : "border-gray-600/50 bg-transparent"}`}
      style={{ height: `${pileHeight}px` }}
    >
      {cards.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-600 text-xs">{pileIndex + 1}</span>
        </div>
      )}

      {cards.map((card, index) => (
        <div
          key={card.id}
          className="absolute"
          style={{
            top: `${index * CARD_OVERLAP}px`,
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
