"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  type CollisionDetection,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { BoardAction, BoardState } from "@/types/board";
import {
  columnDroppableId,
  computeDropIndex,
  resolveOverColumn,
} from "@/lib/dropIndex";
import { Column } from "./Column";
import { Card } from "./Card";

interface BoardProps {
  state: BoardState;
  onMoveLocal: (action: BoardAction) => void;
  onPersistMove: (
    cardId: string,
    destinationColumnId: string,
    destinationIndex: number
  ) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onEditCard: (cardId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
}

export function Board({
  state,
  onMoveLocal,
  onPersistMove,
  onRenameColumn,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: BoardProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const stateRef = useRef(state);
  const originRef = useRef<{ columnId: string; index: number } | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Resolve the drop target to the column under the pointer, then the card in
  // that column whose center is nearest the pointer. Selecting by pointer (not
  // by the dragged card's center) keeps targeting correct even when the dragged
  // card is taller than the cards it is dropped onto.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    const collisions =
      pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
    const overId = getFirstCollision(collisions, "id");
    if (overId == null) return [];

    const column = resolveOverColumn(stateRef.current.columns, String(overId));
    if (!column) return [{ id: String(overId) }];

    const pointer = args.pointerCoordinates;
    if (column.cardIds.length > 0 && pointer) {
      // Walk cards top-to-bottom: the first card whose midpoint is below the
      // pointer is the insertion anchor. This matches user intent in gaps
      // between cards better than picking whichever center is nearest.
      for (const cardId of column.cardIds) {
        const rect = args.droppableRects.get(cardId);
        if (!rect) continue;
        const midpoint = rect.top + rect.height / 2;
        if (pointer.y < midpoint) {
          return [{ id: cardId }];
        }
      }
      return [{ id: column.cardIds[column.cardIds.length - 1] }];
    }

    // Empty column: target the column droppable (an end-of-list drop).
    return [{ id: columnDroppableId(column.id) }];
  }, []);

  function findCardLocation(cardId: string) {
    const column = stateRef.current.columns.find((col) =>
      col.cardIds.includes(cardId)
    );
    if (!column) return null;
    return { columnId: column.id, index: column.cardIds.indexOf(cardId) };
  }

  function handleDragStart(event: DragStartEvent) {
    const cardId = event.active.id as string;
    setActiveCardId(cardId);
    originRef.current = findCardLocation(cardId);
  }

  // Computes the drop destination and applies a local (optimistic) reorder.
  // Returns the destination so the caller can persist it on drop.
  function computeAndMove(
    event: DragMoveEvent | DragEndEvent,
    cardId: string
  ): { columnId: string; index: number } | null {
    const { over } = event;
    if (!over || over.id === cardId) return null;

    const overId = over.id as string;
    const overColumn = resolveOverColumn(stateRef.current.columns, overId);
    if (!overColumn) return null;

    const currentColumn = stateRef.current.columns.find((col) =>
      col.cardIds.includes(cardId)
    );
    if (!currentColumn) return null;

    const currentIndex = currentColumn.cardIds.indexOf(cardId);
    const destinationIndex = computeDropIndex(event, overColumn, overId, cardId);

    if (
      !(currentColumn.id === overColumn.id && currentIndex === destinationIndex)
    ) {
      onMoveLocal({
        type: "MOVE_CARD",
        cardId,
        sourceColumnId: currentColumn.id,
        destinationColumnId: overColumn.id,
        destinationIndex,
      });
    }

    return { columnId: overColumn.id, index: destinationIndex };
  }

  // Uses onDragMove (fires on every pointer move) rather than onDragOver (fires
  // only when the over target changes) so the drop position keeps tracking the
  // pointer even while it stays over the same card.
  function handleDragMove(event: DragMoveEvent) {
    const { active, over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overColumn = resolveOverColumn(
      stateRef.current.columns,
      over.id as string
    );
    setOverColumnId(overColumn?.id ?? null);

    computeAndMove(event, active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const cardId = event.active.id as string;
    const computed = event.over ? computeAndMove(event, cardId) : null;
    const destination = computed ?? findCardLocation(cardId);
    const origin = originRef.current;

    if (
      destination &&
      origin &&
      (destination.columnId !== origin.columnId ||
        destination.index !== origin.index)
    ) {
      onPersistMove(cardId, destination.columnId, destination.index);
    }

    setActiveCardId(null);
    setOverColumnId(null);
    originRef.current = null;
  }

  const activeCard = activeCardId ? state.cards[activeCardId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
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
              onRename={(title) => onRenameColumn(column.id, title)}
              onAddCard={(title, details) =>
                onAddCard(column.id, title, details)
              }
              onDeleteCard={(cardId) => onDeleteCard(column.id, cardId)}
              onEditCard={(cardId, title, details) =>
                onEditCard(cardId, title, details)
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
              <p className="mt-1 text-xs text-gray-text">{activeCard.details}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
