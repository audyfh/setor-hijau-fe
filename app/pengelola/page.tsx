"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";

const PENGELOLA_MODULES = [
  {
    title: "Nasabah & Kartu QR (M3)",
    detail: "Kelola data warga RW, cetak kartu QR, serta reset PIN atau kata sandi nasabah.",
  },
  {
    title: "Jenis & Harga Sampah (M3)",
    detail: "Atur daftar material daur ulang dan riwayat harga integer Rupiah per kilogram.",
  },
  {
    title: "Catat Setoran Offline & Struk Digital (M4)",
    detail: "Penimbangan gram bulat, antrean IndexedDB, sinkronisasi idempoten, dan struk digital.",
  },
  {
    title: "Buku Kas, Dashboard & Laporan (M5)",
    detail: "Penjualan pengepul, penarikan nasabah, Carbon Ledger, dan ekspor CSV/PDF.",
  },
];

function PengelolaContent() {
  const { user, tenant } = useAuth();

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola">
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
            <article key={mod.title} className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <h2>{mod.title}</h2>
              <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">{mod.detail}</p>
            </article>
          ))}
        </section>

        <div>
          <Link href="/#net-impact" className="btn btn--card">
            Lihat Net Impact Meter Publik
          </Link>
        </div>
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
