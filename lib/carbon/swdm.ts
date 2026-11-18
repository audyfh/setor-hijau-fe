import { co2 } from "@tgwf/co2";

export const SWDM_V4_VERSION = "SWDM v4";
export const TELEMETRY_ENDPOINT_PATH = "/api/v1/public/impact/telemetry";

/**
 * SWDM v4 system segment proportions documented in Backend CARBON-METHOD.md Section 8.1.
 */
export const SWDM_V4_SEGMENTS_PCT = {
  dataCenter: 15,
  network: 14,
  userDevice: 52,
  embodiedHardware: 19,
} as const;

const SWDM_V4_MICROGRAMS_PER_MB_NUMERATOR = BigInt(35568);
const HALF_UP_OFFSET = BigInt(500000);
const ONE_MILLION = BigInt(1000000);

const swdmV4Calculator = new co2({
  model: "swd",
  version: 4,
});

export interface DeterministicSWDMv4Result {
  bytesTransferred: number;
  estimatedCo2eMicrograms: number;
  estimatedCo2eGrams: number;
}

export interface CO2jsEstimateResult extends DeterministicSWDMv4Result {
  estimatedCo2eGramsFloat: number;
  greenHosting: boolean;
  swdmVersion: string;
}

export interface ResourceTimingLike {
  name?: string;
  transferSize?: number;
  encodedBodySize?: number;
}

/**
 * Exact deterministic integer fixed-point calculation matching the Go backend
 * (internal/impact/service.go & docs/CARBON-METHOD.md Section 8.2):
 *   micrograms = floor((bytes * 35,568 + 500,000) / 1,000,000)
 *   grams      = floor((micrograms + 500,000) / 1,000,000)
 */
export function calculateDeterministicSWDMv4(bytesTransferred: number): DeterministicSWDMv4Result {
  if (!Number.isFinite(bytesTransferred) || bytesTransferred <= 0) {
    return {
      bytesTransferred: 0,
      estimatedCo2eMicrograms: 0,
      estimatedCo2eGrams: 0,
    };
  }

  const safeBytes = Math.floor(bytesTransferred);
  const bytesBig = BigInt(safeBytes);
  const microgramsBig = (bytesBig * SWDM_V4_MICROGRAMS_PER_MB_NUMERATOR + HALF_UP_OFFSET) / ONE_MILLION;
  const gramsBig = (microgramsBig + HALF_UP_OFFSET) / ONE_MILLION;

  return {
    bytesTransferred: safeBytes,
    estimatedCo2eMicrograms: Number(microgramsBig),
    estimatedCo2eGrams: Number(gramsBig),
  };
}

/**
 * Estimates digital carbon emissions using @tgwf/co2 (SWDM v4) for real-time UI feedback
 * paired with the exact integer microgram/gram ledger values used by the Setor Hijau backend.
 */
export function estimateWithCO2js(bytesTransferred: number, greenHosting = false): CO2jsEstimateResult {
  const deterministic = calculateDeterministicSWDMv4(bytesTransferred);
  if (deterministic.bytesTransferred === 0) {
    return {
      ...deterministic,
      estimatedCo2eGramsFloat: 0,
      greenHosting,
      swdmVersion: SWDM_V4_VERSION,
    };
  }

  const co2Result = swdmV4Calculator.perByte(deterministic.bytesTransferred, greenHosting);
  const floatGrams = typeof co2Result === "number" ? co2Result : co2Result.total;

  return {
    ...deterministic,
    estimatedCo2eGramsFloat: floatGrams,
    greenHosting,
    swdmVersion: SWDM_V4_VERSION,
  };
}

/**
 * Filters out inline/blob resources and the carbon telemetry endpoint itself
 * so reporting telemetry never causes a recursive measurement loop.
 */
export function shouldTrackResourceUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return false;
  }
  if (normalized.includes(TELEMETRY_ENDPOINT_PATH)) {
    return false;
  }
  return true;
}

/**
 * Extracts transferred bytes from a browser PerformanceEntry, falling back to
 * encodedBodySize when transferSize is 0 on cross-origin resources without Timing-Allow-Origin.
 */
export function extractTransferredBytes(entry: ResourceTimingLike): number {
  if (!shouldTrackResourceUrl(entry.name ?? "")) {
    return 0;
  }
  if (typeof entry.transferSize === "number" && Number.isFinite(entry.transferSize) && entry.transferSize > 0) {
    return Math.floor(entry.transferSize);
  }
  if (
    typeof entry.encodedBodySize === "number" &&
    Number.isFinite(entry.encodedBodySize) &&
    entry.encodedBodySize > 0
  ) {
    return Math.floor(entry.encodedBodySize);
  }
  return 0;
}
