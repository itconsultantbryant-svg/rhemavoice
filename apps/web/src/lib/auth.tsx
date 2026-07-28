"use client";

import { createApiClient, type ApiClient } from "@rhemavoice/api-client";
import type { AuthTokens, ThemePreference, User } from "@rhemavoice/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type AuthContextValue = {
  user: User | null;
  api: ApiClient;
  loading: boolean;
  setSession: (user: User, tokens: AuthTokens) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const memory = { access: null as string | null, refresh: null as string | null };

function loadTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem("rv_access");
  const refresh = localStorage.getItem("rv_refresh");
  if (!access || !refresh) return null;
  memory.access = access;
  memory.refresh = refresh;
  return { access, refresh };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const api = useMemo(
    () =>
      createApiClient(API_URL, {
        getAccessToken: () => memory.access || (typeof window !== "undefined" ? localStorage.getItem("rv_access") : null),
        getRefreshToken: () => memory.refresh || (typeof window !== "undefined" ? localStorage.getItem("rv_refresh") : null),
        setTokens: (tokens) => {
          memory.access = tokens.access;
          memory.refresh = tokens.refresh;
          localStorage.setItem("rv_access", tokens.access);
          localStorage.setItem("rv_refresh", tokens.refresh);
        },
        clearTokens: () => {
          memory.access = null;
          memory.refresh = null;
          localStorage.removeItem("rv_access");
          localStorage.removeItem("rv_refresh");
        },
      }),
    []
  );

  useEffect(() => {
    const tokens = loadTokens();
    if (!tokens) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => api.auth.logout())
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (!user) return;
    const root = document.documentElement;
    const pref = user.theme_preference || "system";
    const apply = () => {
      const dark =
        pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
      root.setAttribute("data-theme", dark ? "dark" : "light");
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [user?.theme_preference]);

  const value: AuthContextValue = {
    user,
    api,
    loading,
    setSession: (u, tokens) => {
      memory.access = tokens.access;
      memory.refresh = tokens.refresh;
      localStorage.setItem("rv_access", tokens.access);
      localStorage.setItem("rv_refresh", tokens.refresh);
      setUser(u);
    },
    refreshMe: async () => setUser(await api.auth.me()),
    logout: async () => {
      await api.auth.logout();
      setUser(null);
    },
    setTheme: async (theme) => {
      const updated = await api.auth.updateTheme(theme);
      setUser(updated);
    },
    getAccessToken: () => memory.access || (typeof window !== "undefined" ? localStorage.getItem("rv_access") : null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
