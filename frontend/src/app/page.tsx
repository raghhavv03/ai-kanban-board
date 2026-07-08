"use client";

import dynamic from "next/dynamic";
import { useBoard } from "@/hooks/useBoard";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";

const Board = dynamic(
  () => import("@/components/Board").then((mod) => mod.Board),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex gap-4 overflow-x-auto pb-4 px-1"
        data-testid="kanban-board-loading"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="min-w-[280px] w-[280px] h-64 rounded-xl bg-white border border-card-border animate-pulse"
          />
        ))}
      </div>
    ),
  }
);

export default function Home() {
  const { status, login, logout } = useAuth();
  const { state, dispatch } = useBoard();

  if (status === "loading") {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        data-testid="auth-loading"
      >
        <div className="h-8 w-8 rounded-full border-2 border-card-border border-t-blue-primary animate-spin" />
      </main>
    );
  }

  if (status === "anon") {
    return <LoginForm onLogin={login} />;
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      <header className="px-6 py-5 border-b border-card-border bg-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-navy font-[family-name:var(--font-outfit)]">
            Project Board
          </h1>
          <p className="text-sm text-gray-text mt-0.5">
            Drag cards between columns to track progress
          </p>
        </div>
        <button
          onClick={logout}
          data-testid="logout-button"
          className="text-sm font-medium text-gray-text hover:text-purple-secondary border border-card-border hover:border-purple-secondary rounded-md px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-secondary"
        >
          Log out
        </button>
      </header>

      <div className="flex-1 p-6 overflow-hidden">
        <Board state={state} dispatch={dispatch} />
      </div>
    </main>
  );
}
