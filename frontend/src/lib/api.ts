import type { BoardState } from "@/types/board";

export interface AuthState {
  authenticated: boolean;
  username?: string;
}

export async function getMe(): Promise<AuthState> {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) return { authenticated: false };
    return res.json();
  } catch {
    return { authenticated: false };
  }
}

export async function login(
  username: string,
  password: string
): Promise<AuthState> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
}

async function boardRequest(
  path: string,
  method: string,
  body?: unknown
): Promise<BoardState> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`);
  return res.json();
}

export function fetchBoard(): Promise<BoardState> {
  return boardRequest("/api/board", "GET");
}

export function renameColumnApi(
  columnId: string,
  title: string
): Promise<BoardState> {
  return boardRequest(`/api/columns/${columnId}`, "PATCH", { title });
}

export function addCardApi(
  columnId: string,
  title: string,
  details: string
): Promise<BoardState> {
  return boardRequest(`/api/columns/${columnId}/cards`, "POST", {
    title,
    details,
  });
}

export function editCardApi(
  cardId: string,
  title: string,
  details: string
): Promise<BoardState> {
  return boardRequest(`/api/cards/${cardId}`, "PATCH", { title, details });
}

export function deleteCardApi(cardId: string): Promise<BoardState> {
  return boardRequest(`/api/cards/${cardId}`, "DELETE");
}

export function moveCardApi(
  cardId: string,
  destinationColumnId: string,
  destinationIndex: number
): Promise<BoardState> {
  return boardRequest(`/api/cards/${cardId}/move`, "POST", {
    destinationColumnId: Number(destinationColumnId),
    destinationIndex,
  });
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  board_changed: boolean;
}

export async function chatApi(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail);
  }
  return res.json();
}
