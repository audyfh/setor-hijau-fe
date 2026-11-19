import type { AuthSession, AuthUser, UserRole } from "@/lib/auth/types";

const SESSION_STORAGE_KEY = "setor_hijau_auth_session_v1";
const SESSION_CHANGE_EVENT = "setor-hijau:session-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifySessionChanged(): void {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent === "function"
  ) {
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT));
  }
}

export function subscribeSessionChange(listener: () => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {};
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SESSION_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener(SESSION_CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getStoredSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? "",
      user: parsed.user ?? null,
      tenant: parsed.tenant ?? null,
    };
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    notifySessionChanged();
  } catch {
    // Ignore storage quota errors cleanly.
  }
}

export function clearStoredSession(): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    notifySessionChanged();
  } catch {
    // Ignore storage errors cleanly.
  }
}

interface JwtClaims {
  sub?: string;
  user_id?: string;
  role?: string;
  bank_sampah_id?: string;
  username?: string;
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const base64 = normalized + padding;

  if (typeof atob === "function") {
    return atob(base64);
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Extracts basic non-sensitive claims from a JWT access token as a fallback
 * when /auth/me has not been fetched yet. Never logs token strings.
 */
export function extractUserFromJwt(accessToken: string): AuthUser | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return null;
    }
    const payloadJson = decodeBase64Url(parts[1]);
    const claims = JSON.parse(payloadJson) as JwtClaims;
    const role: UserRole | null =
      claims.role === "pengelola" || claims.role === "nasabah" ? claims.role : null;

    if (!role || !claims.bank_sampah_id) {
      return null;
    }

    return {
      id: claims.user_id ?? claims.sub ?? "",
      username: claims.username ?? "",
      full_name: claims.username ?? "",
      role,
      bank_sampah_id: claims.bank_sampah_id,
    };
  } catch {
    return null;
  }
}
