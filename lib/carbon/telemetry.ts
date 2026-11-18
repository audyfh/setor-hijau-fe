import { getEnv } from "@/lib/config/env";
import { TELEMETRY_ENDPOINT_PATH } from "@/lib/carbon/swdm";

export type VisitorType = "new" | "returning";

export interface RecordTelemetryPayload {
  bank_sampah_id?: string;
  bank_sampah_code?: string;
  session_id?: string;
  page_path: string;
  data_bytes_transferred: number;
  visitor_type?: VisitorType;
  client_timestamp?: string;
}

const SESSION_ID_KEY = "setor_hijau_telemetry_session_id";
const VISITOR_FLAG_KEY = "setor_hijau_returning_visitor";

function createFallbackId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Reads or initializes an anonymous per-tab session ID and new/returning visitor flag.
 */
export function getOrCreateSessionMeta(): { sessionId: string; visitorType: VisitorType } {
  if (typeof window === "undefined") {
    return { sessionId: "server", visitorType: "new" };
  }

  let sessionId = "";
  let visitorType: VisitorType = "new";

  try {
    const existingSession = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existingSession) {
      sessionId = existingSession;
    } else {
      sessionId = createFallbackId();
      window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }

    const hasVisitedBefore = window.localStorage.getItem(VISITOR_FLAG_KEY);
    if (hasVisitedBefore === "1") {
      visitorType = "returning";
    } else {
      window.localStorage.setItem(VISITOR_FLAG_KEY, "1");
    }
  } catch {
    sessionId = sessionId || createFallbackId();
  }

  return { sessionId, visitorType };
}

/**
 * Dispatches measured bytes to POST /api/v1/public/impact/telemetry.
 * Fails silently when offline so waste bank workflows are never disrupted.
 */
export async function sendCarbonTelemetry(payload: RecordTelemetryPayload): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  if (!Number.isFinite(payload.data_bytes_transferred) || payload.data_bytes_transferred <= 0) {
    return false;
  }

  const { apiBaseUrl } = getEnv();
  const endpoint = `${apiBaseUrl}${TELEMETRY_ENDPOINT_PATH}`;
  const body = JSON.stringify({
    ...payload,
    data_bytes_transferred: Math.floor(payload.data_bytes_transferred),
    client_timestamp: payload.client_timestamp ?? new Date().toISOString(),
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
    if (response.ok) {
      return true;
    }
  } catch {
    // Fall back to sendBeacon below if fetch is interrupted during page unload.
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      return navigator.sendBeacon(endpoint, blob);
    }
  } catch {
    return false;
  }

  return false;
}
