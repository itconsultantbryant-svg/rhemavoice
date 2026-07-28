"use client";

import { createApiClient, type ApiClient } from "@rhemavoice/api-client";
import type { AuthTokens, User } from "@rhemavoice/shared";
import { isSuperAdmin } from "@rhemavoice/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const memory = { access: null as string | null, refresh: null as string | null };

type Ctx = {
  user: User | null;
  api: ApiClient;
  loading: boolean;
  setSession: (u: User, t: AuthTokens) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const api = useMemo(
    () =>
      createApiClient(API_URL, {
        getAccessToken: () => memory.access || localStorage.getItem("rv_admin_access"),
        getRefreshToken: () => memory.refresh || localStorage.getItem("rv_admin_refresh"),
        setTokens: (t) => {
          memory.access = t.access;
          memory.refresh = t.refresh;
          localStorage.setItem("rv_admin_access", t.access);
          localStorage.setItem("rv_admin_refresh", t.refresh);
        },
        clearTokens: () => {
          memory.access = null;
          memory.refresh = null;
          localStorage.removeItem("rv_admin_access");
          localStorage.removeItem("rv_admin_refresh");
        },
      }),
    []
  );

  useEffect(() => {
    const access = localStorage.getItem("rv_admin_access");
    const refresh = localStorage.getItem("rv_admin_refresh");
    if (!access || !refresh) {
      setLoading(false);
      return;
    }
    memory.access = access;
    memory.refresh = refresh;
    api.auth
      .me()
      .then((u) => {
        if (!isSuperAdmin(u) && !u.roles.some((r) => r.includes("admin"))) {
          throw new Error("Not an admin");
        }
        setUser(u);
      })
      .catch(() => api.auth.logout())
      .finally(() => setLoading(false));
  }, [api]);

  return (
    <AuthContext.Provider
      value={{
        user,
        api,
        loading,
        setSession: (u, t) => {
          memory.access = t.access;
          memory.refresh = t.refresh;
          localStorage.setItem("rv_admin_access", t.access);
          localStorage.setItem("rv_admin_refresh", t.refresh);
          setUser(u);
        },
        logout: async () => {
          await api.auth.logout();
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
