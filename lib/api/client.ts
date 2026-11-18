import { getEnv } from "@/lib/config/env";

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export interface HealthResponse {
  status: string;
}

/**
 * Typed HTTP client targeting the Setor Hijau Go backend (NEXT_PUBLIC_API_BASE_URL).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiBaseUrl } = getEnv();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalizedPath}`;

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Permintaan API gagal (${response.status})`;
    throw new ApiError(response.status, errorMessage, payload);
  }

  return payload as T;
}

/**
 * Verifies backend liveness via GET /healthz.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/healthz", { cache: "no-store" });
}
