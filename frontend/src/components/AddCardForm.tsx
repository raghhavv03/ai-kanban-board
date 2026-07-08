"use client";

import { useState } from "react";

interface AddCardFormProps {
  onAdd: (title: string, details: string) => void;
}

export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title, details);
    setTitle("");
    setDetails("");
    setOpen(false);
  }

  function handleCancel() {
    setTitle("");
    setDetails("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-2 py-2 text-sm text-blue-primary hover:text-purple-secondary hover:bg-blue-primary/5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-primary"
        data-testid="add-card-button"
      >
        + Add card
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 bg-white rounded-lg border border-card-border p-3 shadow-sm"
      data-testid="add-card-form"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title"
        className="w-full text-sm text-dark-navy placeholder:text-gray-text/60 border border-card-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-primary"
        aria-label="Card title"
        autoFocus
      />
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Details (optional)"
        rows={2}
        className="w-full mt-2 text-sm text-dark-navy placeholder:text-gray-text/60 border border-card-border rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-primary"
        aria-label="Card details"
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          className="px-3 py-1.5 text-sm font-medium text-white bg-purple-secondary hover:bg-purple-secondary/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-secondary focus:ring-offset-1"
          data-testid="add-card-submit"
        >
          Add card
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
