import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateEstimatedCo2eGrams,
  calculateLineSubtotalIdr,
  createDeposit,
  getDepositReceipt,
  lookupNasabahByQr,
  syncDeposits,
} from "@/lib/api/deposits";
import { setStoredSession } from "@/lib/auth/session";
import type { QueuedDeposit } from "@/lib/offline/db";
import {
  flushDepositOutbox,
  generateIdempotencyKey,
  toCreateDepositRequest,
} from "@/lib/offline/sync";

function stubAuthSession() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
  });
  setStoredSession({
    accessToken: "test-token",
    refreshToken: "test-refresh",
    user: {
      id: "u1",
      username: "admin",
      full_name: "Admin",
      role: "pengelola",
      bank_sampah_id: "t1",
    },
    tenant: null,
  });
}

describe("lib/api/deposits & lib/offline/sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("computes integer Rupiah subtotal and estimated CO2e grams previews", () => {
    expect(calculateLineSubtotalIdr(1500, 4000)).toBe(6000);
    expect(calculateLineSubtotalIdr(250, 3500)).toBe(875);
    expect(calculateLineSubtotalIdr(1.5, 4000)).toBe(0);

    // 2000 g * 2,890,000 ppm / 1,000,000 = 5,780 g CO2e
    expect(calculateEstimatedCo2eGrams(2000, 2_890_000)).toBe(5780);
    expect(calculateEstimatedCo2eGrams(0, 2_890_000)).toBe(0);
  });

  it("rejects non-integer or non-positive weight_grams before hitting API", async () => {
    stubAuthSession();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createDeposit({
        nasabah_id: "n1",
        idempotency_key: "key-1",
        client_recorded_at: "2026-11-19T09:00:00Z",
        lines: [{ material_type_id: "m1", weight_grams: 1.5 }],
      }),
    ).rejects.toThrow(/bilangan bulat gram/i);

    await expect(
      createDeposit({
        nasabah_id: "n1",
        idempotency_key: "key-1",
        client_recorded_at: "2026-11-19T09:00:00Z",
        lines: [{ material_type_id: "m1", weight_grams: 0 }],
      }),
    ).rejects.toThrow(/bilangan bulat gram/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lookupNasabahByQr, createDeposit, syncDeposits, and getDepositReceipt hit expected endpoints", async () => {
    stubAuthSession();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "n1", full_name: "Siti Aminah", rw: "05" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "dep-1",
            nasabah_id: "n1",
            idempotency_key: "key-123",
            client_recorded_at: "2026-11-19T09:00:00Z",
            total_weight_grams: 2000,
            total_amount_idr: 8000,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ idempotency_key: "key-123", status: "replayed", deposit_id: "dep-1" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            deposit_id: "dep-1",
            nasabah_name: "Siti Aminah",
            client_recorded_at: "2026-11-19T09:00:00Z",
            lines: [
              {
                material_name: "Botol PET",
                weight_grams: 2000,
                price_per_kg_idr: 4000,
                subtotal_idr: 8000,
                estimated_co2e_grams: 5780,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const nasabah = await lookupNasabahByQr("qr-token-abc");
    expect(nasabah.id).toBe("n1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://prod-setor-hijau.cloud.run/api/v1/nasabah/lookup-qr",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ qr_token: "qr-token-abc" }),
      }),
    );

    const dep = await createDeposit({
      nasabah_id: "n1",
      idempotency_key: "key-123",
      client_recorded_at: "2026-11-19T09:00:00Z",
      lines: [{ material_type_id: "m1", weight_grams: 2000 }],
    });
    expect(dep.id).toBe("dep-1");

    const syncRes = await syncDeposits([
      {
        nasabah_id: "n1",
        idempotency_key: "key-123",
        client_recorded_at: "2026-11-19T09:00:00Z",
        lines: [{ material_type_id: "m1", weight_grams: 2000 }],
      },
    ]);
    expect(syncRes.results[0]?.status).toBe("replayed");

    const receipt = await getDepositReceipt("dep-1");
    expect(receipt.total_weight_grams).toBe(2000);
    expect(receipt.total_amount_idr).toBe(8000);
    expect(receipt.total_estimated_co2e_grams).toBe(5780);
  });

  it("generates valid UUIDv4 idempotency keys and strips UI-only fields in sync payloads", () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const payload = toCreateDepositRequest({
      idempotency_key: key,
      client_recorded_at: "2026-11-19T09:00:00Z",
      nasabah_id: "n1",
      nasabah_name: "Siti Aminah",
      notes: "Bersih",
      lines: [
        {
          material_type_id: "m1",
          material_name: "Botol PET",
          weight_grams: 1500,
          price_per_kg_idr: 4000,
          co2e_factor_ppm: 2_890_000,
        },
      ],
      total_weight_grams: 1500,
      estimated_amount_idr: 6000,
      estimated_co2e_grams: 4335,
      status: "pending",
      created_at: "2026-11-19T09:00:00Z",
    });

    expect(payload).toEqual({
      nasabah_id: "n1",
      idempotency_key: key,
      client_recorded_at: "2026-11-19T09:00:00Z",
      notes: "Bersih",
      lines: [{ material_type_id: "m1", weight_grams: 1500 }],
    });
  });

  it("flushDepositOutbox reconciles created, replayed, and error outcomes cleanly", async () => {
    const outboxMap = new Map<string, QueuedDeposit>([
      [
        "k1",
        {
          idempotency_key: "k1",
          client_recorded_at: "2026-11-19T09:00:00Z",
          nasabah_id: "n1",
          nasabah_name: "Siti",
          lines: [{ material_type_id: "m1", weight_grams: 1000 }],
          total_weight_grams: 1000,
          estimated_amount_idr: 4000,
          estimated_co2e_grams: 2890,
          status: "pending",
          created_at: "2026-11-19T09:00:00Z",
        },
      ],
      [
        "k2",
        {
          idempotency_key: "k2",
          client_recorded_at: "2026-11-19T09:05:00Z",
          nasabah_id: "n2",
          nasabah_name: "Budi",
          lines: [{ material_type_id: "m1", weight_grams: 2000 }],
          total_weight_grams: 2000,
          estimated_amount_idr: 8000,
          estimated_co2e_grams: 5780,
          status: "pending",
          created_at: "2026-11-19T09:05:00Z",
        },
      ],
      [
        "k3",
        {
          idempotency_key: "k3",
          client_recorded_at: "2026-11-19T09:10:00Z",
          nasabah_id: "n3",
          nasabah_name: "Tono",
          lines: [{ material_type_id: "m-invalid", weight_grams: 500 }],
          total_weight_grams: 500,
          estimated_amount_idr: 0,
          estimated_co2e_grams: 0,
          status: "pending",
          created_at: "2026-11-19T09:10:00Z",
        },
      ],
    ]);

    const summary = await flushDepositOutbox({
      listOutbox: async () => Array.from(outboxMap.values()),
      syncFn: async () => ({
        results: [
          { idempotency_key: "k1", status: "created", deposit_id: "dep-1" },
          { idempotency_key: "k2", status: "replayed", deposit_id: "dep-2" },
          { idempotency_key: "k3", status: "error", error: "Material tidak ditemukan" },
        ],
      }),
      updateStatus: async (key, status, errorMessage) => {
        const existing = outboxMap.get(key);
        if (existing) {
          outboxMap.set(key, { ...existing, status, error_message: errorMessage });
        }
      },
      removeItem: async (key) => {
        outboxMap.delete(key);
      },
    });

    expect(summary).toEqual({
      total: 3,
      createdCount: 1,
      replayedCount: 1,
      errorCount: 1,
      syncedDepositIds: ["dep-1", "dep-2"],
    });
    expect(outboxMap.has("k1")).toBe(false);
    expect(outboxMap.has("k2")).toBe(false);
    expect(outboxMap.get("k3")?.status).toBe("error");
    expect(outboxMap.get("k3")?.error_message).toBe("Material tidak ditemukan");
  });
});
