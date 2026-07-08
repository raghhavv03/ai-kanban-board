import type { DragEndEvent, DragMoveEvent, DragOverEvent } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import type { Column } from "@/types/board";

type DragEvent = DragMoveEvent | DragOverEvent | DragEndEvent;

// Column droppable ids are namespaced so they never collide with card ids
// (the backend numbers columns and cards from independent sequences, so a
// column id and a card id can be the same integer).
export function columnDroppableId(columnId: string): string {
  return `col-${columnId}`;
}

export function columnEndId(columnId: string): string {
  return `col-${columnId}-end`;
}

function parseColumnId(droppableId: string): string | null {
  if (!droppableId.startsWith("col-")) return null;
  return droppableId.slice(4).replace(/-end$/, "");
}

export function resolveOverColumn(
  columns: Column[],
  overId: string
): Column | undefined {
  const columnId = parseColumnId(overId);
  if (columnId !== null) {
    return columns.find((c) => c.id === columnId);
  }

  return columns.find((c) => c.cardIds.includes(overId));
}

export function computeDropIndex(
  event: DragEvent,
  overColumn: Column,
  overId: string,
  activeCardId: string
): number {
  if (
    overId === columnDroppableId(overColumn.id) ||
    overId === columnEndId(overColumn.id)
  ) {
    return overColumn.cardIds.length;
  }

  if (!overColumn.cardIds.includes(overId)) {
    return overColumn.cardIds.length;
  }

  if (overId === activeCardId) {
    return overColumn.cardIds.indexOf(activeCardId);
  }

  const overIndex = overColumn.cardIds.indexOf(overId);
  const overRect = event.over?.rect;
  if (!overRect) {
    return overIndex;
  }

  const overMidY = overRect.top + overRect.height / 2;

  // Prefer the pointer position: the user's cursor is where they intend to
  // drop. Using the dragged card's own center biases toward "below" whenever
  // that card is taller than the target, making the top slot unreachable.
  const pointerY = pointerClientY(event);
  if (pointerY !== null) {
    return pointerY > overMidY ? overIndex + 1 : overIndex;
  }

  const activeRect = event.active.rect.current.translated;
  if (!activeRect) {
    return overIndex;
  }
  const activeCenterY = activeRect.top + activeRect.height / 2;
  return activeCenterY > overMidY ? overIndex + 1 : overIndex;
}

function pointerClientY(event: DragEvent): number | null {
  if (!event.activatorEvent) return null;
  const start = getEventCoordinates(event.activatorEvent);
  if (!start) return null;
  return start.y + event.delta.y;
}
