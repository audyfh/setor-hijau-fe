"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { fetchTenantPublicImpact, type PublicImpactResponse } from "@/lib/api/public";
import { formatBytes, formatEstimatedCO2eGrams, formatWeightGrams } from "@/lib/format/units";

interface NetImpactMeterProps {
  initialImpact: PublicImpactResponse | null;
  initialError?: string | null;
}

const ratioFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function NetImpactMeter({ initialImpact, initialError = null }: NetImpactMeterProps) {
  const [impact, setImpact] = useState<PublicImpactResponse | null>(initialImpact);
  const [tenantCodeInput, setTenantCodeInput] = useState("");
  const [activeTenantCode, setActiveTenantCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  async function handleTenantLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = tenantCodeInput.trim();
    if (!trimmed) {
      setErrorMessage("Masukkan kode bank sampah terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const tenantImpact = await fetchTenantPublicImpact(trimmed);
      setImpact(tenantImpact);
      setActiveTenantCode(tenantImpact.tenant_code ?? trimmed.toUpperCase());
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setErrorMessage(
          `Bank sampah dengan kode "${trimmed}" tidak ditemukan. Periksa kembali kode RW Anda.`,
        );
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal mengambil data Net Impact bank sampah.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleResetToPlatform() {
    setImpact(initialImpact);
    setActiveTenantCode(null);
    setTenantCodeInput("");
    setErrorMessage(initialError);
  }

  const scopeLabel = activeTenantCode
    ? `Cakupan: Bank Sampah ${impact?.tenant_name ? `${impact.tenant_name} (${activeTenantCode})` : activeTenantCode}`
    : "Cakupan: Agregat Seluruh Platform Setor Hijau";

  return (
    <div className="space-y-[var(--space-lg)]">
      <div className="flex flex-col gap-[var(--space-md)] lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-[var(--space-xs)]">
          <h2 className="text-[var(--color-ink)]">Net Impact Meter</h2>
          <p className="lead text-[var(--color-ink-2)]">
            Selisih estimasi emisi terhindar dari daur ulang (WARM v16) dikurangi estimasi jejak
            digital aplikasi web (SWDM v4).
          </p>
          <p className="text-[var(--text-sm)] font-medium text-[var(--color-muted)]">{scopeLabel}</p>
        </div>

        <form
          onSubmit={handleTenantLookup}
          className="flex w-full max-w-md flex-col gap-[var(--space-xs)] sm:flex-row sm:items-end"
          noValidate
        >
          <div className="flex-1 space-y-[var(--space-2xs)]">
            <label
              htmlFor="tenant-code-input"
              className="block text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
            >
              Cari kode bank sampah
            </label>
            <input
              id="tenant-code-input"
              name="tenant_code"
              type="text"
              value={tenantCodeInput}
              onChange={(event) => setTenantCodeInput(event.target.value)}
              placeholder="Contoh: RW05-MELATI"
              autoComplete="off"
              className="field-input w-full"
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn btn--card shrink-0">
            {isLoading ? "Memuat…" : "Lihat Dampak"}
          </button>
          {activeTenantCode ? (
            <button
              type="button"
              onClick={handleResetToPlatform}
              className="btn btn--card shrink-0"
            >
              Semua Platform
            </button>
          ) : null}
        </form>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="stock border-l-4 border-[var(--color-error)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-error)]"
        >
          {errorMessage}
        </div>
      ) : null}

      {impact ? (
        <div className="grid gap-[var(--space-lg)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="board rounded-[var(--radius-card)] p-[var(--space-xl)] shadow-[var(--cast-stock)]">
            <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-sm)] border-b border-[var(--color-rule)]/20 pb-[var(--space-md)]">
              <span className="text-[var(--text-sm)] text-[var(--color-board-type)]/80">
                Estimasi Net Impact (Emisi Bersih Terhindar)
              </span>
              <span className="text-[var(--text-xs)] text-[var(--color-board-type)]/70">
                WARM v16 − SWDM v4
              </span>
            </div>

            <p className="fig mt-[var(--space-md)] text-[var(--text-display-s)] font-semibold tracking-tight text-[var(--color-board-type)]">
              {formatEstimatedCO2eGrams(impact.net_impact_co2e_grams)}
            </p>
            <p className="mt-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-board-type)]/80">
              Estimasi dari{" "}
              <strong className="fig font-medium text-[var(--color-board-type)]">
                {formatWeightGrams(impact.total_recycled_weight_grams)}
              </strong>{" "}
              sampah anorganik terdaur ulang, dengan rasio keberlanjutan{" "}
              <strong className="fig font-medium text-[var(--color-board-type)]">
                {ratioFormatter.format(impact.sustainability_ratio)}×
              </strong>
              .
            </p>

            <dl className="mt-[var(--space-lg)] grid gap-[var(--space-md)] border-t border-[var(--color-rule)]/20 pt-[var(--space-md)] sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-xs)] text-[var(--color-board-type)]/75">
                  Estimasi Emisi Dihindari (WARM v16)
                </dt>
                <dd className="fig mt-[var(--space-2xs)] text-[var(--text-xl)] font-semibold text-[var(--color-board-type)]">
                  {formatEstimatedCO2eGrams(impact.total_avoided_co2e_grams)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-xs)] text-[var(--color-board-type)]/75">
                  Estimasi Jejak Digital Web (SWDM v4)
                </dt>
                <dd className="fig mt-[var(--space-2xs)] text-[var(--text-xl)] font-semibold text-[var(--color-board-type)]">
                  {formatEstimatedCO2eGrams(impact.total_digital_footprint_co2e_grams)}
                </dd>
                <dd className="fig text-[var(--text-xs)] text-[var(--color-board-type)]/70">
                  Volume transfer: {formatBytes(impact.total_data_bytes_transferred)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="stock p-[var(--space-xl)]">
            <h3 className="text-[var(--color-ink)]">Rincian Estimasi Jejak Digital (SWDM v4)</h3>
            <p className="mt-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Pembagian estimasi emisi transfer data ke empat komponen sistem web sesuai model SWDM
              v4.
            </p>

            <dl className="mt-[var(--space-lg)] divide-y divide-[var(--color-rule)]">
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Pusat Data (15%)
                </dt>
                <dd className="fig text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                  {formatEstimatedCO2eGrams(impact.digital_footprint_segments.data_center_co2e_grams)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--text-sm)] text-[var(--color-ink-2)]">Jaringan (14%)</dt>
                <dd className="fig text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                  {formatEstimatedCO2eGrams(impact.digital_footprint_segments.network_co2e_grams)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Perangkat Pengguna (52%)
                </dt>
                <dd className="fig text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                  {formatEstimatedCO2eGrams(impact.digital_footprint_segments.user_device_co2e_grams)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Perangkat Keras Terwujud (19%)
                </dt>
                <dd className="fig text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                  {formatEstimatedCO2eGrams(
                    impact.digital_footprint_segments.embodied_hardware_co2e_grams,
                  )}
                </dd>
              </div>
            </dl>

            <p className="mt-[var(--space-md)] text-[var(--text-xs)] text-[var(--color-muted)]">
              Seluruh angka karbon merupakan estimasi matematis berdasarkan data setoran terverifikasi
              dan telemetri byte sesi, bukan pengukuran sensor fisik.
            </p>
          </div>
        </div>
      ) : (
        <div className="stock p-[var(--space-xl)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
          Data Net Impact Meter belum dapat dimuat dari server backend. Silakan muat ulang halaman
          atau periksa koneksi jaringan Anda.
        </div>
      )}
    </div>
  );
}
