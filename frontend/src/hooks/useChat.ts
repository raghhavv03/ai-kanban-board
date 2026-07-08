"use client";

import { useCallback, useState } from "react";
import { chatApi, type ChatMessage } from "@/lib/api";

const MAX_HISTORY = 10;

export function useChat(onBoardChanged: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const history = messages.slice(-MAX_HISTORY);
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      try {
        const response = await chatApi(trimmed, history);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.reply },
        ]);
        if (response.board_changed) {
          onBoardChanged();
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not reach the assistant. Try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, onBoardChanged]
  );

  return { messages, loading, error, sendMessage };
}
