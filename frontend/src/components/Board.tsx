"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { BoardAction, BoardState } from "@/types/board";
import { computeDropIndex, resolveOverColumn } from "@/lib/dropIndex";
import { Column } from "./Column";
import { Card } from "./Card";

interface BoardProps {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
}

export function Board({ state, dispatch }: BoardProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function findColumnByCardId(cardId: string) {
    return stateRef.current.columns.find((col) => col.cardIds.includes(cardId));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(event.active.id as string);
  }

  function moveCardToPosition(
    event: DragOverEvent | DragEndEvent,
    cardId: string
  ) {
    const { over } = event;
    if (!over || over.id === cardId) return;

    const overId = over.id as string;
    const overColumn = resolveOverColumn(stateRef.current.columns, overId);
    if (!overColumn) return;

    const currentColumn = findColumnByCardId(cardId);
    if (!currentColumn) return;

    const currentIndex = currentColumn.cardIds.indexOf(cardId);
    const destinationIndex = computeDropIndex(
      event,
      overColumn,
      overId,
      cardId
    );

    if (
      currentColumn.id === overColumn.id &&
      currentIndex === destinationIndex
    ) {
      return;
    }

    dispatch({
      type: "MOVE_CARD",
      cardId,
      sourceColumnId: currentColumn.id,
      destinationColumnId: overColumn.id,
      destinationIndex,
    });
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overColumn = resolveOverColumn(stateRef.current.columns, over.id as string);
    setOverColumnId(overColumn?.id ?? null);

    moveCardToPosition(event, active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      moveCardToPosition(event, active.id as string);
    }
    setActiveCardId(null);
    setOverColumnId(null);
  }

  const activeCard = activeCardId ? state.cards[activeCardId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-4 px-1"
        data-testid="kanban-board"
      >
        {state.columns.map((column) => {
          const cards = column.cardIds
            .map((id) => state.cards[id])
            .filter(Boolean);
          return (
            <Column
              key={column.id}
              column={column}
              cards={cards}
              isOver={overColumnId === column.id}
              onRename={(title) =>
                dispatch({
                  type: "RENAME_COLUMN",
                  columnId: column.id,
                  title,
                })
              }
              onAddCard={(title, details) =>
                dispatch({
                  type: "ADD_CARD",
                  columnId: column.id,
                  card: { title, details },
                })
              }
              onDeleteCard={(cardId) =>
                dispatch({
                  type: "DELETE_CARD",
                  columnId: column.id,
                  cardId,
                })
              }
              onEditCard={(cardId, title, details) =>
                dispatch({
                  type: "EDIT_CARD",
                  cardId,
                  card: { title, details },
                })
              }
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="bg-white rounded-lg border border-accent-yellow p-3 shadow-lg ring-2 ring-accent-yellow opacity-95 w-[260px]">
            <h3 className="text-sm font-semibold text-dark-navy">
              {activeCard.title}
            </h3>
            {activeCard.details && (
              <p className="mt-1 text-xs text-gray-text">
                {activeCard.details}
              </p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
