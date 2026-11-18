import { ApiError, apiFetch } from "@/lib/api/client";
import { refreshAuthTokens } from "@/lib/api/auth";
import {
  clearStoredSession,
  extractUserFromJwt,
  getStoredSession,
  setStoredSession,
} from "@/lib/auth/session";
import type { AuthSession } from "@/lib/auth/types";

let inFlightRefresh: Promise<AuthSession | null> | null = null;

async function rotateSession(current: AuthSession): Promise<AuthSession | null> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const tokens = await refreshAuthTokens(current.refreshToken);
      const nextSession: AuthSession = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: tokens.user ?? current.user ?? extractUserFromJwt(tokens.access_token),
        tenant: tokens.tenant ?? current.tenant,
      };
      setStoredSession(nextSession);
      return nextSession;
    } catch {
      clearStoredSession();
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

/**
 * Authenticated HTTP helper that attaches the Bearer token from the active
 * session and transparently rotates the refresh token once on 401 Unauthorized.
 */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  if (!session) {
    throw new ApiError(401, "Sesi login tidak ditemukan. Silakan masuk kembali.");
  }

  const buildHeaders = (token: string): Headers => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: buildHeaders(session.accessToken),
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    const refreshed = await rotateSession(session);
    if (!refreshed) {
      throw new ApiError(401, "Sesi Anda telah berakhir. Silakan masuk kembali.");
    }

    return apiFetch<T>(path, {
      ...init,
      headers: buildHeaders(refreshed.accessToken),
    });
  }
}
