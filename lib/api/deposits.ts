import { authFetch } from "@/lib/auth/fetch-auth";
import type { NasabahItem } from "@/lib/api/nasabah";

export interface DepositLineInput {
  material_type_id: string;
  weight_grams: number;
}

export interface CreateDepositRequest {
  nasabah_id: string;
  idempotency_key: string;
  client_recorded_at: string;
  notes?: string;
  lines: DepositLineInput[];
}

export interface DepositLineRecord {
  id?: string;
  material_type_id: string;
  material_name?: string;
  material_category?: string;
  weight_grams: number;
  unit_price_per_kg_idr?: number;
  price_per_kg_idr?: number;
  subtotal_idr: number;
  estimated_co2e_grams?: number;
  co2e_grams?: number;
}

export interface DepositRecord {
  id: string;
  bank_sampah_id?: string;
  nasabah_id: string;
  nasabah_name?: string;
  nasabah_username?: string;
  idempotency_key: string;
  client_recorded_at: string;
  created_at?: string;
  notes?: string;
  total_weight_grams: number;
  total_amount_idr: number;
  total_estimated_co2e_grams?: number;
  estimated_co2e_grams?: number;
  replayed?: boolean;
  lines?: DepositLineRecord[];
}

export interface DepositListResponse {
  items: DepositRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListDepositsParams {
  limit?: number;
  offset?: number;
  nasabah_id?: string;
}

export interface SyncDepositResultItem {
  idempotency_key: string;
  status: "created" | "replayed" | "error";
  deposit?: DepositRecord;
  deposit_id?: string;
  error?: string;
}

export interface BatchSyncResponse {
  results: SyncDepositResultItem[];
}

export interface DepositReceiptLine {
  material_type_id?: string;
  material_name: string;
  weight_grams: number;
  price_per_kg_idr: number;
  subtotal_idr: number;
  estimated_co2e_grams: number;
}

export interface DepositReceipt {
  deposit_id: string;
  receipt_number?: string;
  bank_sampah_name?: string;
  bank_sampah_code?: string;
  nasabah_name: string;
  nasabah_rw?: string;
  nasabah_rt?: string;
  recorded_by_name?: string;
  client_recorded_at: string;
  created_at?: string;
  notes?: string;
  total_weight_grams: number;
  total_amount_idr: number;
  total_estimated_co2e_grams: number;
  methodology_note?: string;
  lines: DepositReceiptLine[];
}

function assertValidDepositPayload(payload: CreateDepositRequest): CreateDepositRequest {
  if (!payload.nasabah_id.trim()) {
    throw new Error("Nasabah wajib dipilih.");
  }
  const key = payload.idempotency_key.trim();
  if (!key || key.length > 64) {
    throw new Error("Idempotency key tidak valid.");
  }
  if (!payload.client_recorded_at.trim()) {
    throw new Error("Waktu pencatatan (client_recorded_at) wajib diisi.");
  }
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new Error("Minimal satu baris jenis sampah wajib diisi.");
  }

  const normalizedLines = payload.lines.map((line, index) => {
    if (!line.material_type_id.trim()) {
      throw new Error(`Jenis sampah pada baris ${index + 1} wajib dipilih.`);
    }
    if (
      !Number.isFinite(line.weight_grams) ||
      !Number.isInteger(line.weight_grams) ||
      line.weight_grams < 1
    ) {
      throw new Error(`Berat pada baris ${index + 1} harus berupa bilangan bulat gram (>= 1 g).`);
    }
    return {
      material_type_id: line.material_type_id,
      weight_grams: line.weight_grams,
    };
  });

  return {
    nasabah_id: payload.nasabah_id,
    idempotency_key: key,
    client_recorded_at: payload.client_recorded_at,
    ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
    lines: normalizedLines,
  };
}

/**
 * Pure integer preview helper for deposit line Rupiah subtotal.
 * Authoritative calculation always happens on the Go backend.
 */
