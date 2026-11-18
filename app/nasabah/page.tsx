"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";

function NasabahContent() {
  const { user, tenant } = useAuth();

  return (
    <WorkspaceShell roleLabel="Portal Nasabah">
      <div className="space-y-[var(--space-xl)]">
        <header className="stock space-y-[var(--space-xs)] p-[var(--space-xl)]">
          <h1>Halo, {user?.full_name || user?.username}</h1>
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
            {tenant
              ? `Terdaftar di ${tenant.name} (Kode: ${tenant.code})`
              : "Sesi Nasabah aktif. Data saldo, riwayat setoran, dan tabungan karbon Anda akan tampil di sini."}
          </p>
        </header>

        <section className="grid gap-[var(--space-lg)] md:grid-cols-2">
          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <h2>Saldo Rupiah &amp; Tabungan Karbon (M6)</h2>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Ringkasan saldo rupiah hasil setoran dan estimasi emisi terhindar pribadi (WARM v16).
            </p>
          </article>

          <article className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
            <h2>Riwayat Setoran &amp; Pengaturan PIN (M6)</h2>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Akses struk digital setiap setoran, riwayat penarikan kas, dan atur PIN 6 digit Anda.
            </p>
          </article>
        </section>

        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Link href="/panduan" className="btn btn--ink">
            Panduan Pemilahan Sampah
          </Link>
          <Link href="/metode" className="btn btn--card">
            Metode &amp; Sumber Karbon
          </Link>
        </div>
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
