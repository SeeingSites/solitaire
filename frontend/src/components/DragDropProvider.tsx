import { ReactNode, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { useGameStore } from "../store/useGameStore";
import { CardLocation } from "../game/types";
import Card from "./Card";

interface DragDropProviderProps {
  children: ReactNode;
}

function parseDraggableId(id: string): CardLocation | null {
  if (id === "stock") return { type: "stock" };
  if (id === "waste") return { type: "waste" };

  const tableauMatch = id.match(/^tableau-(\d+)-(\d+)$/);
  if (tableauMatch) {
    return {
      type: "tableau",
      pileIndex: parseInt(tableauMatch[1], 10),
      cardIndex: parseInt(tableauMatch[2], 10),
    };
  }

  const foundationMatch = id.match(/^foundation-(\d+)$/);
  if (foundationMatch) {
    return { type: "foundation", index: parseInt(foundationMatch[1], 10) };
  }

  return null;
}

function parseDroppableId(id: string): CardLocation | null {
  if (id === "waste") return { type: "waste" };

  const tableauMatch = id.match(/^tableau-(\d+)$/);
  if (tableauMatch) {
    return {
      type: "tableau",
      pileIndex: parseInt(tableauMatch[1], 10),
      cardIndex: 0,
    };
  }

  const foundationMatch = id.match(/^foundation-(\d+)$/);
  if (foundationMatch) {
    return { type: "foundation", index: parseInt(foundationMatch[1], 10) };
  }

  return null;
}

export default function DragDropProvider({ children }: DragDropProviderProps) {
  const [activeCard, setActiveCard] = useState<React.ReactNode | null>(null);
  const { moveCard, state } = useGameStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const findCardById = (id: string) => {
    const loc = parseDraggableId(id);
    if (!loc) return null;

    switch (loc.type) {
      case "stock":
        return state.stock[state.stock.length - 1] || null;
      case "waste":
        return state.waste[state.waste.length - 1] || null;
      case "tableau": {
        const pile = state.tableau[loc.pileIndex];
        return pile?.[loc.cardIndex] || null;
      }
      case "foundation": {
        const pile = state.foundations[loc.index];
        return pile?.[pile.length - 1] || null;
      }
      default:
        return null;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);

    const card = findCardById(id);
    if (card) {
      setActiveCard(
        <div className="opacity-80 scale-105 rotate-3">
          <Card card={card} />
        </div>,
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const from = parseDraggableId(String(active.id));
    const to = parseDroppableId(String(over.id));

    if (!from || !to) return;
    if (from.type === to.type) {
      if (from.type === "tableau" && to.type === "tableau" && from.pileIndex === to.pileIndex)
        return;
      if (from.type === "foundation" && to.type === "foundation" && from.index === to.index) return;
    }

    moveCard(from, to);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay dropAnimation={null}>{activeCard}</DragOverlay>
    </DndContext>
  );
}