export function calculateLineSubtotalIdr(weightGrams: number, pricePerKgIdr: number): number {
  if (
    !Number.isInteger(weightGrams) ||
    weightGrams <= 0 ||
    !Number.isInteger(pricePerKgIdr) ||
    pricePerKgIdr < 0
  ) {
    return 0;
  }
  return Math.round((weightGrams * pricePerKgIdr) / 1000);
}

/**
 * Pure integer preview helper for estimated avoided CO2e in grams from WARM v16 PPM factor.
 * Authoritative calculation always happens on the Go backend.
 */
export function calculateEstimatedCo2eGrams(weightGrams: number, co2eFactorPpm: number): number {
  if (
    !Number.isInteger(weightGrams) ||
    weightGrams <= 0 ||
    !Number.isInteger(co2eFactorPpm) ||
    co2eFactorPpm <= 0
  ) {
    return 0;
  }
  return Math.round((weightGrams * co2eFactorPpm) / 1_000_000);
}

function normalizeDepositList(raw: unknown): DepositListResponse {
  if (Array.isArray(raw)) {
    return {
      items: raw as DepositRecord[],
      total: raw.length,
      limit: raw.length || 20,
      offset: 0,
    };
  }
  const obj = (raw ?? {}) as Record<string, unknown>;
  const items =
    (Array.isArray(obj.items) ? obj.items : null) ??
    (Array.isArray(obj.data) ? obj.data : null) ??
    (Array.isArray(obj.deposits) ? obj.deposits : []);

  return {
    items: items as DepositRecord[],
    total: typeof obj.total === "number" ? obj.total : items.length,
    limit: typeof obj.limit === "number" ? obj.limit : 20,
    offset: typeof obj.offset === "number" ? obj.offset : 0,
  };
}

function normalizeSyncResponse(raw: unknown): BatchSyncResponse {
  if (Array.isArray(raw)) {
    return { results: raw as SyncDepositResultItem[] };
  }
  const obj = (raw ?? {}) as Record<string, unknown>;
  const results =
    (Array.isArray(obj.results) ? obj.results : null) ??
    (Array.isArray(obj.items) ? obj.items : null) ??
    (Array.isArray(obj.data) ? obj.data : []);
  return { results: results as SyncDepositResultItem[] };
}

function normalizeReceipt(raw: unknown, fallbackId: string): DepositReceipt {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawLines = Array.isArray(obj.lines) ? obj.lines : [];
  const lines: DepositReceiptLine[] = rawLines.map((entry) => {
    const line = (entry ?? {}) as Record<string, unknown>;
    return {
      material_type_id:
        typeof line.material_type_id === "string" ? line.material_type_id : undefined,
      material_name:
        typeof line.material_name === "string" ? line.material_name : "Jenis Sampah",
      weight_grams: typeof line.weight_grams === "number" ? line.weight_grams : 0,
      price_per_kg_idr:
        typeof line.price_per_kg_idr === "number"
          ? line.price_per_kg_idr
          : typeof line.unit_price_per_kg_idr === "number"
            ? line.unit_price_per_kg_idr
            : 0,
      subtotal_idr: typeof line.subtotal_idr === "number" ? line.subtotal_idr : 0,
      estimated_co2e_grams:
        typeof line.estimated_co2e_grams === "number"
          ? line.estimated_co2e_grams
          : typeof line.co2e_grams === "number"
            ? line.co2e_grams
            : 0,
    };
  });

  const computedWeight = lines.reduce((sum, l) => sum + l.weight_grams, 0);
  const computedAmount = lines.reduce((sum, l) => sum + l.subtotal_idr, 0);
  const computedCo2e = lines.reduce((sum, l) => sum + l.estimated_co2e_grams, 0);

  return {
    deposit_id:
      typeof obj.deposit_id === "string"
        ? obj.deposit_id
        : typeof obj.id === "string"
          ? obj.id
          : fallbackId,
    receipt_number: typeof obj.receipt_number === "string" ? obj.receipt_number : undefined,
    bank_sampah_name: typeof obj.bank_sampah_name === "string" ? obj.bank_sampah_name : undefined,
    bank_sampah_code: typeof obj.bank_sampah_code === "string" ? obj.bank_sampah_code : undefined,
    nasabah_name: typeof obj.nasabah_name === "string" ? obj.nasabah_name : "Nasabah",
    nasabah_rw: typeof obj.nasabah_rw === "string" ? obj.nasabah_rw : undefined,
    nasabah_rt: typeof obj.nasabah_rt === "string" ? obj.nasabah_rt : undefined,
    recorded_by_name: typeof obj.recorded_by_name === "string" ? obj.recorded_by_name : undefined,
    client_recorded_at:
      typeof obj.client_recorded_at === "string"
        ? obj.client_recorded_at
        : typeof obj.created_at === "string"
          ? obj.created_at
          : new Date().toISOString(),
    created_at: typeof obj.created_at === "string" ? obj.created_at : undefined,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
    total_weight_grams:
      typeof obj.total_weight_grams === "number" ? obj.total_weight_grams : computedWeight,
    total_amount_idr:
      typeof obj.total_amount_idr === "number" ? obj.total_amount_idr : computedAmount,
    total_estimated_co2e_grams:
      typeof obj.total_estimated_co2e_grams === "number"
        ? obj.total_estimated_co2e_grams
        : typeof obj.estimated_co2e_grams === "number"
          ? obj.estimated_co2e_grams
          : computedCo2e,
    methodology_note: typeof obj.methodology_note === "string" ? obj.methodology_note : undefined,
    lines,
  };
}

