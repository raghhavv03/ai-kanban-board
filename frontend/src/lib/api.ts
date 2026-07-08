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
