import { authFetch } from "@/lib/auth/fetch-auth";

export interface SaleLineInput {
  material_type_id: string;
  weight_grams: number;
  price_per_kg_idr: number;
}

export interface CreateSaleRequest {
  buyer_name: string;
  sale_date: string;
  notes?: string;
  lines: SaleLineInput[];
}

export interface SaleLineRecord {
  id?: string;
  material_type_id: string;
  material_name?: string;
  weight_grams: number;
  price_per_kg_idr: number;
  subtotal_idr: number;
}

export interface SaleRecord {
  id: string;
  buyer_name: string;
  sale_date: string;
  notes?: string;
  total_weight_grams: number;
  total_amount_idr: number;
  created_at?: string;
  lines?: SaleLineRecord[];
}

export interface CreateWithdrawalRequest {
  amount_idr: number;
  notes?: string;
}

export interface WithdrawalRecord {
  id: string;
  nasabah_id: string;
  nasabah_name?: string;
  amount_idr: number;
  notes?: string;
  created_at: string;
}

export type CashbookEntryType = "cash_in" | "cash_out";

export interface CreateCashbookEntryRequest {
  entry_type: CashbookEntryType;
  category: string;
  amount_idr: number;
  description: string;
  transaction_date?: string;
}

export interface CashbookEntryRecord {
  id: string;
  entry_type: CashbookEntryType;
  category: string;
  amount_idr: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  transaction_date: string;
  created_at?: string;
}

export interface CashbookSummary {
  total_cash_in_idr: number;
  total_cash_out_idr: number;
  net_cash_balance_idr: number;
  total_sales_idr: number;
  total_withdrawals_idr: number;
}

export interface CashbookReconciliation {
  cashbook_balance_idr: number;
  total_nasabah_balance_idr: number;
  total_deposits_value_idr: number;
  total_withdrawals_idr: number;
  total_sales_idr: number;
  discrepancy_idr: number;
  is_reconciled: boolean;
  notes?: string;
}

export interface NasabahBalanceResponse {
  nasabah_id: string;
  balance_idr: number;
  total_deposits_idr?: number;
  total_withdrawals_idr?: number;
}

export function assertPositiveInt(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${fieldName} harus berupa bilangan bulat positif (>= 1).`);
  }
  return value;
}

export function assertNonNegativeInt(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} harus berupa bilangan bulat (>= 0).`);
  }
  return value;
}

/**
 * Pure integer Rupiah subtotal for a wholesale sale line.
 */
