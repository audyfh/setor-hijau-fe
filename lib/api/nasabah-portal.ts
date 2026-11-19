import { authFetch } from "@/lib/auth/fetch-auth";
import type { WithdrawalRecord } from "@/lib/api/cashbook";
import type { NasabahItem } from "@/lib/api/nasabah";

export interface MyBalanceSummary {
  balance_idr: number;
  total_deposits_idr: number;
  total_withdrawals_idr: number;
}

export interface MyCarbonSummary {
  estimated_co2e_grams: number;
  methodology: string;
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

export async function getMyNasabahProfile(): Promise<NasabahItem> {
  return authFetch<NasabahItem>("/api/v1/nasabah/me", {
    cache: "no-store",
  });
}

export async function getMyBalance(): Promise<MyBalanceSummary> {
  const raw = await authFetch<Record<string, unknown>>("/api/v1/nasabah/me/balance", {
    cache: "no-store",
  });
  return {
    balance_idr: readInt(raw, "balance_idr", "current_balance_idr", "available_balance_idr"),
    total_deposits_idr: readInt(raw, "total_deposits_idr", "total_deposit_idr"),
    total_withdrawals_idr: readInt(raw, "total_withdrawals_idr", "total_withdrawal_idr"),
  };
}

export async function getMyCarbon(): Promise<MyCarbonSummary> {
  const raw = await authFetch<Record<string, unknown>>("/api/v1/nasabah/me/carbon", {
    cache: "no-store",
  });
  return {
    estimated_co2e_grams: readInt(
      raw,
      "estimated_co2e_grams",
      "total_estimated_co2e_grams",
      "co2e_grams",
      "balance_co2e_grams",
    ),
    methodology: typeof raw.methodology === "string" ? raw.methodology : "US EPA WARM v16",
  };
}

export async function listMyWithdrawals(): Promise<WithdrawalRecord[]> {
  const raw = await authFetch<unknown>("/api/v1/nasabah/me/withdrawals", {
    cache: "no-store",
  });
  if (Array.isArray(raw)) {
    return raw as WithdrawalRecord[];
  }
  const obj = (raw ?? {}) as Record<string, unknown>;
  const list = obj.items ?? obj.withdrawals ?? obj.data ?? [];
  return Array.isArray(list) ? (list as WithdrawalRecord[]) : [];
}

export async function updateMyPin(pin: string): Promise<{ message?: string }> {
  const normalized = pin.trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("PIN harus terdiri dari tepat 6 digit angka.");
  }
  return authFetch<{ message?: string }>("/api/v1/nasabah/me/pin", {
    method: "PUT",
    body: JSON.stringify({ pin: normalized }),
  });
}
