import { ApiError, apiFetch } from "@/lib/api/client";
import { refreshAuthTokens } from "@/lib/api/auth";
import { getEnv } from "@/lib/config/env";
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

  if (!current.refreshToken) {
    clearStoredSession();
    return null;
  }

  inFlightRefresh = (async () => {
    try {
      const tokens = await refreshAuthTokens(current.refreshToken);
      const nextSession: AuthSession = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || current.refreshToken,
        user: tokens.user ?? current.user ?? extractUserFromJwt(tokens.access_token),
        tenant: tokens.tenant ?? current.tenant,
      };
      setStoredSession(nextSession);
      return nextSession;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearStoredSession();
      }
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

export interface AuthBlobResponse {
  blob: Blob;
  filename: string | null;
  contentType: string | null;
}

function parseDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const utf8Match = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const quotedMatch = header.match(/filename="?([^";]+)"?/i);
  return quotedMatch?.[1]?.trim() || null;
}

async function fetchBlobOnce(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  const { apiBaseUrl } = getEnv();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalizedPath}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(url, {
    ...init,
    headers,
  });
}

async function parseErrorResponse(response: Response): Promise<never> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  const message =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `Gagal mengunduh berkas (${response.status})`;
  throw new ApiError(response.status, message, payload);
}

/**
 * Authenticated binary/blob fetch helper for CSV/PDF exports.
 * Shares single-flight 401 refresh token rotation with authFetch.
 */
export async function authFetchBlob(
  path: string,
  init: RequestInit = {},
): Promise<AuthBlobResponse> {
  const session = getStoredSession();
  if (!session) {
    throw new ApiError(401, "Sesi login tidak ditemukan. Silakan masuk kembali.");
  }

  let response = await fetchBlobOnce(path, session.accessToken, init);
  if (response.status === 401) {
    const refreshed = await rotateSession(session);
    if (!refreshed) {
      throw new ApiError(401, "Sesi Anda telah berakhir. Silakan masuk kembali.");
    }
    response = await fetchBlobOnce(path, refreshed.accessToken, init);
  }

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const blob = await response.blob();
  return {
    blob,
    filename: parseDispositionFilename(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type"),
  };
}
