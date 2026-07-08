"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card as CardType } from "@/types/board";

interface CardProps {
  card: CardType;
  onDelete: () => void;
  onEdit: (title: string, details: string) => void;
}

export function Card({ card, onDelete, onEdit }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0 : 1,
  };

  function startEditing() {
    setTitle(card.title);
    setDetails(card.details);
    setEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onEdit(title, details);
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        ref={setNodeRef}
        style={style}
        onSubmit={handleSubmit}
        data-testid={`card-edit-form-${card.id}`}
        className="bg-white rounded-lg border border-card-border p-3 shadow-sm"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title"
          className="w-full text-sm text-dark-navy placeholder:text-gray-text/60 border border-card-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-primary"
          aria-label="Edit card title"
          autoFocus
        />
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Details (optional)"
          rows={2}
          className="w-full mt-2 text-sm text-dark-navy placeholder:text-gray-text/60 border border-card-border rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-primary"
          aria-label="Edit card details"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-medium text-white bg-purple-secondary hover:bg-purple-secondary/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-secondary focus:ring-offset-1"
            data-testid={`card-edit-save-${card.id}`}
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm text-gray-text hover:text-dark-navy transition-colors focus:outline-none focus:ring-2 focus:ring-blue-primary rounded-md"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`card-${card.id}`}
      className={`group relative bg-white rounded-lg border border-card-border p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "z-0" : "shadow-sm hover:shadow-md"
      }`}
      {...attributes}
      {...listeners}
    >
      <h3 className="text-sm font-semibold text-dark-navy pr-12">
        {card.title}
      </h3>
      {card.details && (
        <p className="mt-1 text-xs text-gray-text leading-relaxed">
          {card.details}
        </p>
      )}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-gray-text hover:text-blue-primary p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-primary"
          aria-label={`Edit card: ${card.title}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-gray-text hover:text-red-500 p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-primary"
          aria-label={`Delete card: ${card.title}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 4h10M5 4V2.5h4V4M5.5 6v4M8.5 6v4M3 4l.5 7.5h7L11 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
