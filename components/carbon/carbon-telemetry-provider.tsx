"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  estimateWithCO2js,
  extractTransferredBytes,
  SWDM_V4_VERSION,
  type CO2jsEstimateResult,
} from "@/lib/carbon/swdm";
import { getOrCreateSessionMeta, sendCarbonTelemetry } from "@/lib/carbon/telemetry";
import { formatBytes, formatEstimatedCO2eMicrograms } from "@/lib/format/units";

export interface CarbonTelemetryContextValue {
  sessionBytesTransferred: number;
  estimatedCo2eMicrograms: number;
  estimatedCo2eGrams: number;
  co2jsEstimateGrams: number;
  swdmVersion: string;
}

const INITIAL_ESTIMATE: CO2jsEstimateResult = estimateWithCO2js(0);

const CarbonTelemetryContext = createContext<CarbonTelemetryContextValue>({
  sessionBytesTransferred: INITIAL_ESTIMATE.bytesTransferred,
  estimatedCo2eMicrograms: INITIAL_ESTIMATE.estimatedCo2eMicrograms,
  estimatedCo2eGrams: INITIAL_ESTIMATE.estimatedCo2eGrams,
  co2jsEstimateGrams: INITIAL_ESTIMATE.estimatedCo2eGramsFloat,
  swdmVersion: SWDM_V4_VERSION,
});

export function useCarbonTelemetry(): CarbonTelemetryContextValue {
  return useContext(CarbonTelemetryContext);
}

export function CarbonTelemetryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const [estimate, setEstimate] = useState<CO2jsEstimateResult>(INITIAL_ESTIMATE);

  const seenEntriesRef = useRef<WeakSet<PerformanceEntry>>(new WeakSet());
  const sessionBytesRef = useRef<number>(0);
  const unreportedBytesRef = useRef<number>(0);
  const currentPathRef = useRef<string>(pathname);

  useEffect(() => {
    const previousPath = currentPathRef.current;
    if (previousPath !== pathname && unreportedBytesRef.current > 0) {
      const bytesToSend = unreportedBytesRef.current;
      unreportedBytesRef.current = 0;
      const { sessionId, visitorType } = getOrCreateSessionMeta();
      void sendCarbonTelemetry({
        page_path: previousPath,
        data_bytes_transferred: bytesToSend,
        session_id: sessionId,
        visitor_type: visitorType,
      });
    }
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
      return;
    }

    const recordEntries = (entries: PerformanceEntryList) => {
      let addedBytes = 0;
      for (const entry of entries) {
        if (seenEntriesRef.current.has(entry)) {
          continue;
        }
        seenEntriesRef.current.add(entry);
        const bytes = extractTransferredBytes(entry as PerformanceResourceTiming);
        if (bytes > 0) {
          addedBytes += bytes;
        }
      }

      if (addedBytes > 0) {
        sessionBytesRef.current += addedBytes;
        unreportedBytesRef.current += addedBytes;
        setEstimate(estimateWithCO2js(sessionBytesRef.current));
      }
    };

    const observer = new PerformanceObserver((list) => {
      recordEntries(list.getEntries());
    });

    try {
      observer.observe({ type: "navigation", buffered: true });
      observer.observe({ type: "resource", buffered: true });
    } catch {
      try {
        observer.observe({ entryTypes: ["navigation", "resource"] });
      } catch {
        // Unsupported browser PerformanceObserver configuration; skip silently.
      }
    }

    const flushOnHide = () => {
      if (document.visibilityState !== "hidden" || unreportedBytesRef.current <= 0) {
        return;
      }
      const bytesToSend = unreportedBytesRef.current;
      unreportedBytesRef.current = 0;
      const { sessionId, visitorType } = getOrCreateSessionMeta();
      void sendCarbonTelemetry({
        page_path: currentPathRef.current,
        data_bytes_transferred: bytesToSend,
        session_id: sessionId,
        visitor_type: visitorType,
      });
    };

    document.addEventListener("visibilitychange", flushOnHide);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", flushOnHide);
    };
  }, []);

  const contextValue: CarbonTelemetryContextValue = {
    sessionBytesTransferred: estimate.bytesTransferred,
    estimatedCo2eMicrograms: estimate.estimatedCo2eMicrograms,
    estimatedCo2eGrams: estimate.estimatedCo2eGrams,
    co2jsEstimateGrams: estimate.estimatedCo2eGramsFloat,
    swdmVersion: estimate.swdmVersion,
  };

  return (
    <CarbonTelemetryContext.Provider value={contextValue}>
      {children}
    </CarbonTelemetryContext.Provider>
  );
}

/**
 * Compact, transparent indicator displaying the real-time session digital footprint
 * estimated via @tgwf/co2 (SWDM v4).
 */
export function SessionCarbonBadge() {
  const { sessionBytesTransferred, estimatedCo2eMicrograms, swdmVersion } = useCarbonTelemetry();

  return (
    <aside
      aria-label="Estimasi jejak karbon digital sesi ini"
      className="border-t border-[var(--color-rule)] bg-[var(--color-paper-2)] px-[var(--gutter)] py-[var(--space-sm)] text-[var(--text-xs)] text-[var(--color-ink-2)]"
    >
      <div className="mx-auto flex max-w-[var(--container)] flex-wrap items-center justify-between gap-[var(--space-xs)]">
        <span>
          Estimasi Jejak Digital Sesi Ini ({swdmVersion} · CO2.js):{" "}
          <strong className="fig font-medium text-[var(--color-ink)]">
            {formatBytes(sessionBytesTransferred)}
          </strong>{" "}
          (
          <strong className="fig font-medium text-[var(--color-ink)]">
            {formatEstimatedCO2eMicrograms(estimatedCo2eMicrograms)}
          </strong>
          )
        </span>
        <span className="text-[var(--color-muted)]">
          Nilai diestimasi dari volume transfer data, bukan pengukuran watt langsung.
        </span>
      </div>
    </aside>
  );
}
