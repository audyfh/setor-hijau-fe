import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateSaleLineSubtotalIdr,
  createCashbookEntry,
  createSale,
  createWithdrawal,
  getCashbookReconciliation,
  getCashbookSummary,
} from "@/lib/api/cashbook";
import {
  createCarbonReversal,
  getCarbonSummary,
  listCarbonLedger,
} from "@/lib/api/carbon";
import {
  downloadMonthlyCsv,
  downloadMonthlyPdf,
  getMonthlyDashboard,
} from "@/lib/api/reports";
import { setStoredSession } from "@/lib/auth/session";

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

describe("M5 cashbook, reports & carbon API clients", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calculates integer sale line subtotals accurately", () => {
    expect(calculateSaleLineSubtotalIdr(1500, 4000)).toBe(6000);
    expect(calculateSaleLineSubtotalIdr(250, 3000)).toBe(750);
    expect(calculateSaleLineSubtotalIdr(0, 3000)).toBe(0);
    expect(calculateSaleLineSubtotalIdr(100.5, 3000)).toBe(0);
  });

  it("rejects non-integer weights and Rupiah amounts in cashbook payloads", async () => {
    stubAuthSession();

    await expect(
      createSale({
        buyer_name: "Pengepul Jaya",
        sale_date: "2026-11-19T12:00:00Z",
        lines: [{ material_type_id: "m1", weight_grams: 12.5, price_per_kg_idr: 3000 }],
      }),
    ).rejects.toThrow(/bilangan bulat/i);

    await expect(
      createWithdrawal("n1", { amount_idr: 1500.25 }),
    ).rejects.toThrow(/bilangan bulat/i);

    await expect(
      createCashbookEntry({
        entry_type: "cash_out",
        category: "operasional",
        amount_idr: 0,
        description: "Test",
      }),
    ).rejects.toThrow(/bilangan bulat/i);
  });

  it("normalizes cashbook summary and reconciliation responses", async () => {
    stubAuthSession();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total_cash_in_idr: 500000,
            total_cash_out_idr: 120000,
            net_cash_balance_idr: 380000,
            total_sales_idr: 500000,
            total_withdrawals_idr: 100000,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cashbook_balance_idr: 380000,
            total_nasabah_balance_idr: 380000,
            total_deposits_value_idr: 480000,
            total_withdrawals_idr: 100000,
            total_sales_idr: 500000,
            discrepancy_idr: 0,
            is_reconciled: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const summary = await getCashbookSummary();
    expect(summary.net_cash_balance_idr).toBe(380000);
    expect(summary.total_sales_idr).toBe(500000);

    const recon = await getCashbookReconciliation();
    expect(recon.is_reconciled).toBe(true);
    expect(recon.discrepancy_idr).toBe(0);
  });

  it("validates month format and fetches monthly dashboard metrics", async () => {
    stubAuthSession();

    await expect(getMonthlyDashboard("2026-13")).rejects.toThrow(/YYYY-MM/);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          month: "2026-11",
          total_deposits_count: 18,
          active_nasabah_count: 12,
          total_weight_grams: 45200,
          total_deposit_value_idr: 185000,
          total_sales_idr: 210000,
          total_withdrawals_idr: 50000,
          estimated_co2e_avoided_grams: 64320,
          estimated_digital_co2e_micrograms: 12500,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const dash = await getMonthlyDashboard("2026-11");
    expect(dash.month).toBe("2026-11");
    expect(dash.total_weight_grams).toBe(45200);
    expect(dash.net_cash_flow_idr).toBe(160000);
    expect(dash.estimated_co2e_avoided_grams).toBe(64320);
  });

  it("downloads CSV and PDF blobs with auth header and 401 refresh rotation", async () => {
    stubAuthSession();
    const fetchMock = vi
      .fn()
      // First CSV attempt returns 401
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "expired" }), { status: 401 }))
      // Refresh token succeeds
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "fresh-access",
            refresh_token: "fresh-refresh",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      // Retried CSV download succeeds
      .mockResolvedValueOnce(
        new Response("\uFEFFmonth,total\n2026-11,1000", {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="setor-hijau-2026-11.csv"',
          },
        }),
      )
      // PDF download succeeds
      .mockResolvedValueOnce(
        new Response("%PDF-1.4", {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const csv = await downloadMonthlyCsv("2026-11");
    expect(csv.filename).toBe("setor-hijau-2026-11.csv");
    expect(csv.blob.size).toBeGreaterThan(0);

    const pdf = await downloadMonthlyPdf("2026-11");
    expect(pdf.filename).toBe("laporan-setor-hijau-2026-11.pdf");
    expect(pdf.blob.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("fetches carbon ledger, summary, and validates reversal notes", async () => {
    stubAuthSession();

    await expect(
      createCarbonReversal({ carbon_ledger_id: "cl-1", notes: "ab" }),
    ).rejects.toThrow(/3–500 karakter/);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "cl-1",
                entry_type: "credit",
                material_name: "Botol PET",
                weight_grams: 2000,
                estimated_co2e_grams: 2100,
                created_at: "2026-11-19T08:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total_estimated_co2e_grams: 2100,
            total_entries: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "cl-2",
            entry_type: "reversal",
            weight_grams: 2000,
            estimated_co2e_grams: -2100,
            reversed_entry_id: "cl-1",
            notes: "Koreksi berat timbangan",
            created_at: "2026-11-19T09:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const ledger = await listCarbonLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0].estimated_co2e_grams).toBe(2100);

    const summary = await getCarbonSummary();
    expect(summary.total_estimated_co2e_grams).toBe(2100);

    const rev = await createCarbonReversal({
      carbon_ledger_id: "cl-1",
      notes: "Koreksi berat timbangan",
    });
    expect(rev.entry_type).toBe("reversal");
    expect(rev.estimated_co2e_grams).toBe(-2100);
  });
});
