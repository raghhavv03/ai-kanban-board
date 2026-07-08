"use client";

import { useState, useRef, useEffect } from "react";

interface EditableColumnTitleProps {
  title: string;
  onRename: (title: string) => void;
}

export function EditableColumnTitle({
  title,
  onRename,
}: EditableColumnTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function save() {
    const trimmed = value.trim();
    if (trimmed) {
      onRename(trimmed);
    } else {
      setValue(title);
    }
    setEditing(false);
  }

  function cancel() {
    setValue(title);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        className="w-full bg-transparent text-sm font-semibold text-dark-navy outline-none border-b-2 border-blue-primary px-1 py-0.5"
        aria-label="Column title"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm font-semibold text-dark-navy hover:text-blue-primary transition-colors text-left truncate cursor-pointer"
      aria-label={`Rename column: ${title}`}
    >
      {title}
    </button>
  );
}
