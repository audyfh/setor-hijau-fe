"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";
import { PENGELOLA_NAV } from "@/app/pengelola/page";
import {
  createCarbonReversal,
  getCarbonSummary,
  listCarbonLedger,
  type CarbonLedgerEntry,
  type CarbonSummary,
} from "@/lib/api/carbon";
import {
  downloadMonthlyCsv,
  downloadMonthlyPdf,
  getMonthlyDashboard,
  triggerBrowserDownload,
  type MonthlyDashboardData,
} from "@/lib/api/reports";
import {
  formatEstimatedCO2eGrams,
  formatEstimatedCO2eMicrograms,
  formatRupiah,
  formatWeightGrams,
} from "@/lib/format/units";

function currentMonthInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatDateTimeId(iso?: string): string {
  if (!iso) {
    return "-";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ReportsAndCarbonContent() {
  const [month, setMonth] = useState(currentMonthInput);
  const [dashboard, setDashboard] = useState<MonthlyDashboardData | null>(null);
  const [carbonSummary, setCarbonSummary] = useState<CarbonSummary | null>(null);
  const [ledger, setLedger] = useState<CarbonLedgerEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<"csv" | "pdf" | null>(null);
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reversal state
  const [reversalTarget, setReversalTarget] = useState<CarbonLedgerEntry | null>(null);
  const [reversalNotes, setReversalNotes] = useState("");

  const loadData = useCallback(async (targetMonth: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [dashRes, sumRes, ledgerRes] = await Promise.all([
        getMonthlyDashboard(targetMonth),
        getCarbonSummary(),
        listCarbonLedger(50),
      ]);
      setDashboard(dashRes);
      setCarbonSummary(sumRes);
      setLedger(ledgerRes);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat dashboard bulanan dan Carbon Ledger.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [dashRes, sumRes, ledgerRes] = await Promise.all([
          getMonthlyDashboard(month),
          getCarbonSummary(),
          listCarbonLedger(50),
        ]);
        if (!active) {
          return;
        }
        setDashboard(dashRes);
        setCarbonSummary(sumRes);
        setLedger(ledgerRes);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat dashboard bulanan dan Carbon Ledger.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [month]);

  function handleMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    setIsLoading(true);
    setErrorMessage(null);
  }

  async function handleExport(kind: "csv" | "pdf") {
    setErrorMessage(null);
    setFeedback(null);
    setIsDownloading(kind);
    try {
      const result =
        kind === "csv" ? await downloadMonthlyCsv(month) : await downloadMonthlyPdf(month);
      triggerBrowserDownload(result.blob, result.filename);
      setFeedback(`Berkas ${result.filename} berhasil diunduh.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : `Gagal mengunduh laporan ${kind.toUpperCase()}.`,
      );
    } finally {
      setIsDownloading(null);
    }
  }

  async function handleRecordReversal(event: FormEvent) {
    event.preventDefault();
    if (!reversalTarget) {
      return;
    }
    setErrorMessage(null);
    setFeedback(null);
    setIsSubmittingReversal(true);
    try {
      await createCarbonReversal({
        carbon_ledger_id: reversalTarget.id,
        notes: reversalNotes,
      });
      setFeedback("Entri koreksi (reversal) berhasil ditambahkan ke Carbon Ledger.");
      setReversalTarget(null);
      setReversalNotes("");
      await loadData(month);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mencatat koreksi Carbon Ledger.",
      );
    } finally {
      setIsSubmittingReversal(false);
    }
  }

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola" navItems={PENGELOLA_NAV}>
      <div className="space-y-[var(--space-xl)]">
        <header className="stock flex flex-wrap items-center justify-between gap-[var(--space-md)] p-[var(--space-xl)]">
          <div className="space-y-[var(--space-xs)]">
            <h1>Dashboard Bulanan, Laporan & Carbon Ledger</h1>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Pantau metrik bulanan, unduh laporan CSV/PDF, dan audit Carbon Ledger (Estimasi US EPA WARM v16).
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-[var(--space-sm)]">
            <label className="block space-y-1">
              <span className="text-[var(--text-xs)] text-[var(--color-muted)]">Bulan Laporan</span>
              <input
                type="month"
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              disabled={isDownloading !== null}
              className="btn btn--card"
            >
              {isDownloading === "csv" ? "Mengunduh CSV..." : "Unduh CSV"}
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              disabled={isDownloading !== null}
              className="btn btn--ink"
            >
              {isDownloading === "pdf" ? "Mengunduh PDF..." : "Unduh PDF"}
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="stock border-[var(--color-danger)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-danger)]"
          >
            {errorMessage}
          </div>
        ) : null}

        {feedback ? (
          <div
            role="status"
            className="stock border-[var(--color-accent-2)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-accent-2)]"
          >
            {feedback}
          </div>
        ) : null}

        <section className="space-y-[var(--space-md)]">
          <div className="flex items-baseline justify-between gap-4">
            <h2>Ringkasan Bulanan ({month})</h2>
            {isLoading ? (
              <span className="text-[var(--text-xs)] text-[var(--color-muted)]">Memuat...</span>
            ) : null}
          </div>

          <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-4">
            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
                Setoran & Berat Sampah
              </p>
              <p className="num text-[var(--text-xl)] font-semibold">
                {dashboard ? formatWeightGrams(dashboard.total_weight_grams) : "—"}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
                {dashboard
                  ? `${dashboard.total_deposits_count} transaksi · ${dashboard.active_nasabah_count} nasabah aktif`
                  : "Menunggu data"}
              </p>
            </article>

            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
                Nilai Setoran Nasabah
              </p>
              <p className="num text-[var(--text-xl)] font-semibold">
                {dashboard ? formatRupiah(dashboard.total_deposit_value_idr) : "—"}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
                Penarikan: {dashboard ? formatRupiah(dashboard.total_withdrawals_idr) : "—"}
              </p>
            </article>

            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
                Penjualan Pengepul
              </p>
              <p className="num text-[var(--text-xl)] font-semibold text-[var(--color-accent-2)]">
                {dashboard ? formatRupiah(dashboard.total_sales_idr) : "—"}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
                Arus kas bersih: {dashboard ? formatRupiah(dashboard.net_cash_flow_idr) : "—"}
              </p>
            </article>

            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
                Estimasi Emisi Dihindari
              </p>
              <p className="num text-[var(--text-xl)] font-semibold text-[var(--color-accent-2)]">
                {dashboard ? formatEstimatedCO2eGrams(dashboard.estimated_co2e_avoided_grams) : "—"}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
                Estimasi jejak digital:{" "}
                {dashboard
                  ? formatEstimatedCO2eMicrograms(dashboard.estimated_digital_co2e_micrograms)
                  : "—"}
              </p>
            </article>
          </div>
          <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
            Catatan: Seluruh angka karbon merupakan <strong>Estimasi</strong> berdasarkan faktor US EPA WARM v16 dan
            SWDM v4, bukan pengukuran sensor fisik.
          </p>
        </section>

        <section className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)]">
            <div className="space-y-[var(--space-xs)]">
              <h2>Estimasi Carbon Ledger (Append-Only)</h2>
              <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                Total Estimasi Terhindarkan Tenant:{" "}
                <strong className="num text-[var(--color-accent-2)]">
                  {carbonSummary
                    ? formatEstimatedCO2eGrams(carbonSummary.total_estimated_co2e_grams)
                    : "—"}
                </strong>{" "}
                ({carbonSummary?.total_entries ?? ledger.length} entri · {carbonSummary?.methodology ?? "US EPA WARM v16"})
              </p>
            </div>
          </div>

          {reversalTarget ? (
            <form
              onSubmit={handleRecordReversal}
              className="rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-paper-2)] p-[var(--space-lg)] space-y-[var(--space-md)]"
            >
              <div className="flex items-center justify-between gap-4">
                <h3>Catat Entri Koreksi (Reversal)</h3>
                <button
                  type="button"
                  onClick={() => {
                    setReversalTarget(null);
                    setReversalNotes("");
                  }}
                  className="btn btn--card"
                >
                  Batal
                </button>
              </div>
              <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
                Entri asli tidak dihapus. Sistem akan menambahkan entri pembalik untuk ID{" "}
                <code className="font-mono">{reversalTarget.id}</code> (
                {reversalTarget.material_name || "Material"} ·{" "}
                {formatEstimatedCO2eGrams(reversalTarget.estimated_co2e_grams)}).
              </p>
              <label className="block space-y-[var(--space-xs)]">
                <span className="text-[var(--text-sm)] font-medium">Alasan Koreksi (3–500 karakter)</span>
                <textarea
                  required
                  minLength={3}
                  maxLength={500}
                  rows={2}
                  value={reversalNotes}
                  onChange={(e) => setReversalNotes(e.target.value)}
                  placeholder="cth: Koreksi salah input berat penimbangan pada setoran awal"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                />
              </label>
              <div className="flex justify-end">
                <button type="submit" disabled={isSubmittingReversal} className="btn btn--ink">
                  {isSubmittingReversal ? "Menyimpan..." : "Simpan Entri Koreksi"}
                </button>
              </div>
            </form>
          ) : null}

          {ledger.length === 0 ? (
            <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
              Belum ada entri Carbon Ledger.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                <thead>
                  <tr className="border-b border-[var(--color-rule)] text-[var(--color-muted)]">
                    <th className="py-2 pr-4">Waktu</th>
                    <th className="py-2 pr-4">Jenis</th>
                    <th className="py-2 pr-4">Material</th>
                    <th className="py-2 pr-4">Berat</th>
                    <th className="py-2 pr-4">Estimasi CO₂e</th>
                    <th className="py-2 pr-4">Catatan</th>
                    <th className="py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => {
                    const isReversal = entry.entry_type.toLowerCase().includes("reversal");
                    return (
                      <tr key={entry.id} className="border-b border-[var(--color-rule)]/60">
                        <td className="py-2.5 pr-4">{formatDateTimeId(entry.created_at)}</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={
                              isReversal
                                ? "font-medium text-[var(--color-danger)]"
                                : "font-medium text-[var(--color-accent-2)]"
                            }
                          >
                            {entry.entry_type}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">{entry.material_name || "—"}</td>
                        <td className="num py-2.5 pr-4">{formatWeightGrams(entry.weight_grams)}</td>
                        <td className="num py-2.5 pr-4 font-semibold">
                          {formatEstimatedCO2eGrams(entry.estimated_co2e_grams)}
                        </td>
                        <td className="py-2.5 pr-4">{entry.notes || entry.factor_source || "—"}</td>
                        <td className="py-2.5">
                          {!isReversal ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReversalTarget(entry);
                                setReversalNotes("");
                              }}
                              className="text-[var(--text-xs)] font-medium text-[var(--color-accent-2)] underline"
                            >
                              Koreksi
                            </button>
                          ) : (
                            <span className="text-[var(--text-xs)] text-[var(--color-muted)]">
                              Pembalik
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}

export default function PengelolaReportsPage() {
  return (
    <RoleGuard allowedRole="pengelola">
      <ReportsAndCarbonContent />
    </RoleGuard>
  );
}
