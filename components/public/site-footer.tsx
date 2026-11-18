import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="section-rule bg-[var(--color-paper-2)] py-[var(--space-2xl)]">
      <div className="container grid gap-[var(--space-xl)] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-end">
        <div className="space-y-[var(--space-sm)]">
          <p className="text-[var(--text-xl)] font-semibold tracking-tight text-[var(--color-ink)]">
            Setor Hijau
          </p>
          <p className="max-w-[52ch] text-[var(--text-sm)] text-[var(--color-ink-2)]">
            Sistem informasi bank sampah tingkat RW dengan pencatatan setoran offline, buku kas
            otomatis, dan akuntansi karbon terbuka berbasis estimasi US EPA WARM v16 serta SWDM v4.
          </p>
          <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
            Proyek Akhir Sistem Informasi Berkelanjutan, Fakultas Ilmu Komputer, Universitas
            Brawijaya (2026).
          </p>
        </div>

        <nav
          aria-label="Tautan kaki halaman"
          className="flex flex-wrap gap-x-[var(--space-lg)] gap-y-[var(--space-sm)] md:justify-end"
        >
          <Link
            href="/"
            className="text-[var(--text-sm)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            Beranda
          </Link>
          <Link
            href="/#net-impact"
            className="text-[var(--text-sm)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            Net Impact Meter
          </Link>
          <Link
            href="/metode"
            className="text-[var(--text-sm)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            Metode &amp; Sumber
          </Link>
          <Link
            href="/panduan"
            className="text-[var(--text-sm)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            Panduan Pemilahan
          </Link>
        </nav>
      </div>
    </footer>
  );
}
