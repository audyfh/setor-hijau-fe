import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatEstimatedCO2eGrams,
  formatEstimatedCO2eMicrograms,
  formatRupiah,
  formatWeightGrams,
} from "@/lib/format/units";

describe("Integer unit display formatters", () => {
  it("formats integer Rupiah amounts without floats", () => {
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(15000)).toBe("Rp15.000");
    expect(formatRupiah(-2500)).toBe("-Rp2.500");
  });

  it("formats weight in grams (< 1,000 g) and kilograms (>= 1,000 g)", () => {
    expect(formatWeightGrams(500)).toBe("500 g");
    expect(formatWeightGrams(1500)).toBe("1,5 kg");
    expect(formatWeightGrams(2000)).toBe("2 kg");
  });

  it("formats estimated CO2e grams and kilograms", () => {
    expect(formatEstimatedCO2eGrams(500)).toBe("500 g CO₂e");
    expect(formatEstimatedCO2eGrams(5142)).toBe("5,14 kg CO₂e");
  });

  it("formats estimated CO2e micrograms cleanly across scales", () => {
    expect(formatEstimatedCO2eMicrograms(0)).toBe("0 µg CO₂e");
    expect(formatEstimatedCO2eMicrograms(450)).toBe("450 µg CO₂e");
    expect(formatEstimatedCO2eMicrograms(35_568)).toBe("35,57 mg CO₂e");
    expect(formatEstimatedCO2eMicrograms(3_556_800)).toBe("4 g CO₂e");
  });

  it("formats transferred bytes cleanly", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1_572_864)).toBe("1,5 MB");
  });
});
