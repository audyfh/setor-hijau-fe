import Link from "next/link";

interface SiteHeaderProps {
  activePath?: "/" | "/metode" | "/panduan";
}

const NAV_LINKS: Array<{ href: string; label: string; match?: "/" | "/metode" | "/panduan" }> = [
  { href: "/#net-impact", label: "Net Impact Meter" },
  { href: "/metode", label: "Metode & Sumber", match: "/metode" },
  { href: "/panduan", label: "Panduan Pemilahan", match: "/panduan" },
];

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky-nav)] border-b border-[var(--color-rule)] bg-[var(--color-paper)]/95 backdrop-blur-sm">
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-[var(--space-md)] py-[var(--space-sm)]">
        <Link
          href="/"
          aria-label="Beranda Setor Hijau"
          className="text-[var(--text-lg)] font-semibold tracking-tight text-[var(--color-ink)] no-underline"
        >
          Setor Hijau
        </Link>

        <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-[var(--space-lg)]">
          {NAV_LINKS.map((item) => {
            const isActive = item.match && activePath === item.match;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "text-[var(--text-sm)] font-medium text-[var(--color-accent-2)] underline underline-offset-4"
                    : "text-[var(--text-sm)] font-medium text-[var(--color-ink-2)] no-underline hover:text-[var(--color-ink)] hover:underline"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
