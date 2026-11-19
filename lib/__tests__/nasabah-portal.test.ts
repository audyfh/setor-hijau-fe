import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMyBalance,
  getMyCarbon,
  getMyNasabahProfile,
  listMyWithdrawals,
  updateMyPin,
} from "@/lib/api/nasabah-portal";
import { setStoredSession } from "@/lib/auth/session";

function stubNasabahSession() {
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
    accessToken: "nasabah-token",
    refreshToken: "nasabah-refresh",
    user: {
      id: "n-user-1",
      username: "warga01",
      full_name: "Siti Aminah",
      role: "nasabah",
      bank_sampah_id: "t1",
    },
    tenant: null,
  });
}

describe("lib/api/nasabah-portal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches own profile, derived Rupiah balance, estimated carbon, and withdrawals", async () => {
    stubNasabahSession();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "n1",
            username: "warga01",
            full_name: "Siti Aminah",
            rw: "03",
            rt: "01",
            qr_token: "QR-123",
            is_active: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            balance_idr: 75000,
            total_deposits_idr: 100000,
            total_withdrawals_idr: 25000,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            estimated_co2e_grams: 14500,
            methodology: "US EPA WARM v16",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "wd-1",
                nasabah_id: "n1",
                amount_idr: 25000,
                notes: "Tarik tunai",
                created_at: "2026-11-18T10:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const profile = await getMyNasabahProfile();
    expect(profile.username).toBe("warga01");
    expect(profile.qr_token).toBe("QR-123");

    const bal = await getMyBalance();
    expect(bal.balance_idr).toBe(75000);
    expect(bal.total_deposits_idr).toBe(100000);

    const carbon = await getMyCarbon();
    expect(carbon.estimated_co2e_grams).toBe(14500);
    expect(carbon.methodology).toBe("US EPA WARM v16");

    const withdrawals = await listMyWithdrawals();
    expect(withdrawals).toHaveLength(1);
    expect(withdrawals[0].amount_idr).toBe(25000);
  });

  it("enforces strict 6-digit PIN format before sending PUT /api/v1/nasabah/me/pin", async () => {
    stubNasabahSession();

    await expect(updateMyPin("12345")).rejects.toThrow(/6 digit/);
    await expect(updateMyPin("12345a")).rejects.toThrow(/6 digit/);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "PIN updated" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await updateMyPin("123456");
    expect(res.message).toBe("PIN updated");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/nasabah\/me\/pin$/);
  });
});
