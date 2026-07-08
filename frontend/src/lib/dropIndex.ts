import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import type { Column } from "@/types/board";

type DragEvent = DragOverEvent | DragEndEvent;

export function columnEndId(columnId: string): string {
  return `${columnId}-end`;
}

export function isColumnEndId(id: string): boolean {
  return id.endsWith("-end");
}

export function resolveOverColumn(
  columns: Column[],
  overId: string
): Column | undefined {
  if (isColumnEndId(overId)) {
    const columnId = overId.slice(0, -4);
    return columns.find((c) => c.id === columnId);
  }

  return (
    columns.find((c) => c.id === overId) ??
    columns.find((c) => c.cardIds.includes(overId))
  );
}

export function computeDropIndex(
  event: DragEvent,
  overColumn: Column,
  overId: string,
  activeCardId: string
): number {
  if (overId === overColumn.id || overId === columnEndId(overColumn.id)) {
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
  const activeRect = event.active.rect.current.translated;

  if (!overRect || !activeRect) {
    return overIndex;
  }

  const activeCenterY = activeRect.top + activeRect.height / 2;
  const overCenterY = overRect.top + overRect.height / 2;

  return activeCenterY > overCenterY ? overIndex + 1 : overIndex;
}
