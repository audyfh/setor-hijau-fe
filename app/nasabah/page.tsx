"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/auth/workspace-shell";
import { DigitalReceiptCard } from "@/components/deposits/digital-receipt-card";
import type { WithdrawalRecord } from "@/lib/api/cashbook";
import {
  getDepositReceipt,
  listDeposits,
  type DepositReceipt,
  type DepositRecord,
} from "@/lib/api/deposits";
import type { NasabahItem } from "@/lib/api/nasabah";
import {
  getMyBalance,
  getMyCarbon,
  getMyNasabahProfile,
  listMyWithdrawals,
  updateMyPin,
  type MyBalanceSummary,
  type MyCarbonSummary,
} from "@/lib/api/nasabah-portal";
import {
  formatEstimatedCO2eGrams,
  formatRupiah,
  formatWeightGrams,
} from "@/lib/format/units";

const NASABAH_NAV: WorkspaceNavItem[] = [
  { href: "/nasabah", label: "Portal Nasabah" },
  { href: "/panduan", label: "Panduan Pemilahan" },
  { href: "/metode", label: "Metode & Sumber" },
];

type NasabahTab = "deposits" | "withdrawals" | "pin";

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

function NasabahContent() {
  const { user, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<NasabahTab>("deposits");

  const [profile, setProfile] = useState<NasabahItem | null>(null);
  const [balance, setBalance] = useState<MyBalanceSummary | null>(null);
  const [carbon, setCarbon] = useState<MyCarbonSummary | null>(null);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);

  const [selectedReceipt, setSelectedReceipt] = useState<DepositReceipt | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Self-service 6-digit PIN form
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const refreshData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [profRes, balRes, carbRes, depRes, wdRes] = await Promise.all([
        getMyNasabahProfile(),
        getMyBalance(),
        getMyCarbon(),
        listDeposits({ limit: 50 }),
        listMyWithdrawals(),
      ]);
      setProfile(profRes);
      setBalance(balRes);
      setCarbon(carbRes);
      setDeposits(depRes.items);
      setWithdrawals(wdRes);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat data Portal Nasabah.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [profRes, balRes, carbRes, depRes, wdRes] = await Promise.all([
          getMyNasabahProfile(),
          getMyBalance(),
          getMyCarbon(),
          listDeposits({ limit: 50 }),
          listMyWithdrawals(),
        ]);
        if (!active) {
          return;
        }
        setProfile(profRes);
        setBalance(balRes);
        setCarbon(carbRes);
        setDeposits(depRes.items);
        setWithdrawals(wdRes);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Gagal memuat data Portal Nasabah.",
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
  }, []);

  async function handleViewReceipt(depositId: string) {
    setErrorMessage(null);
    setIsLoadingReceipt(true);
    try {
      const receipt = await getDepositReceipt(depositId);
      setSelectedReceipt(receipt);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat Struk Digital.");
    } finally {
      setIsLoadingReceipt(false);
    }
  }

  async function handleUpdatePin(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!/^\d{6}$/.test(pinInput.trim())) {
      setErrorMessage("PIN harus terdiri dari tepat 6 digit angka.");
      return;
    }
    if (pinInput.trim() !== pinConfirm.trim()) {
      setErrorMessage("Konfirmasi PIN tidak cocok.");
      return;
    }

    setIsUpdatingPin(true);
    try {
      await updateMyPin(pinInput.trim());
      setFeedback("PIN 6 digit berhasil diperbarui untuk login QR opsional.");
      setPinInput("");
      setPinConfirm("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memperbarui PIN.");
    } finally {
      setIsUpdatingPin(false);
    }
  }

  return (
    <WorkspaceShell roleLabel="Portal Nasabah" navItems={NASABAH_NAV}>
      <div className="space-y-[var(--space-xl)]">
        <header className="stock flex flex-wrap items-center justify-between gap-[var(--space-md)] p-[var(--space-xl)]">
          <div className="space-y-[var(--space-xs)]">
            <h1>Halo, {profile?.full_name || user?.full_name || user?.username}</h1>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              {tenant
                ? `Unit Bank Sampah: ${tenant.name} (Kode: ${tenant.code})`
                : "Portal pribadi Nasabah Setor Hijau."}
              {profile ? ` · RW ${profile.rw}${profile.rt ? ` / RT ${profile.rt}` : ""}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-[var(--space-sm)]">
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={isLoading}
              className="btn btn--card"
            >
              Muat Ulang
            </button>
            <Link href="/panduan" className="btn btn--ink">
              Panduan Pemilahan
            </Link>
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

        <section className="grid gap-[var(--space-md)] md:grid-cols-3">
          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
              Saldo Rupiah Tersedia
            </p>
            <p className="num text-[var(--text-2xl)] font-semibold text-[var(--color-accent-2)]">
              {balance ? formatRupiah(balance.balance_idr) : "—"}
            </p>
            <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
              {balance
                ? `Total Setoran ${formatRupiah(balance.total_deposits_idr)} · Penarikan ${formatRupiah(balance.total_withdrawals_idr)}`
                : "Memuat saldo..."}
            </p>
          </article>

          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
              Estimasi Tabungan Karbon
            </p>
            <p className="num text-[var(--text-2xl)] font-semibold text-[var(--color-accent-2)]">
              {carbon ? formatEstimatedCO2eGrams(carbon.estimated_co2e_grams) : "—"}
            </p>
            <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
              Estimasi berbasis {carbon?.methodology ?? "US EPA WARM v16"} (bukan pengukuran sensor fisik).
            </p>
          </article>

          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--color-muted)]">
              Identitas QR Nasabah
            </p>
            <p className="font-mono text-[var(--text-sm)] font-semibold break-all">
              {profile?.qr_token || "Belum ada token QR"}
            </p>
            <p className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
              Tunjukkan kode QR ke Pengelola saat menimbang setoran, atau gunakan untuk login QR + PIN.
            </p>
          </article>
        </section>

        <nav aria-label="Menu Portal Nasabah" className="flex flex-wrap gap-[var(--space-sm)]">
          {(
            [
              ["deposits", `Riwayat Setoran (${deposits.length})`],
              ["withdrawals", `Riwayat Penarikan (${withdrawals.length})`],
              ["pin", "Pengaturan PIN 6 Digit"],
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

        {activeTab === "deposits" ? (
          <div className="space-y-[var(--space-lg)]">
            {selectedReceipt ? (
              <DigitalReceiptCard
                receipt={selectedReceipt}
                onClose={() => setSelectedReceipt(null)}
              />
            ) : null}

            <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2>Riwayat Setoran &amp; Struk Digital</h2>
                {isLoadingReceipt ? (
                  <span className="text-[var(--text-xs)] text-[var(--color-muted)]">
                    Memuat struk...
                  </span>
                ) : null}
              </div>

              {deposits.length === 0 ? (
                <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
                  Belum ada riwayat setoran tercatat.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                    <thead>
                      <tr className="border-b border-[var(--color-rule)] text-[var(--color-muted)]">
                        <th className="py-2 pr-4">Waktu Setoran</th>
                        <th className="py-2 pr-4">Berat Total</th>
                        <th className="py-2 pr-4">Nilai Rupiah</th>
                        <th className="py-2 pr-4">Estimasi CO₂e Dihindari</th>
                        <th className="py-2">Struk Digital</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.map((dep) => {
                        const co2e =
                          dep.total_estimated_co2e_grams ?? dep.estimated_co2e_grams ?? 0;
                        return (
                          <tr key={dep.id} className="border-b border-[var(--color-rule)]/60">
                            <td className="py-2.5 pr-4">
                              {formatDateTimeId(dep.client_recorded_at || dep.created_at)}
                            </td>
                            <td className="num py-2.5 pr-4">
                              {formatWeightGrams(dep.total_weight_grams)}
                            </td>
                            <td className="num py-2.5 pr-4 font-semibold">
                              {formatRupiah(dep.total_amount_idr)}
                            </td>
                            <td className="num py-2.5 pr-4 text-[var(--color-accent-2)]">
                              {formatEstimatedCO2eGrams(co2e)}
                            </td>
                            <td className="py-2.5">
                              <button
                                type="button"
                                onClick={() => void handleViewReceipt(dep.id)}
                                className="text-[var(--text-xs)] font-medium text-[var(--color-accent-2)] underline"
                              >
                                Lihat Struk
                              </button>
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
        ) : null}

        {activeTab === "withdrawals" ? (
          <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
            <h2>Riwayat Penarikan Tunai</h2>
            {withdrawals.length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
                Belum ada riwayat penarikan tunai.
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
                    {withdrawals.map((wd) => (
                      <tr key={wd.id} className="border-b border-[var(--color-rule)]/60">
                        <td className="py-2.5 pr-4">{formatDateTimeId(wd.created_at)}</td>
                        <td className="num py-2.5 pr-4 font-semibold">
                          {formatRupiah(wd.amount_idr)}
                        </td>
                        <td className="py-2.5">{wd.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "pin" ? (
          <form
            onSubmit={handleUpdatePin}
            className="stock max-w-lg space-y-[var(--space-lg)] p-[var(--space-xl)]"
          >
            <div className="space-y-[var(--space-xs)]">
              <h2>Atur PIN 6 Digit (Opsional)</h2>
              <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                PIN ini digunakan bersama kartu QR Anda untuk opsi login cepat. Login utama tetap
                menggunakan username/email dan kata sandi.
              </p>
            </div>

            <label className="block space-y-[var(--space-xs)]">
              <span className="text-[var(--text-sm)] font-medium">PIN Baru (6 digit angka)</span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
                className="num w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
              />
            </label>

            <label className="block space-y-[var(--space-xs)]">
              <span className="text-[var(--text-sm)] font-medium">Konfirmasi PIN Baru</span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
                className="num w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-[var(--text-sm)]"
              />
            </label>

            <div className="flex justify-end">
              <button type="submit" disabled={isUpdatingPin} className="btn btn--ink">
                {isUpdatingPin ? "Menyimpan..." : "Simpan PIN 6 Digit"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

export default function NasabahPage() {
  return (
    <RoleGuard allowedRole="nasabah">
      <NasabahContent />
    </RoleGuard>
  );
}
