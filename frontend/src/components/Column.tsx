"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Column as ColumnType, Card as CardType } from "@/types/board";
import { columnEndId } from "@/lib/dropIndex";
import { EditableColumnTitle } from "./EditableColumnTitle";
import { Card } from "./Card";
import { AddCardForm } from "./AddCardForm";

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
  onRename: (title: string) => void;
  onAddCard: (title: string, details: string) => void;
  onDeleteCard: (cardId: string) => void;
  onEditCard: (cardId: string, title: string, details: string) => void;
  isOver?: boolean;
}

export function Column({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
  onEditCard,
  isOver,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const { setNodeRef: setEndRef, isOver: isEndOver } = useDroppable({
    id: columnEndId(column.id),
  });

  return (
    <div
      data-testid={`column-${column.id}`}
      className={`flex flex-col min-w-[280px] max-w-[320px] w-[280px] shrink-0 bg-column-bg rounded-xl shadow-sm border transition-colors ${
        isOver
          ? "border-accent-yellow ring-2 ring-accent-yellow/30"
          : "border-card-border"
      }`}
    >
      <div className="border-t-4 border-accent-yellow rounded-t-xl px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <EditableColumnTitle title={column.title} onRename={onRename} />
          <span className="text-xs text-gray-text font-medium tabular-nums">
            {cards.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 px-3 pb-3 space-y-2 min-h-[120px]"
      >
        <SortableContext
          items={column.cardIds}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onDelete={() => onDeleteCard(card.id)}
              onEdit={(title, details) => onEditCard(card.id, title, details)}
            />
          ))}
        </SortableContext>
        <div
          ref={setEndRef}
          className={`min-h-[48px] rounded-md transition-colors ${
            isEndOver ? "bg-accent-yellow/10 ring-1 ring-accent-yellow/40" : ""
          }`}
          aria-hidden
        />
        <AddCardForm onAdd={onAddCard} />
      </div>
    </div>
  );
}
