"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";
import { PENGELOLA_NAV } from "@/app/pengelola/page";
import {
  calculateSaleLineSubtotalIdr,
  createCashbookEntry,
  createSale,
  createWithdrawal,
  getCashbookReconciliation,
  getCashbookSummary,
  getNasabahBalance,
  getSaleDetail,
  listCashbookEntries,
  listNasabahWithdrawals,
  listSales,
  type CashbookEntryRecord,
  type CashbookEntryType,
  type CashbookReconciliation,
  type CashbookSummary,
  type NasabahBalanceResponse,
  type SaleRecord,
  type WithdrawalRecord,
} from "@/lib/api/cashbook";
import { listMaterials, type MaterialItem } from "@/lib/api/materials";
import { listNasabah, type NasabahItem } from "@/lib/api/nasabah";
import { formatRupiah, formatWeightGrams } from "@/lib/format/units";

type CashbookTab = "sales" | "withdrawals" | "entries" | "reconciliation";

interface SaleDraftLine {
  key: string;
  material_type_id: string;
  weight_grams_input: string;
  price_per_kg_input: string;
}

function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

function parseNonNegativeInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
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

function todayDateInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CashbookContent() {
  const [activeTab, setActiveTab] = useState<CashbookTab>("sales");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [summary, setSummary] = useState<CashbookSummary | null>(null);
  const [reconciliation, setReconciliation] = useState<CashbookReconciliation | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [entries, setEntries] = useState<CashbookEntryRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [nasabahList, setNasabahList] = useState<NasabahItem[]>([]);

  // Sale form state
  const [buyerName, setBuyerName] = useState("");
  const [saleDate, setSaleDate] = useState(todayDateInput);
  const [saleNotes, setSaleNotes] = useState("");
  const [saleLines, setSaleLines] = useState<SaleDraftLine[]>([
    { key: "line-1", material_type_id: "", weight_grams_input: "", price_per_kg_input: "" },
  ]);

  // Withdrawal form state
  const [selectedNasabahId, setSelectedNasabahId] = useState("");
  const [nasabahBalance, setNasabahBalance] = useState<NasabahBalanceResponse | null>(null);
  const [nasabahWithdrawals, setNasabahWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [isLoadingNasabahFinance, setIsLoadingNasabahFinance] = useState(false);
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState("");
  const [withdrawalNotes, setWithdrawalNotes] = useState("");

  // Manual entry form state
  const [entryType, setEntryType] = useState<CashbookEntryType>("cash_out");
  const [entryCategory, setEntryCategory] = useState("operasional");
  const [entryAmountInput, setEntryAmountInput] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryDate, setEntryDate] = useState(todayDateInput);

  const loadAll = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [sum, recon, salesRes, entriesRes, matsRes, nasRes] = await Promise.all([
        getCashbookSummary(),
        getCashbookReconciliation(),
        listSales(),
        listCashbookEntries(),
        listMaterials(),
        listNasabah({ limit: 100 }),
      ]);
      setSummary(sum);
      setReconciliation(recon);
      setSales(salesRes);
      setEntries(entriesRes);
      setMaterials(matsRes);
      setNasabahList(nasRes.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data Buku Kas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [sum, recon, salesRes, entriesRes, matsRes, nasRes] = await Promise.all([
          getCashbookSummary(),
          getCashbookReconciliation(),
          listSales(),
          listCashbookEntries(),
          listMaterials(),
          listNasabah({ limit: 100 }),
        ]);
        if (!active) {
          return;
        }
        setSummary(sum);
        setReconciliation(recon);
        setSales(salesRes);
        setEntries(entriesRes);
        setMaterials(matsRes);
        setNasabahList(nasRes.items);
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data Buku Kas.");
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
  }, []);

  const loadNasabahFinance = useCallback(async (nasabahId: string) => {
    if (!nasabahId) {
      setNasabahBalance(null);
      setNasabahWithdrawals([]);
      return;
    }
    setIsLoadingNasabahFinance(true);
    try {
      const [bal, wds] = await Promise.all([
        getNasabahBalance(nasabahId),
        listNasabahWithdrawals(nasabahId),
      ]);
      setNasabahBalance(bal);
      setNasabahWithdrawals(wds);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat saldo dan riwayat penarikan nasabah.",
      );
    } finally {
      setIsLoadingNasabahFinance(false);
    }
  }, []);

  function handleSelectNasabah(nasabahId: string) {
    setSelectedNasabahId(nasabahId);
    void loadNasabahFinance(nasabahId);
  }

  function addSaleLine() {
    setSaleLines((prev) => [
      ...prev,
      {
        key: `line-${Date.now()}-${prev.length + 1}`,
        material_type_id: "",
        weight_grams_input: "",
        price_per_kg_input: "",
      },
    ]);
  }

  function removeSaleLine(key: string) {
    setSaleLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function updateSaleLine(key: string, patch: Partial<SaleDraftLine>) {
    setSaleLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const estimatedSaleTotalIdr = saleLines.reduce((acc, line) => {
    const w = parsePositiveInt(line.weight_grams_input) ?? 0;
    const p = parseNonNegativeInt(line.price_per_kg_input) ?? 0;
    return acc + calculateSaleLineSubtotalIdr(w, p);
  }, 0);

  async function handleCreateSale(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!buyerName.trim()) {
      setErrorMessage("Nama pengepul/pembeli wajib diisi.");
      return;
    }

    const parsedLines: { material_type_id: string; weight_grams: number; price_per_kg_idr: number }[] = [];
    for (const line of saleLines) {
      if (!line.material_type_id) {
        setErrorMessage("Pilih jenis sampah pada setiap baris penjualan.");
        return;
      }
      const weight = parsePositiveInt(line.weight_grams_input);
      const price = parseNonNegativeInt(line.price_per_kg_input);
      if (weight === null) {
        setErrorMessage("Berat penjualan harus bilangan bulat positif dalam gram.");
        return;
      }
      if (price === null) {
        setErrorMessage("Harga jual per kg harus bilangan bulat Rupiah (>= 0).");
        return;
      }
      parsedLines.push({
        material_type_id: line.material_type_id,
        weight_grams: weight,
        price_per_kg_idr: price,
      });
    }

    setIsSubmitting(true);
    try {
      const isoDate = new Date(`${saleDate}T12:00:00Z`).toISOString();
      await createSale({
        buyer_name: buyerName.trim(),
        sale_date: isoDate,
        notes: saleNotes.trim() || undefined,
        lines: parsedLines,
      });
      setFeedback("Penjualan ke pengepul berhasil dicatat.");
      setBuyerName("");
      setSaleNotes("");
      setSaleLines([
        { key: `line-${Date.now()}`, material_type_id: "", weight_grams_input: "", price_per_kg_input: "" },
      ]);
      await loadAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mencatat penjualan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenSaleDetail(saleId: string) {
    setErrorMessage(null);
    try {
      const detail = await getSaleDetail(saleId);
      setSelectedSale(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat detail penjualan.");
    }
  }

  async function handleCreateWithdrawal(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!selectedNasabahId) {
      setErrorMessage("Pilih nasabah terlebih dahulu.");
      return;
    }
    const amount = parsePositiveInt(withdrawalAmountInput);
    if (amount === null) {
      setErrorMessage("Nominal penarikan harus bilangan bulat Rupiah positif.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createWithdrawal(selectedNasabahId, {
        amount_idr: amount,
        notes: withdrawalNotes.trim() || undefined,
      });
      setFeedback(`Penarikan tunai ${formatRupiah(amount)} berhasil dicatat.`);
      setWithdrawalAmountInput("");
      setWithdrawalNotes("");
      await Promise.all([loadAll(), loadNasabahFinance(selectedNasabahId)]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mencatat penarikan tunai.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateManualEntry(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    const amount = parsePositiveInt(entryAmountInput);
    if (amount === null) {
      setErrorMessage("Nominal kas harus bilangan bulat Rupiah positif.");
      return;
    }
    if (!entryCategory.trim() || !entryDescription.trim()) {
      setErrorMessage("Kategori dan deskripsi entri kas wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isoDate = new Date(`${entryDate}T12:00:00Z`).toISOString();
      await createCashbookEntry({
        entry_type: entryType,
        category: entryCategory.trim(),
        amount_idr: amount,
        description: entryDescription.trim(),
        transaction_date: isoDate,
      });
      setFeedback("Entri buku kas manual berhasil dicatat.");
      setEntryAmountInput("");
      setEntryDescription("");
      await loadAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mencatat entri kas.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola" navItems={PENGELOLA_NAV}>
      <div className="space-y-[var(--space-xl)]">
        <header className="stock flex flex-wrap items-center justify-between gap-[var(--space-md)] p-[var(--space-xl)]">
          <div className="space-y-[var(--space-xs)]">
            <h1>Buku Kas & Rekonsiliasi</h1>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Catat penjualan ke pengepul, penarikan tunai nasabah, entri kas manual, dan pantau rekonsiliasi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={isLoading}
            className="btn btn--card"
          >
            Muat Ulang
          </button>
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

        <section className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-4">
          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
              Total Kas Masuk
            </p>
            <p className="num text-[var(--text-xl)] font-semibold text-[var(--color-accent-2)]">
              {summary ? formatRupiah(summary.total_cash_in_idr) : "—"}
            </p>
          </article>
          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
              Total Kas Keluar
            </p>
            <p className="num text-[var(--text-xl)] font-semibold">
              {summary ? formatRupiah(summary.total_cash_out_idr) : "—"}
            </p>
          </article>
          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
              Saldo Buku Kas
            </p>
            <p className="num text-[var(--text-xl)] font-semibold">
              {summary ? formatRupiah(summary.net_cash_balance_idr) : "—"}
            </p>
          </article>
          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
              Status Rekonsiliasi
            </p>
            <p className="num text-[var(--text-lg)] font-semibold">
              {reconciliation
                ? reconciliation.is_reconciled
                  ? "Seimbang"
                  : `Selisih ${formatRupiah(reconciliation.discrepancy_idr)}`
                : "—"}
            </p>
          </article>
        </section>

        <nav aria-label="Tab Buku Kas" className="flex flex-wrap gap-[var(--space-sm)]">
          {(
            [
              ["sales", "Penjualan Pengepul"],
              ["withdrawals", "Penarikan Nasabah"],
              ["entries", "Entri Kas Manual"],
              ["reconciliation", "Rekonsiliasi"],
            ] as const
          ).map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              aria-pressed={activeTab === tabId}
              className={activeTab === tabId ? "btn btn--ink" : "btn btn--card"}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "sales" ? (
          <div className="space-y-[var(--space-xl)]">
            <form onSubmit={handleCreateSale} className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]">
              <h2>Catat Penjualan ke Pengepul</h2>
              <div className="grid gap-[var(--space-md)] md:grid-cols-3">
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Nama Pengepul / Pembeli</span>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Contoh: Pengepul Jaya"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Tanggal Penjualan</span>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Catatan (Opsional)</span>
                  <input
                    type="text"
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    placeholder="Nomor nota / keterangan"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
              </div>

              <div className="space-y-[var(--space-sm)]">
                <div className="flex items-center justify-between gap-[var(--space-md)]">
                  <h3 className="text-[var(--text-base)] font-semibold">Rincian Sampah Terjual</h3>
                  <button type="button" onClick={addSaleLine} className="btn btn--card">
                    + Tambah Baris
                  </button>
                </div>

                {saleLines.map((line) => {
                  const weight = parsePositiveInt(line.weight_grams_input) ?? 0;
                  const price = parseNonNegativeInt(line.price_per_kg_input) ?? 0;
                  const subtotal = calculateSaleLineSubtotalIdr(weight, price);
                  return (
                    <div
                      key={line.key}
                      className="grid items-end gap-[var(--space-sm)] rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-[var(--space-md)] md:grid-cols-12"
                    >
                      <label className="block space-y-1 md:col-span-4">
                        <span className="text-[var(--text-xs)] text-[var(--color-muted)]">Jenis Sampah</span>
                        <select
                          required
                          value={line.material_type_id}
                          onChange={(e) => updateSaleLine(line.key, { material_type_id: e.target.value })}
                          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-2 text-[var(--text-sm)]"
                        >
                          <option value="">— Pilih Jenis Sampah —</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.category})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1 md:col-span-3">
                        <span className="text-[var(--text-xs)] text-[var(--color-muted)]">Berat (gram bulat)</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={line.weight_grams_input}
                          onChange={(e) => updateSaleLine(line.key, { weight_grams_input: e.target.value })}
                          placeholder="cth: 15000"
                          className="num w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-2 text-[var(--text-sm)]"
                        />
                      </label>
                      <label className="block space-y-1 md:col-span-3">
                        <span className="text-[var(--text-xs)] text-[var(--color-muted)]">Harga Jual / kg (Rp bulat)</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={line.price_per_kg_input}
                          onChange={(e) => updateSaleLine(line.key, { price_per_kg_input: e.target.value })}
                          placeholder="cth: 4500"
                          className="num w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-2 text-[var(--text-sm)]"
                        />
                      </label>
                      <div className="flex items-center justify-between gap-2 md:col-span-2">
                        <span className="num text-[var(--text-sm)] font-semibold">{formatRupiah(subtotal)}</span>
                        {saleLines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeSaleLine(line.key)}
                            className="text-[var(--text-xs)] text-[var(--color-danger)] underline"
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)] border-t border-[var(--color-rule)] pt-[var(--space-md)]">
                <p className="num text-[var(--text-base)] font-semibold">
                  Pratinjau Total Penjualan: {formatRupiah(estimatedSaleTotalIdr)}
                </p>
                <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                  {isSubmitting ? "Menyimpan..." : "Simpan Penjualan"}
                </button>
              </div>
            </form>

            <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
              <h2>Riwayat Penjualan Pengepul</h2>
              {sales.length === 0 ? (
                <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
                  Belum ada transaksi penjualan ke pengepul.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                    <thead>
                      <tr className="border-b border-[var(--color-rule)] text-[var(--color-muted)]">
                        <th className="py-2 pr-4">Tanggal</th>
                        <th className="py-2 pr-4">Pengepul</th>
                        <th className="py-2 pr-4">Berat Total</th>
                        <th className="py-2 pr-4">Nilai Penjualan</th>
                        <th className="py-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => (
                        <tr key={sale.id} className="border-b border-[var(--color-rule)]/60">
                          <td className="py-2.5 pr-4">{formatDateTimeId(sale.sale_date)}</td>
                          <td className="py-2.5 pr-4 font-medium">{sale.buyer_name}</td>
                          <td className="num py-2.5 pr-4">{formatWeightGrams(sale.total_weight_grams)}</td>
                          <td className="num py-2.5 pr-4 font-semibold">{formatRupiah(sale.total_amount_idr)}</td>
                          <td className="py-2.5">
                            <button
                              type="button"
                              onClick={() => void handleOpenSaleDetail(sale.id)}
                              className="text-[var(--text-xs)] font-medium text-[var(--color-accent-2)] underline"
                            >
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedSale ? (
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-[var(--space-lg)] space-y-[var(--space-sm)]">
                  <div className="flex items-center justify-between gap-[var(--space-md)]">
                    <h3>Detail Penjualan: {selectedSale.buyer_name}</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedSale(null)}
                      className="btn btn--card"
                    >
                      Tutup
                    </button>
                  </div>
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                    Tanggal: {formatDateTimeId(selectedSale.sale_date)} · Total:{" "}
                    <span className="num font-semibold text-[var(--color-ink)]">
                      {formatRupiah(selectedSale.total_amount_idr)}
                    </span>
                  </p>
                  {selectedSale.lines && selectedSale.lines.length > 0 ? (
                    <ul className="space-y-1 text-[var(--text-sm)]">
                      {selectedSale.lines.map((l, idx) => (
                        <li key={l.id ?? idx} className="flex justify-between gap-4">
                          <span>
                            {l.material_name || l.material_type_id} ({formatWeightGrams(l.weight_grams)} ×{" "}
                            {formatRupiah(l.price_per_kg_idr)}/kg)
                          </span>
                          <span className="num font-medium">{formatRupiah(l.subtotal_idr)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeTab === "withdrawals" ? (
          <div className="space-y-[var(--space-xl)]">
            <form onSubmit={handleCreateWithdrawal} className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]">
              <h2>Catat Penarikan Tunai Nasabah</h2>
              <div className="grid gap-[var(--space-md)] md:grid-cols-2">
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Pilih Nasabah</span>
                  <select
                    required
                    value={selectedNasabahId}
                    onChange={(e) => handleSelectNasabah(e.target.value)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  >
                    <option value="">— Pilih Nasabah —</option>
                    {nasabahList.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.full_name} (@{n.username}) — RW {n.rw}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-[var(--space-md)]">
                  <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
                    Saldo Tersedia Nasabah
                  </p>
                  <p className="num text-[var(--text-xl)] font-semibold text-[var(--color-accent-2)]">
                    {isLoadingNasabahFinance
                      ? "Memuat..."
                      : nasabahBalance
                        ? formatRupiah(nasabahBalance.balance_idr)
                        : "Pilih nasabah"}
                  </p>
                </div>
              </div>

              <div className="grid gap-[var(--space-md)] md:grid-cols-2">
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Nominal Penarikan (Rp bulat)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={withdrawalAmountInput}
                    onChange={(e) => setWithdrawalAmountInput(e.target.value)}
                    placeholder="cth: 25000"
                    className="num w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Catatan (Opsional)</span>
                  <input
                    type="text"
                    value={withdrawalNotes}
                    onChange={(e) => setWithdrawalNotes(e.target.value)}
                    placeholder="cth: Penarikan tabungan bulanan"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting || !selectedNasabahId} className="btn btn--ink">
                  {isSubmitting ? "Memproses..." : "Catat Penarikan"}
                </button>
              </div>
            </form>

            {selectedNasabahId ? (
              <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
                <h2>Riwayat Penarikan Nasabah</h2>
                {nasabahWithdrawals.length === 0 ? (
                  <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
                    Belum ada penarikan tunai untuk nasabah ini.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                      <thead>
                        <tr className="border-b border-[var(--color-rule)] text-[var(--color-muted)]">
                          <th className="py-2 pr-4">Tanggal</th>
                          <th className="py-2 pr-4">Nominal</th>
                          <th className="py-2">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nasabahWithdrawals.map((wd) => (
                          <tr key={wd.id} className="border-b border-[var(--color-rule)]/60">
                            <td className="py-2.5 pr-4">{formatDateTimeId(wd.created_at)}</td>
                            <td className="num py-2.5 pr-4 font-semibold">{formatRupiah(wd.amount_idr)}</td>
                            <td className="py-2.5">{wd.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        ) : null}

        {activeTab === "entries" ? (
          <div className="space-y-[var(--space-xl)]">
            <form onSubmit={handleCreateManualEntry} className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]">
              <h2>Entri Buku Kas Manual</h2>
              <div className="grid gap-[var(--space-md)] md:grid-cols-2 lg:grid-cols-4">
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Jenis Mutasi</span>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as CashbookEntryType)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  >
                    <option value="cash_in">Kas Masuk (cash_in)</option>
                    <option value="cash_out">Kas Keluar (cash_out)</option>
                  </select>
                </label>
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Kategori</span>
                  <input
                    type="text"
                    required
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    placeholder="operasional / hibah / modal"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Nominal (Rp bulat)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={entryAmountInput}
                    onChange={(e) => setEntryAmountInput(e.target.value)}
                    placeholder="cth: 50000"
                    className="num w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
                <label className="block space-y-[var(--space-xs)]">
                  <span className="text-[var(--text-sm)] font-medium">Tanggal</span>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                  />
                </label>
              </div>
              <label className="block space-y-[var(--space-xs)]">
                <span className="text-[var(--text-sm)] font-medium">Deskripsi</span>
                <input
                  type="text"
                  required
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  placeholder="cth: Pembelian karung pilah dan timbangan"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
                />
              </label>
              <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                  {isSubmitting ? "Menyimpan..." : "Catat Entri Kas"}
                </button>
              </div>
            </form>

            <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
              <h2>Daftar Mutasi Buku Kas</h2>
              {entries.length === 0 ? (
                <p className="text-[var(--text-sm)] text-[var(--color-muted)]">Belum ada entri buku kas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                    <thead>
                      <tr className="border-b border-[var(--color-rule)] text-[var(--color-muted)]">
                        <th className="py-2 pr-4">Tanggal</th>
                        <th className="py-2 pr-4">Jenis</th>
                        <th className="py-2 pr-4">Kategori</th>
                        <th className="py-2 pr-4">Deskripsi</th>
                        <th className="py-2 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-[var(--color-rule)]/60">
                          <td className="py-2.5 pr-4">{formatDateTimeId(entry.transaction_date || entry.created_at)}</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={
                                entry.entry_type === "cash_in"
                                  ? "font-medium text-[var(--color-accent-2)]"
                                  : "font-medium text-[var(--color-danger)]"
                              }
                            >
                              {entry.entry_type === "cash_in" ? "Masuk" : "Keluar"}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">{entry.category}</td>
                          <td className="py-2.5 pr-4">{entry.description}</td>
                          <td className="num py-2.5 text-right font-semibold">
                            {entry.entry_type === "cash_out" ? "-" : ""}
                            {formatRupiah(entry.amount_idr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "reconciliation" ? (
          <section className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]">
            <h2>Rekonsiliasi Keuangan Bank Sampah</h2>
            {reconciliation ? (
              <dl className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-[var(--space-md)]">
                  <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Saldo Buku Kas</dt>
                  <dd className="num text-[var(--text-lg)] font-semibold">
                    {formatRupiah(reconciliation.cashbook_balance_idr)}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-[var(--space-md)]">
                  <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Total Hak Saldo Nasabah</dt>
                  <dd className="num text-[var(--text-lg)] font-semibold">
                    {formatRupiah(reconciliation.total_nasabah_balance_idr)}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-[var(--space-md)]">
                  <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Total Nilai Setoran</dt>
                  <dd className="num text-[var(--text-lg)] font-semibold">
                    {formatRupiah(reconciliation.total_deposits_value_idr)}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-[var(--space-md)]">
                  <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Total Penjualan Pengepul</dt>
                  <dd className="num text-[var(--text-lg)] font-semibold">
                    {formatRupiah(reconciliation.total_sales_idr)}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-[var(--space-md)]">
                  <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Total Penarikan Nasabah</dt>
                  <dd className="num text-[var(--text-lg)] font-semibold">
                    {formatRupiah(reconciliation.total_withdrawals_idr)}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-[var(--space-md)]">
                  <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Selisih / Status</dt>
                  <dd className="num text-[var(--text-lg)] font-semibold">
                    {formatRupiah(reconciliation.discrepancy_idr)} (
                    {reconciliation.is_reconciled ? "Seimbang" : "Perlu Tinjauan"})
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-[var(--text-sm)] text-[var(--color-muted)]">Memuat data rekonsiliasi...</p>
            )}
          </section>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

export default function PengelolaCashbookPage() {
  return (
    <RoleGuard allowedRole="pengelola">
      <CashbookContent />
    </RoleGuard>
  );
}
