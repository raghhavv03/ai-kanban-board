"use client";

import { useCallback, useEffect, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "@/lib/api";

type Status = "loading" | "authed" | "anon";

export function useAuth() {
  const [status, setStatus] = useState<Status>("loading");
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    getMe().then((s) => {
      setStatus(s.authenticated ? "authed" : "anon");
      setUsername(s.username);
    });
  }, []);

  const login = useCallback(async (u: string, p: string) => {
    const s = await apiLogin(u, p);
    setStatus("authed");
    setUsername(s.username);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setStatus("anon");
    setUsername(undefined);
  }, []);

  return { status, username, login, logout };
}
