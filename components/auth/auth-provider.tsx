"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentTenant, fetchCurrentUser, logoutSession } from "@/lib/api/auth";
import { authFetch } from "@/lib/auth/fetch-auth";
import {
  clearStoredSession,
  extractUserFromJwt,
  getStoredSession,
  setStoredSession,
  subscribeSessionChange,
} from "@/lib/auth/session";
import type {
  AuthSession,
  AuthTokenPairResponse,
  AuthUser,
  TenantProfile,
} from "@/lib/auth/types";

export interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  tenant: TenantProfile | null;
  isReady: boolean;
  applyTokenPair: (tokens: AuthTokenPairResponse) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  tenant: null,
  isReady: false,
  applyTokenPair: async () => {
    throw new Error("AuthProvider belum terpasang.");
  },
  logout: async () => {},
  refreshProfile: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  const hydrateFromServer = useCallback(async (current: AuthSession): Promise<AuthSession> => {
    try {
      const [user, tenant] = await Promise.all([
        authFetch<AuthUser>("/api/v1/auth/me", { cache: "no-store" }),
        authFetch<TenantProfile>("/api/v1/tenants/current", { cache: "no-store" }).catch(
          () => current.tenant,
        ),
      ]);
      const latest = getStoredSession() ?? current;
      const updated: AuthSession = {
        accessToken: latest.accessToken,
        refreshToken: latest.refreshToken,
        user,
        tenant,
      };
      setStoredSession(updated);
      setSession(updated);
      return updated;
    } catch {
      const stillStored = getStoredSession();
      if (!stillStored) {
        setSession(null);
      }
      return stillStored ?? current;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initSession() {
      const stored = getStoredSession();
      if (!stored) {
        if (active) {
          setIsReady(true);
        }
        return;
      }

      if (active) {
        setSession(stored);
      }

      await hydrateFromServer(stored);
      if (active) {
        setIsReady(true);
      }
    }

    void initSession();

    const unsubscribe = subscribeSessionChange(() => {
      if (active) {
        setSession(getStoredSession());
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hydrateFromServer]);

  const applyTokenPair = useCallback(
    async (tokens: AuthTokenPairResponse): Promise<AuthSession> => {
      if (!tokens?.access_token) {
        throw new Error("Respons login tidak menyertakan access_token.");
      }

      let user = tokens.user ?? extractUserFromJwt(tokens.access_token);
      let tenant = tokens.tenant ?? null;

      if (!user) {
        user = await fetchCurrentUser(tokens.access_token).catch(() => null);
      }
      if (!tenant) {
        tenant = await fetchCurrentTenant(tokens.access_token).catch(() => null);
      }

      const nextSession: AuthSession = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        user,
        tenant,
      };

      setStoredSession(nextSession);
      setSession(nextSession);
      setIsReady(true);
      return nextSession;
    },
    [],
  );

  const logout = useCallback(async () => {
    const current = getStoredSession();
    clearStoredSession();
    setSession(null);

    if (current?.refreshToken) {
      await logoutSession(current.refreshToken).catch(() => {
        // Ignore network errors on logout; local session is already cleared.
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = getStoredSession();
    if (!current) {
      setSession(null);
      return;
    }
    await hydrateFromServer(current);
  }, [hydrateFromServer]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      tenant: session?.tenant ?? null,
      isReady,
      applyTokenPair,
      logout,
      refreshProfile,
    }),
    [session, isReady, applyTokenPair, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
