import { describe, expect, it } from "vitest";
import {
  calculateDeterministicSWDMv4,
  estimateWithCO2js,
  extractTransferredBytes,
  shouldTrackResourceUrl,
  SWDM_V4_SEGMENTS_PCT,
  SWDM_V4_VERSION,
} from "@/lib/carbon/swdm";

describe("SWDM v4 deterministic calculation (aligned with backend CARBON-METHOD.md Section 8.2)", () => {
  it("returns zeroes for zero or negative bytes", () => {
    expect(calculateDeterministicSWDMv4(0)).toEqual({
      bytesTransferred: 0,
      estimatedCo2eMicrograms: 0,
      estimatedCo2eGrams: 0,
    });
    expect(calculateDeterministicSWDMv4(-500)).toEqual({
      bytesTransferred: 0,
      estimatedCo2eMicrograms: 0,
      estimatedCo2eGrams: 0,
    });
    expect(calculateDeterministicSWDMv4(Number.NaN)).toEqual({
      bytesTransferred: 0,
      estimatedCo2eMicrograms: 0,
      estimatedCo2eGrams: 0,
    });
  });

  it("matches hand-verified 1 MB test case (1,000,000 bytes -> 35,568 µg CO2e, 0 g)", () => {
    expect(calculateDeterministicSWDMv4(1_000_000)).toEqual({
      bytesTransferred: 1_000_000,
      estimatedCo2eMicrograms: 35_568,
      estimatedCo2eGrams: 0,
    });
  });

  it("matches hand-verified 100 MB test case (100,000,000 bytes -> 3,556,800 µg CO2e -> 4 g)", () => {
    expect(calculateDeterministicSWDMv4(100_000_000)).toEqual({
      bytesTransferred: 100_000_000,
      estimatedCo2eMicrograms: 3_556_800,
      estimatedCo2eGrams: 4,
    });
  });

  it("matches 1 GB test case (1,000,000,000 bytes -> 35,568,000 µg CO2e -> 36 g)", () => {
    expect(calculateDeterministicSWDMv4(1_000_000_000)).toEqual({
      bytesTransferred: 1_000_000_000,
      estimatedCo2eMicrograms: 35_568_000,
      estimatedCo2eGrams: 36,
    });
  });

  it("keeps segment percentages summing to 100%", () => {
    const sum =
      SWDM_V4_SEGMENTS_PCT.dataCenter +
      SWDM_V4_SEGMENTS_PCT.network +
      SWDM_V4_SEGMENTS_PCT.userDevice +
      SWDM_V4_SEGMENTS_PCT.embodiedHardware;
    expect(sum).toBe(100);
  });
});

describe("@tgwf/co2 integration (estimateWithCO2js)", () => {
  it("computes 0 for zero bytes", () => {
    const result = estimateWithCO2js(0);
    expect(result.estimatedCo2eGramsFloat).toBe(0);
    expect(result.estimatedCo2eMicrograms).toBe(0);
    expect(result.swdmVersion).toBe(SWDM_V4_VERSION);
  });

  it("uses @tgwf/co2 SWDM v4 model for 1 MB and 1 GB", () => {
    const oneMb = estimateWithCO2js(1_000_000, false);
    expect(oneMb.estimatedCo2eGramsFloat).toBeCloseTo(0.1482, 4);
    expect(oneMb.estimatedCo2eMicrograms).toBe(35_568);

    const oneGb = estimateWithCO2js(1_000_000_000, false);
    expect(oneGb.estimatedCo2eGramsFloat).toBeCloseTo(148.2, 2);
    expect(oneGb.estimatedCo2eGrams).toBe(36);
  });

  it("reduces estimated grams when greenHosting is true", () => {
    const standard = estimateWithCO2js(1_000_000_000, false);
    const green = estimateWithCO2js(1_000_000_000, true);
    expect(green.estimatedCo2eGramsFloat).toBeLessThan(standard.estimatedCo2eGramsFloat);
  });
});

describe("Telemetry URL filtering & byte extraction", () => {
  it("ignores telemetry endpoints, inline data, and blob URLs", () => {
    expect(shouldTrackResourceUrl("https://prod-setor-hijau.cloud.run/api/v1/public/impact/telemetry")).toBe(
      false,
    );
    expect(shouldTrackResourceUrl("/api/v1/public/impact/telemetry")).toBe(false);
    expect(shouldTrackResourceUrl("data:image/png;base64,abc")).toBe(false);
    expect(shouldTrackResourceUrl("blob:http://localhost:3000/123")).toBe(false);
    expect(shouldTrackResourceUrl("")).toBe(false);
    expect(shouldTrackResourceUrl("https://prod-setor-hijau.cloud.run/api/v1/public/impact")).toBe(true);
  });

  it("prefers transferSize and falls back to encodedBodySize for cross-origin resources", () => {
    expect(
      extractTransferredBytes({
        name: "https://prod-setor-hijau.cloud.run/api/v1/public/impact",
        transferSize: 12450,
        encodedBodySize: 12000,
      }),
    ).toBe(12450);

    expect(
      extractTransferredBytes({
        name: "https://fonts.gstatic.com/s/geist.woff2",
        transferSize: 0,
        encodedBodySize: 18400,
      }),
    ).toBe(18400);

    expect(
      extractTransferredBytes({
        name: "https://prod-setor-hijau.cloud.run/api/v1/public/impact/telemetry",
        transferSize: 900,
        encodedBodySize: 800,
      }),
    ).toBe(0);
  });
});
