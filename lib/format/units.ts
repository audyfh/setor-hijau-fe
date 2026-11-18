const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function toSafeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.trunc(value);
}

/**
 * Formats an integer Rupiah amount using Indonesian locale formatting (e.g. Rp15.000).
 */
export function formatRupiah(amountIdr: number): string {
  const safeInt = toSafeInteger(amountIdr);
  const absFormatted = integerFormatter.format(Math.abs(safeInt));
  return safeInt < 0 ? `-Rp${absFormatted}` : `Rp${absFormatted}`;
}

/**
 * Formats an integer weight in grams as grams (< 1,000 g) or kilograms (>= 1,000 g).
 */
export function formatWeightGrams(weightGrams: number): string {
  const safeGrams = toSafeInteger(weightGrams);
  if (Math.abs(safeGrams) < 1000) {
    return `${integerFormatter.format(safeGrams)} g`;
  }
  return `${decimalFormatter.format(safeGrams / 1000)} kg`;
}

/**
 * Formats integer CO2e grams as grams (< 1,000 g) or kilograms (>= 1,000 g).
 */
export function formatEstimatedCO2eGrams(co2eGrams: number): string {
  const safeGrams = toSafeInteger(co2eGrams);
  if (Math.abs(safeGrams) < 1000) {
    return `${integerFormatter.format(safeGrams)} g CO₂e`;
  }
  return `${decimalFormatter.format(safeGrams / 1000)} kg CO₂e`;
}

/**
 * Formats integer CO2e micrograms for small session digital footprints.
 */
export function formatEstimatedCO2eMicrograms(co2eMicrograms: number): string {
  const safeMicrograms = Math.max(0, toSafeInteger(co2eMicrograms));
  if (safeMicrograms === 0) {
    return "0 µg CO₂e";
  }
  if (safeMicrograms < 1000) {
    return `${integerFormatter.format(safeMicrograms)} µg CO₂e`;
  }
  if (safeMicrograms < 1_000_000) {
    return `${decimalFormatter.format(safeMicrograms / 1000)} mg CO₂e`;
  }
  return formatEstimatedCO2eGrams(Math.round(safeMicrograms / 1_000_000));
}

/**
 * Formats transferred bytes cleanly for session footprint badges.
 */
export function formatBytes(bytes: number): string {
  const safeBytes = Math.max(0, toSafeInteger(bytes));
  if (safeBytes < 1024) {
    return `${integerFormatter.format(safeBytes)} B`;
  }
  if (safeBytes < 1024 * 1024) {
    return `${decimalFormatter.format(safeBytes / 1024)} KB`;
  }
  return `${decimalFormatter.format(safeBytes / (1024 * 1024))} MB`;
}
