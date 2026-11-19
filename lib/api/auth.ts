import { apiFetch } from "@/lib/api/client";
import type {
  AuthTokenPairResponse,
  AuthUser,
  LoginRequest,
  QRLoginRequest,
  RegisterTenantRequest,
  ResetPasswordRequest,
  TenantProfile,
} from "@/lib/auth/types";

function extractString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Normalizes login/refresh/register responses across flat or nested ({ data }, { tokens })
 * backend envelopes so access_token and refresh_token are always extracted reliably.
 */
export function normalizeTokenPairResponse(raw: unknown): AuthTokenPairResponse {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const dataObj =
    root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null;
  const tokensObj =
    root.tokens && typeof root.tokens === "object"
      ? (root.tokens as Record<string, unknown>)
      : dataObj?.tokens && typeof dataObj.tokens === "object"
        ? (dataObj.tokens as Record<string, unknown>)
        : null;

  const accessToken =
    extractString(root, "access_token", "accessToken", "token", "jwt") ??
    (tokensObj ? extractString(tokensObj, "access_token", "accessToken", "token", "jwt") : undefined) ??
    (dataObj ? extractString(dataObj, "access_token", "accessToken", "token", "jwt") : undefined);

  const refreshToken =
    extractString(root, "refresh_token", "refreshToken") ??
    (tokensObj ? extractString(tokensObj, "refresh_token", "refreshToken") : undefined) ??
    (dataObj ? extractString(dataObj, "refresh_token", "refreshToken") : undefined) ??
    "";

  if (!accessToken) {
    const keys = Object.keys(root).join(", ") || "(kosong)";
    throw new Error(`Respons login tidak menyertakan access_token (keys: ${keys}).`);
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in:
      typeof root.expires_in === "number"
        ? root.expires_in
        : typeof dataObj?.expires_in === "number"
          ? dataObj.expires_in
          : undefined,
    token_type: extractString(root, "token_type") ?? (dataObj ? extractString(dataObj, "token_type") : undefined),
    user: (root.user ?? dataObj?.user) as AuthUser | undefined,
    tenant: (root.tenant ?? dataObj?.tenant) as TenantProfile | undefined,
  };
}

export async function registerTenant(
  payload: RegisterTenantRequest,
): Promise<AuthTokenPairResponse | { tenant: TenantProfile; user?: AuthUser }> {
  const raw = await apiFetch<Record<string, unknown>>("/api/v1/tenants/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  try {
    return normalizeTokenPairResponse(raw);
  } catch {
    return raw as unknown as { tenant: TenantProfile; user?: AuthUser };
  }
}

export async function loginWithPassword(payload: LoginRequest): Promise<AuthTokenPairResponse> {
  const raw = await apiFetch<unknown>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeTokenPairResponse(raw);
}

export async function loginNasabahWithQr(payload: QRLoginRequest): Promise<AuthTokenPairResponse> {
  const raw = await apiFetch<unknown>("/api/v1/auth/login/qr", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeTokenPairResponse(raw);
}

export async function refreshAuthTokens(refreshToken: string): Promise<AuthTokenPairResponse> {
  const raw = await apiFetch<unknown>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return normalizeTokenPairResponse(raw);
}

export async function logoutSession(refreshToken: string): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function requestPasswordReset(email: string): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(
  payload: ResetPasswordRequest,
): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/v1/auth/me", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function fetchCurrentTenant(accessToken: string): Promise<TenantProfile> {
  return apiFetch<TenantProfile>("/api/v1/tenants/current", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