/**
 * Pengelola-only QR lookup: identifies a Nasabah without creating a Nasabah login session.
 */
export async function lookupNasabahByQr(qrToken: string): Promise<NasabahItem> {
  const token = qrToken.trim();
  if (!token) {
    throw new Error("Token QR nasabah tidak boleh kosong.");
  }
  const raw = await authFetch<unknown>("/api/v1/nasabah/lookup-qr", {
    method: "POST",
    body: JSON.stringify({ qr_token: token }),
  });
  const obj = (raw ?? {}) as Record<string, unknown>;
  if (obj.nasabah && typeof obj.nasabah === "object") {
    return obj.nasabah as NasabahItem;
  }
  return raw as NasabahItem;
}

/**
 * Records a single deposit with idempotency_key & client_recorded_at.
 */
export async function createDeposit(payload: CreateDepositRequest): Promise<DepositRecord> {
  const safePayload = assertValidDepositPayload(payload);
  return authFetch<DepositRecord>("/api/v1/deposits", {
    method: "POST",
    body: JSON.stringify(safePayload),
  });
}

/**
 * Batch-syncs offline queued deposits via POST /api/v1/deposits/sync.
 */
export async function syncDeposits(deposits: CreateDepositRequest[]): Promise<BatchSyncResponse> {
  if (!Array.isArray(deposits) || deposits.length === 0) {
    return { results: [] };
  }
  const safeDeposits = deposits.map(assertValidDepositPayload);
  const raw = await authFetch<unknown>("/api/v1/deposits/sync", {
    method: "POST",
    body: JSON.stringify({ deposits: safeDeposits }),
  });
  return normalizeSyncResponse(raw);
}

export async function listDeposits(params: ListDepositsParams = {}): Promise<DepositListResponse> {
  const query = new URLSearchParams();
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));
  if (params.nasabah_id?.trim()) query.set("nasabah_id", params.nasabah_id.trim());

  const qs = query.toString();
  const raw = await authFetch<unknown>(`/api/v1/deposits${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  return normalizeDepositList(raw);
}

export async function getDepositDetail(id: string): Promise<DepositRecord> {
  return authFetch<DepositRecord>(`/api/v1/deposits/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export async function getDepositReceipt(id: string): Promise<DepositReceipt> {
  const raw = await authFetch<unknown>(`/api/v1/deposits/${encodeURIComponent(id)}/receipt`, {
    cache: "no-store",
  });
  return normalizeReceipt(raw, id);
}
