"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/api";

interface ChatSidebarProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (message: string) => void;
}

export function ChatSidebar({
  messages,
  loading,
  error,
  onSend,
}: ChatSidebarProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, loading, open]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input);
    setInput("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="chat-open"
        aria-label="Open AI assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-purple-secondary text-sm font-semibold text-white shadow-lg ring-2 ring-accent-yellow/80 hover:bg-purple-secondary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-primary focus:ring-offset-2"
      >
        AI
      </button>
    );
  }

  return (
    <div
      data-testid="chat-sidebar"
      className="fixed bottom-6 right-6 z-50 flex w-[min(380px,calc(100vw-3rem))] max-h-[min(520px,calc(100vh-6rem))] flex-col overflow-hidden rounded-2xl border border-card-border bg-white shadow-xl"
    >
      <div className="px-4 py-3 border-b border-card-border flex items-center justify-between gap-3 bg-white">
        <div>
          <h2 className="text-base font-semibold text-dark-navy font-[family-name:var(--font-outfit)]">
            AI Assistant
          </h2>
          <p className="text-xs text-gray-text mt-0.5">
            Create, edit, move, or delete cards
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          data-testid="chat-close"
          aria-label="Close AI assistant"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-text hover:text-dark-navy hover:bg-background border border-card-border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-primary"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            &times;
          </span>
        </button>
      </div>

      <div
        data-testid="chat-messages"
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 && !loading && (
          <p className="text-sm text-gray-text">
            Try: &quot;Add a card called Sprint planning to To Do&quot;
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            data-testid={`chat-message-${message.role}`}
            className={
              message.role === "user"
                ? "ml-8 rounded-lg bg-blue-primary/10 px-3 py-2 text-sm text-dark-navy"
                : "mr-4 rounded-lg bg-background border border-card-border px-3 py-2 text-sm text-dark-navy"
            }
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div
            data-testid="chat-loading"
            className="mr-4 rounded-lg bg-background border border-card-border px-3 py-2 text-sm text-gray-text"
          >
            Thinking...
          </div>
        )}
        {error && (
          <p data-testid="chat-error" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        className="px-4 py-3 border-t border-card-border flex gap-2 bg-white"
      >
        <label className="sr-only" htmlFor="chat-input">
          Message the AI assistant
        </label>
        <input
          id="chat-input"
          data-testid="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your board..."
          disabled={loading}
          className="flex-1 rounded-md border border-card-border px-3 py-2 text-sm text-dark-navy placeholder:text-gray-text focus:outline-none focus:ring-2 focus:ring-blue-primary disabled:opacity-60"
        />
        <button
          type="submit"
          data-testid="chat-send"
          disabled={loading || !input.trim()}
          className="rounded-md bg-purple-secondary px-4 py-2 text-sm font-medium text-white hover:bg-purple-secondary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-secondary disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
