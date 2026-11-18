"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/auth/workspace-shell";

export const PENGELOLA_NAV: WorkspaceNavItem[] = [
  { href: "/pengelola", label: "Ringkasan" },
  { href: "/pengelola/nasabah", label: "Nasabah" },
  { href: "/pengelola/materials", label: "Jenis & Harga Sampah" },
];

const PENGELOLA_MODULES = [
  {
    title: "Manajemen Nasabah & Kartu QR",
    detail: "Tambah dan ubah data warga RW, cetak kartu QR, regenerasi token QR, serta reset PIN/sandi.",
    href: "/pengelola/nasabah",
    cta: "Kelola Nasabah",
  },
  {
    title: "Master Jenis & Harga Sampah",
    detail: "Kelola jenis sampah, hubungkan faktor WARM v16, dan perbarui harga integer Rupiah (append-only).",
    href: "/pengelola/materials",
    cta: "Kelola Harga Sampah",
  },
  {
    title: "Catat Setoran Offline & Struk Digital (M4)",
    detail: "Penimbangan gram bulat, antrean IndexedDB, sinkronisasi idempoten, dan struk digital.",
    href: null,
    cta: "Segera di M4",
  },
  {
    title: "Buku Kas, Dashboard & Laporan (M5)",
    detail: "Penjualan pengepul, penarikan nasabah, Carbon Ledger, dan ekspor CSV/PDF.",
    href: null,
    cta: "Segera di M5",
  },
];

function PengelolaContent() {
  const { user, tenant } = useAuth();

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola" navItems={PENGELOLA_NAV}>
      <div className="space-y-[var(--space-xl)]">
        <header className="stock space-y-[var(--space-xs)] p-[var(--space-xl)]">
          <h1>Selamat datang, {user?.full_name || user?.username}</h1>
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
            {tenant
              ? `Unit Bank Sampah: ${tenant.name} (Kode: ${tenant.code}, RW ${tenant.rw})`
              : "Sesi Pengelola aktif dan terisolasi pada tenant bank sampah Anda."}
          </p>
        </header>

        <section className="grid gap-[var(--space-lg)] md:grid-cols-2">
          {PENGELOLA_MODULES.map((mod) => (
            <article
              key={mod.title}
              className="stock flex flex-col justify-between gap-[var(--space-md)] p-[var(--space-lg)]"
            >
              <div className="space-y-[var(--space-xs)]">
                <h2>{mod.title}</h2>
                <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">{mod.detail}</p>
              </div>
              <div>
                {mod.href ? (
                  <Link href={mod.href} className="btn btn--ink">
                    {mod.cta}
                  </Link>
                ) : (
                  <span className="text-[var(--text-xs)] font-medium text-[var(--color-muted)]">
                    {mod.cta}
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </WorkspaceShell>
  );
}

export default function PengelolaPage() {
  return (
    <RoleGuard allowedRole="pengelola">
      <PengelolaContent />
    </RoleGuard>
  );
}
