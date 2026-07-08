"use client";

import { useState } from "react";

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } catch {
      setError("Invalid username or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        data-testid="login-form"
        className="w-full max-w-sm bg-white rounded-xl border-t-4 border-accent-yellow shadow-sm p-8"
      >
        <h1 className="text-2xl font-bold text-dark-navy font-[family-name:var(--font-outfit)]">
          Sign in
        </h1>
        <p className="text-sm text-gray-text mt-1">
          Sign in to view your project board.
        </p>

        <label className="block mt-6 text-sm font-medium text-dark-navy">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
            autoComplete="username"
            className="w-full mt-1 text-sm text-dark-navy border border-card-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-primary"
          />
        </label>

        <label className="block mt-4 text-sm font-medium text-dark-navy">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            autoComplete="current-password"
            className="w-full mt-1 text-sm text-dark-navy border border-card-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-primary"
          />
        </label>

        {error && (
          <p data-testid="login-error" className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          data-testid="login-submit"
          className="w-full mt-6 py-2.5 text-sm font-medium text-white bg-purple-secondary hover:bg-purple-secondary/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-secondary focus:ring-offset-1 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
