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

export async function registerTenant(
  payload: RegisterTenantRequest,
): Promise<AuthTokenPairResponse | { tenant: TenantProfile; user?: AuthUser }> {
  return apiFetch("/api/v1/tenants/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginWithPassword(payload: LoginRequest): Promise<AuthTokenPairResponse> {
  return apiFetch<AuthTokenPairResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginNasabahWithQr(payload: QRLoginRequest): Promise<AuthTokenPairResponse> {
  return apiFetch<AuthTokenPairResponse>("/api/v1/auth/login/qr", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshAuthTokens(refreshToken: string): Promise<AuthTokenPairResponse> {
  return apiFetch<AuthTokenPairResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
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
