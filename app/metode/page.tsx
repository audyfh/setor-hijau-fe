import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { fetchPublicMethods } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Metode & Sumber — Setor Hijau",
  description:
    "Transparansi faktor emisi US EPA WARM v16, parameter SWDM v4 (CO2.js), rumus deterministik, dan batasan estimasi akuntansi karbon Setor Hijau.",
};

const ppmFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const factorFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 6,
});

async function MethodsContent() {
  await connection();
  let methods = null;
  let errorMessage: string | null = null;

  try {
    methods = await fetchPublicMethods();
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Gagal memuat data metodologi dari server.";
  }

  if (!methods) {
    return (
      <div className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
        <h1>Metode &amp; Sumber</h1>
        <p className="text-[var(--text-sm)] text-[var(--color-error)]">
          {errorMessage ?? "Data metodologi belum tersedia."}
        </p>
        <Link href="/" className="btn btn--card">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
      <div className="space-y-[var(--space-2xl)]">
        <header className="space-y-[var(--space-md)]">
          <h1>{methods.title}</h1>
          <p className="lead text-[var(--color-ink-2)]">{methods.academic_statement}</p>
        </header>

        <section className="space-y-[var(--space-lg)]">
          <div className="space-y-[var(--space-xs)]">
            <h2>Faktor Emisi Terhindar ({methods.warm_model.version})</h2>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Sumber: {methods.warm_model.source_citation}. Skenario dasar:{" "}
              {methods.warm_model.baseline_scenario}
            </p>
          </div>

          <div className="stock overflow-x-auto p-[var(--space-md)]">
            <table className="w-full border-collapse text-left text-[var(--text-sm)]">
              <thead>
                <tr className="border-b border-[var(--color-rule-2)] text-[var(--color-muted)]">
                  <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                    Jenis Sampah
                  </th>
                  <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                    Kategori
                  </th>
                  <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                    Faktor (PPM)
                  </th>
                  <th className="py-[var(--space-sm)] font-medium">
                    Estimasi MT CO₂e / Ton
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {methods.warm_model.target_materials.map((material) => (
                  <tr key={material.id}>
                    <td className="py-[var(--space-sm)] pr-[var(--space-md)]">
                      <p className="font-medium text-[var(--color-ink)]">{material.name}</p>
                      <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                        {material.description}
                      </p>
                    </td>
                    <td className="py-[var(--space-sm)] pr-[var(--space-md)] capitalize text-[var(--color-ink-2)]">
                      {material.category}
                    </td>
                    <td className="fig py-[var(--space-sm)] pr-[var(--space-md)] text-[var(--color-ink)]">
                      {ppmFormatter.format(material.co2e_factor_ppm)}
                    </td>
                    <td className="fig py-[var(--space-sm)] text-[var(--color-ink)]">
                      {factorFormatter.format(material.metric_ton_co2e_per_metric_ton)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-[var(--space-lg)]">
          <div className="space-y-[var(--space-xs)]">
            <h2>Parameter Jejak Digital ({methods.swdm_model.model_version})</h2>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Sumber: {methods.swdm_model.model_source}.
            </p>
          </div>

          <div className="grid gap-[var(--space-lg)] md:grid-cols-2">
            <dl className="stock divide-y divide-[var(--color-rule)] p-[var(--space-lg)] text-[var(--text-sm)]">
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Energi operasional per GB</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.operational_energy_per_gb_kwh} kWh/GB
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Energi terwujud (embodied) per GB</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.embodied_energy_per_gb_kwh} kWh/GB
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Total energi per GB</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.total_energy_per_gb_kwh} kWh/GB
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Intensitas karbon jaringan listrik</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.grid_carbon_intensity_g_per_kwh} g CO₂e/kWh
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="font-medium text-[var(--color-ink)]">Estimasi emisi per GB</dt>
                <dd className="fig font-semibold text-[var(--color-accent-2)]">
                  {methods.swdm_model.emissions_per_gb_g_co2e} g CO₂e/GB
                </dd>
              </div>
            </dl>

            <dl className="stock divide-y divide-[var(--color-rule)] p-[var(--space-lg)] text-[var(--text-sm)]">
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Segmen pusat data</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.segments_breakdown_percent.data_center_pct}%
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Segmen jaringan transmisi</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.segments_breakdown_percent.network_pct}%
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Segmen perangkat pengguna</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.segments_breakdown_percent.user_device_pct}%
                </dd>
              </div>
              <div className="flex items-center justify-between py-[var(--space-sm)]">
                <dt className="text-[var(--color-ink-2)]">Segmen perangkat keras terwujud</dt>
                <dd className="fig font-medium text-[var(--color-ink)]">
                  {methods.swdm_model.segments_breakdown_percent.embodied_hardware_pct}%
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="space-y-[var(--space-lg)]">
          <h2>Rumus Perhitungan Deterministik</h2>
          <div className="grid gap-[var(--space-md)] md:grid-cols-2">
            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <h3>Estimasi Emisi Dihindari</h3>
              <code className="fig block overflow-x-auto text-[var(--text-xs)] text-[var(--color-ink-2)]">
                {methods.formulas.avoided_co2e_formula}
              </code>
            </article>
            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <h3>Estimasi Jejak Digital Web</h3>
              <code className="fig block overflow-x-auto text-[var(--text-xs)] text-[var(--color-ink-2)]">
                {methods.formulas.digital_footprint_formula}
              </code>
            </article>
            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <h3>Estimasi Net Impact</h3>
              <code className="fig block overflow-x-auto text-[var(--text-xs)] text-[var(--color-ink-2)]">
                {methods.formulas.net_impact_formula}
              </code>
            </article>
            <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <h3>Rasio Keberlanjutan</h3>
              <code className="fig block overflow-x-auto text-[var(--text-xs)] text-[var(--color-ink-2)]">
                {methods.formulas.sustainability_ratio_formula}
              </code>
            </article>
          </div>
        </section>

        <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
          <h2>Asumsi dan Batasan Ilmiah</h2>
          <ul className="list-disc space-y-[var(--space-sm)] pl-[var(--space-lg)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
            {methods.assumptions_and_limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="pt-[var(--space-sm)]">
            <Link href="/#net-impact" className="btn btn--ink">
              Kembali ke Net Impact Meter
            </Link>
          </div>
        </section>
      </div>
  );
}

export default function MetodePage() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <SiteHeader activePath="/metode" />

      <main className="flex-1 py-[var(--space-2xl)]">
        <div className="container">
          <Suspense
            fallback={
              <div className="stock p-[var(--space-xl)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
                Memuat data Metode &amp; Sumber dari server…
              </div>
            }
          >
            <MethodsContent />
          </Suspense>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
