import { authFetch, authFetchBlob } from "@/lib/auth/fetch-auth";

export interface MonthlyDashboardData {
  month: string;
  total_deposits_count: number;
  active_nasabah_count: number;
  total_weight_grams: number;
  total_deposit_value_idr: number;
  total_sales_idr: number;
  total_withdrawals_idr: number;
  net_cash_flow_idr: number;
  estimated_co2e_avoided_grams: number;
  estimated_digital_co2e_micrograms: number;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function assertValidMonth(month: string): string {
  const trimmed = month.trim();
  if (!MONTH_PATTERN.test(trimmed)) {
    throw new Error("Format bulan harus YYYY-MM (contoh: 2026-11).");
  }
  return trimmed;
}

function readInt(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && Number.isFinite(val)) {
      return Math.trunc(val);
    }
  }
  return 0;
}

export async function getMonthlyDashboard(month: string): Promise<MonthlyDashboardData> {
  const validMonth = assertValidMonth(month);
  const raw = await authFetch<Record<string, unknown>>(
    `/api/v1/dashboard/monthly?month=${encodeURIComponent(validMonth)}`,
    { cache: "no-store" },
  );

  const operational = (raw.operational ?? raw) as Record<string, unknown>;
  const financial = (raw.financial ?? raw) as Record<string, unknown>;
  const carbon = (raw.carbon ?? raw) as Record<string, unknown>;

  const salesIdr = readInt(financial, "total_sales_idr", "sales_idr");
  const withdrawalsIdr = readInt(financial, "total_withdrawals_idr", "withdrawals_idr");

  return {
    month: typeof raw.month === "string" ? raw.month : validMonth,
    total_deposits_count: readInt(
      operational,
      "total_deposits_count",
      "deposit_count",
      "deposits_count",
    ),
    active_nasabah_count: readInt(
      operational,
      "active_nasabah_count",
      "nasabah_count",
      "active_members_count",
    ),
    total_weight_grams: readInt(operational, "total_weight_grams", "weight_grams"),
    total_deposit_value_idr: readInt(
      financial,
      "total_deposit_value_idr",
      "total_deposits_idr",
      "deposit_value_idr",
    ),
    total_sales_idr: salesIdr,
    total_withdrawals_idr: withdrawalsIdr,
    net_cash_flow_idr:
      readInt(financial, "net_cash_flow_idr", "net_cash_idr", "cash_balance_idr") ||
      salesIdr - withdrawalsIdr,
    estimated_co2e_avoided_grams: readInt(
      carbon,
      "estimated_co2e_avoided_grams",
      "total_estimated_co2e_grams",
      "co2e_avoided_grams",
    ),
    estimated_digital_co2e_micrograms: readInt(
      carbon,
      "estimated_digital_co2e_micrograms",
      "digital_co2e_micrograms",
    ),
  };
}

export interface ReportDownloadResult {
  blob: Blob;
  filename: string;
}

export async function downloadMonthlyCsv(month: string): Promise<ReportDownloadResult> {
  const validMonth = assertValidMonth(month);
  const res = await authFetchBlob(
    `/api/v1/reports/monthly/csv?month=${encodeURIComponent(validMonth)}`,
  );
  return {
    blob: res.blob,
    filename: res.filename || `laporan-setor-hijau-${validMonth}.csv`,
  };
}

export async function downloadMonthlyPdf(month: string): Promise<ReportDownloadResult> {
  const validMonth = assertValidMonth(month);
  const res = await authFetchBlob(
    `/api/v1/reports/monthly/pdf?month=${encodeURIComponent(validMonth)}`,
  );
  return {
    blob: res.blob,
    filename: res.filename || `laporan-setor-hijau-${validMonth}.pdf`,
  };
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