export function calculateSaleLineSubtotalIdr(
  weightGrams: number,
  pricePerKgIdr: number,
): number {
  if (!Number.isSafeInteger(weightGrams) || weightGrams <= 0) {
    return 0;
  }
  if (!Number.isSafeInteger(pricePerKgIdr) || pricePerKgIdr < 0) {
    return 0;
  }
  return Math.floor((weightGrams * pricePerKgIdr + 500) / 1000);
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

function extractArray<T>(raw: unknown, ...keys: string[]): T[] {
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  const obj = (raw ?? {}) as Record<string, unknown>;
  for (const key of ["items", "data", ...keys]) {
    if (Array.isArray(obj[key])) {
      return obj[key] as T[];
    }
  }
  return [];
}

export async function createSale(payload: CreateSaleRequest): Promise<SaleRecord> {
  if (!payload.buyer_name.trim()) {
    throw new Error("Nama pembeli/pengepul wajib diisi.");
  }
  if (!payload.lines.length) {
    throw new Error("Minimal satu baris jenis sampah wajib diisi.");
  }

  const normalizedLines = payload.lines.map((line) => ({
    material_type_id: line.material_type_id,
    weight_grams: assertPositiveInt(line.weight_grams, "Berat (gram)"),
    price_per_kg_idr: assertNonNegativeInt(line.price_per_kg_idr, "Harga per kg (Rp)"),
  }));

  return authFetch<SaleRecord>("/api/v1/cashbook/sales", {
    method: "POST",
    body: JSON.stringify({
      buyer_name: payload.buyer_name.trim(),
      sale_date: payload.sale_date,
      notes: payload.notes?.trim() || undefined,
      lines: normalizedLines,
    }),
  });
}

export async function listSales(): Promise<SaleRecord[]> {
  const raw = await authFetch<unknown>("/api/v1/cashbook/sales", {
    cache: "no-store",
  });
  return extractArray<SaleRecord>(raw, "sales");
}

export async function getSaleDetail(saleId: string): Promise<SaleRecord> {
  return authFetch<SaleRecord>(`/api/v1/cashbook/sales/${encodeURIComponent(saleId)}`, {
    cache: "no-store",
  });
}

export async function createWithdrawal(
  nasabahId: string,
  payload: CreateWithdrawalRequest,
): Promise<WithdrawalRecord> {
  const amount = assertPositiveInt(payload.amount_idr, "Nominal penarikan (Rp)");
  return authFetch<WithdrawalRecord>(
    `/api/v1/nasabah/${encodeURIComponent(nasabahId)}/withdrawals`,
    {
      method: "POST",
      body: JSON.stringify({
        amount_idr: amount,
        notes: payload.notes?.trim() || undefined,
      }),
    },
  );
}

export async function listNasabahWithdrawals(nasabahId: string): Promise<WithdrawalRecord[]> {
  const raw = await authFetch<unknown>(
    `/api/v1/nasabah/${encodeURIComponent(nasabahId)}/withdrawals`,
    { cache: "no-store" },
  );
  return extractArray<WithdrawalRecord>(raw, "withdrawals");
}

export async function getNasabahBalance(nasabahId: string): Promise<NasabahBalanceResponse> {
  const raw = await authFetch<Record<string, unknown>>(
    `/api/v1/nasabah/${encodeURIComponent(nasabahId)}/balance`,
    { cache: "no-store" },
  );
  return {
    nasabah_id: typeof raw.nasabah_id === "string" ? raw.nasabah_id : nasabahId,
    balance_idr: readInt(raw, "balance_idr", "current_balance_idr", "available_balance_idr"),
    total_deposits_idr: readInt(raw, "total_deposits_idr", "total_deposit_idr"),
    total_withdrawals_idr: readInt(raw, "total_withdrawals_idr", "total_withdrawal_idr"),
  };
}

export async function createCashbookEntry(
  payload: CreateCashbookEntryRequest,
): Promise<CashbookEntryRecord> {
  const amount = assertPositiveInt(payload.amount_idr, "Nominal kas (Rp)");
  if (!payload.category.trim()) {
    throw new Error("Kategori entri kas wajib diisi.");
  }
  if (!payload.description.trim()) {
    throw new Error("Deskripsi entri kas wajib diisi.");
  }

  return authFetch<CashbookEntryRecord>("/api/v1/cashbook/entries", {
    method: "POST",
    body: JSON.stringify({
      entry_type: payload.entry_type,
      category: payload.category.trim(),
      amount_idr: amount,
      description: payload.description.trim(),
      transaction_date: payload.transaction_date || undefined,
    }),
  });
}

export async function listCashbookEntries(): Promise<CashbookEntryRecord[]> {
  const raw = await authFetch<unknown>("/api/v1/cashbook/entries", {
    cache: "no-store",
  });
  return extractArray<CashbookEntryRecord>(raw, "entries");
}

export async function getCashbookSummary(): Promise<CashbookSummary> {
  const raw = await authFetch<Record<string, unknown>>("/api/v1/cashbook/summary", {
    cache: "no-store",
  });
  const cashIn = readInt(raw, "total_cash_in_idr", "cash_in_idr", "total_in_idr");
  const cashOut = readInt(raw, "total_cash_out_idr", "cash_out_idr", "total_out_idr");
  const net = readInt(
    raw,
    "net_cash_balance_idr",
    "current_balance_idr",
    "balance_idr",
    "net_balance_idr",
  );
  return {
    total_cash_in_idr: cashIn,
    total_cash_out_idr: cashOut,
    net_cash_balance_idr: net || cashIn - cashOut,
    total_sales_idr: readInt(raw, "total_sales_idr", "sales_total_idr"),
    total_withdrawals_idr: readInt(raw, "total_withdrawals_idr", "withdrawals_total_idr"),
  };
}

export async function getCashbookReconciliation(): Promise<CashbookReconciliation> {
  const raw = await authFetch<Record<string, unknown>>("/api/v1/cashbook/reconciliation", {
    cache: "no-store",
  });
  const cashbookBalance = readInt(
    raw,
    "cashbook_balance_idr",
    "net_cash_balance_idr",
    "cash_balance_idr",
  );
  const nasabahBalance = readInt(
    raw,
    "total_nasabah_balance_idr",
    "nasabah_liability_idr",
    "total_payable_idr",
  );
  const discrepancy = readInt(raw, "discrepancy_idr", "difference_idr", "selisih_idr");
  return {
    cashbook_balance_idr: cashbookBalance,
    total_nasabah_balance_idr: nasabahBalance,
    total_deposits_value_idr: readInt(raw, "total_deposits_value_idr", "total_deposits_idr"),
    total_withdrawals_idr: readInt(raw, "total_withdrawals_idr"),
    total_sales_idr: readInt(raw, "total_sales_idr"),
    discrepancy_idr: discrepancy,
    is_reconciled:
      typeof raw.is_reconciled === "boolean" ? raw.is_reconciled : discrepancy === 0,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
  };
}
