import { authFetch } from "@/lib/auth/fetch-auth";

export interface CarbonLedgerEntry {
  id: string;
  deposit_id?: string;
  nasabah_id?: string;
  nasabah_name?: string;
  material_name?: string;
  entry_type: string;
  weight_grams: number;
  estimated_co2e_grams: number;
  factor_source?: string;
  notes?: string;
  reversed_entry_id?: string;
  created_at: string;
}

export interface CarbonSummary {
  total_estimated_co2e_grams: number;
  total_entries: number;
  methodology?: string;
}

export interface CreateCarbonReversalRequest {
  carbon_ledger_id: string;
  notes: string;
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

export async function listCarbonLedger(limit = 50): Promise<CarbonLedgerEntry[]> {
  const raw = await authFetch<unknown>(`/api/v1/carbon/ledger?limit=${limit}`, {
    cache: "no-store",
  });
  const list = Array.isArray(raw)
    ? raw
    : ((raw as Record<string, unknown>)?.items ??
        (raw as Record<string, unknown>)?.entries ??
        (raw as Record<string, unknown>)?.data ??
        []);
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((item) => {
    const obj = item as Record<string, unknown>;
    return {
      id: String(obj.id ?? ""),
      deposit_id: typeof obj.deposit_id === "string" ? obj.deposit_id : undefined,
      nasabah_id: typeof obj.nasabah_id === "string" ? obj.nasabah_id : undefined,
      nasabah_name: typeof obj.nasabah_name === "string" ? obj.nasabah_name : undefined,
      material_name: typeof obj.material_name === "string" ? obj.material_name : undefined,
      entry_type: typeof obj.entry_type === "string" ? obj.entry_type : "credit",
      weight_grams: readInt(obj, "weight_grams"),
      estimated_co2e_grams: readInt(
        obj,
        "estimated_co2e_grams",
        "co2e_grams",
        "delta_co2e_grams",
      ),
      factor_source: typeof obj.factor_source === "string" ? obj.factor_source : "US EPA WARM v16",
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
      reversed_entry_id:
        typeof obj.reversed_entry_id === "string" ? obj.reversed_entry_id : undefined,
      created_at: typeof obj.created_at === "string" ? obj.created_at : "",
    };
  });
}

export async function getCarbonSummary(): Promise<CarbonSummary> {
  const raw = await authFetch<Record<string, unknown>>("/api/v1/carbon/summary", {
    cache: "no-store",
  });
  return {
    total_estimated_co2e_grams: readInt(
      raw,
      "total_estimated_co2e_grams",
      "estimated_co2e_grams",
      "total_co2e_grams",
    ),
    total_entries: readInt(raw, "total_entries", "entries_count"),
    methodology: typeof raw.methodology === "string" ? raw.methodology : "US EPA WARM v16",
  };
}

export async function createCarbonReversal(
  payload: CreateCarbonReversalRequest,
): Promise<CarbonLedgerEntry> {
  const trimmedNotes = payload.notes.trim();
  if (trimmedNotes.length < 3 || trimmedNotes.length > 500) {
    throw new Error("Catatan koreksi (reversal) harus 3–500 karakter.");
  }
  if (!payload.carbon_ledger_id.trim()) {
    throw new Error("ID entri Carbon Ledger wajib dipilih.");
  }

  return authFetch<CarbonLedgerEntry>("/api/v1/carbon/reversals", {
    method: "POST",
    body: JSON.stringify({
      carbon_ledger_id: payload.carbon_ledger_id.trim(),
      notes: trimmedNotes,
    }),
  });
}
