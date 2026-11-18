import { authFetch } from "@/lib/auth/fetch-auth";

export interface NasabahItem {
  id: string;
  user_id?: string;
  bank_sampah_id?: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  rw: string;
  rt?: string;
  address_notes?: string;
  qr_token?: string;
  is_active: boolean;
  created_at?: string;
}

export interface NasabahListResponse {
  items: NasabahItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListNasabahParams {
  search?: string;
  rw?: string;
  rt?: string;
  limit?: number;
  offset?: number;
}

export interface CreateNasabahRequest {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  phone?: string;
  rw: string;
  rt?: string;
  address_notes?: string;
  pin?: string;
}

export interface UpdateNasabahRequest {
  full_name: string;
  email?: string;
  phone?: string;
  rw: string;
  rt?: string;
  address_notes?: string;
  is_active?: boolean;
}

function normalizeNasabahList(raw: unknown): NasabahListResponse {
  if (Array.isArray(raw)) {
    return {
      items: raw as NasabahItem[],
      total: raw.length,
      limit: raw.length || 20,
      offset: 0,
    };
  }
  const obj = (raw ?? {}) as Record<string, unknown>;
  const items =
    (Array.isArray(obj.items) ? obj.items : null) ??
    (Array.isArray(obj.data) ? obj.data : null) ??
    (Array.isArray(obj.nasabah) ? obj.nasabah : []);

  return {
    items: items as NasabahItem[],
    total: typeof obj.total === "number" ? obj.total : items.length,
    limit: typeof obj.limit === "number" ? obj.limit : 20,
    offset: typeof obj.offset === "number" ? obj.offset : 0,
  };
}

export async function listNasabah(params: ListNasabahParams = {}): Promise<NasabahListResponse> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.rw?.trim()) query.set("rw", params.rw.trim());
  if (params.rt?.trim()) query.set("rt", params.rt.trim());
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));

  const qs = query.toString();
  const raw = await authFetch<unknown>(`/api/v1/nasabah${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  return normalizeNasabahList(raw);
}

export async function createNasabah(payload: CreateNasabahRequest): Promise<NasabahItem> {
  return authFetch<NasabahItem>("/api/v1/nasabah", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getNasabahDetail(id: string): Promise<NasabahItem> {
  return authFetch<NasabahItem>(`/api/v1/nasabah/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export async function updateNasabah(
  id: string,
  payload: UpdateNasabahRequest,
): Promise<NasabahItem> {
  return authFetch<NasabahItem>(`/api/v1/nasabah/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function regenerateNasabahQr(
  id: string,
): Promise<{ qr_token: string; nasabah?: NasabahItem }> {
  return authFetch<{ qr_token: string; nasabah?: NasabahItem }>(
    `/api/v1/nasabah/${encodeURIComponent(id)}/regenerate-qr`,
    { method: "POST" },
  );
}

export async function resetNasabahPassword(
  id: string,
  newPassword: string,
): Promise<{ message?: string }> {
  return authFetch<{ message?: string }>(
    `/api/v1/nasabah/${encodeURIComponent(id)}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    },
  );
}

export async function resetNasabahPin(id: string, pin: string): Promise<{ message?: string }> {
  return authFetch<{ message?: string }>(`/api/v1/nasabah/${encodeURIComponent(id)}/reset-pin`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}
