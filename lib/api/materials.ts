import { authFetch } from "@/lib/auth/fetch-auth";

export interface MaterialItem {
  id: string;
  name: string;
  category: string;
  unit?: string;
  description?: string;
  emission_factor_id?: string | null;
  price_per_kg_idr: number;
  current_price_per_kg_idr?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialPriceEntry {
  id: string;
  material_type_id?: string;
  price_per_kg_idr: number;
  effective_from?: string;
  created_at?: string;
  created_by?: string;
  changed_by_name?: string;
}

export interface CarbonFactorOption {
  id: string;
  material_code: string;
  name: string;
  category: string;
  co2e_factor_ppm: number;
  factor_version: string;
}

export interface CreateMaterialRequest {
  name: string;
  category: string;
  unit?: string;
  description?: string;
  emission_factor_id?: string;
  price_per_kg_idr: number;
}

export interface UpdateMaterialRequest {
  name: string;
  category: string;
  unit?: string;
  description?: string;
  emission_factor_id?: string;
  is_active: boolean;
}

function toIntegerRupiah(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error("Harga per kg harus berupa bilangan bulat Rupiah (>= 0).");
  }
  return value;
}

function normalizeArray<T>(raw: unknown, keys: string[]): T[] {
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  const obj = (raw ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(obj[key])) {
      return obj[key] as T[];
    }
  }
  return [];
}

export async function listMaterials(): Promise<MaterialItem[]> {
  const raw = await authFetch<unknown>("/api/v1/materials", { cache: "no-store" });
  return normalizeArray<MaterialItem>(raw, ["items", "data", "materials"]);
}

export async function createMaterial(payload: CreateMaterialRequest): Promise<MaterialItem> {
  const safePrice = toIntegerRupiah(payload.price_per_kg_idr);
  return authFetch<MaterialItem>("/api/v1/materials", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      price_per_kg_idr: safePrice,
    }),
  });
}

export async function updateMaterial(
  id: string,
  payload: UpdateMaterialRequest,
): Promise<MaterialItem> {
  return authFetch<MaterialItem>(`/api/v1/materials/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function appendMaterialPrice(
  id: string,
  pricePerKgIdr: number,
): Promise<MaterialPriceEntry> {
  const safePrice = toIntegerRupiah(pricePerKgIdr);
  return authFetch<MaterialPriceEntry>(`/api/v1/materials/${encodeURIComponent(id)}/prices`, {
    method: "POST",
    body: JSON.stringify({ price_per_kg_idr: safePrice }),
  });
}

export async function listMaterialPrices(id: string): Promise<MaterialPriceEntry[]> {
  const raw = await authFetch<unknown>(`/api/v1/materials/${encodeURIComponent(id)}/prices`, {
    cache: "no-store",
  });
  return normalizeArray<MaterialPriceEntry>(raw, ["items", "data", "prices", "history"]);
}

export async function listCarbonFactors(): Promise<CarbonFactorOption[]> {
  const raw = await authFetch<unknown>("/api/v1/carbon/factors", { cache: "no-store" });
  return normalizeArray<CarbonFactorOption>(raw, ["items", "data", "factors"]);
}
