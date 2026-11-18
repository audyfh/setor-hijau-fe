export const DEFAULT_API_BASE_URL = "https://prod-setor-hijau.cloud.run";

export interface AppEnv {
  apiBaseUrl: string;
  appEnv: string;
}

/**
 * Strips whitespace and trailing slashes from a base URL so endpoint concatenation
 * never produces double slashes. Falls back to the default Cloud Run URL when empty.
 */
export function normalizeBaseUrl(rawUrl: string | undefined): string {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

/**
 * Resolves validated frontend environment variables.
 */
export function getEnv(): AppEnv {
  return {
    apiBaseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
    appEnv: (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development").trim(),
  };
}
