"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export interface WorkspaceNavItem {
  href: string;
  label: string;
}

interface WorkspaceShellProps {
  roleLabel: string;
  navItems?: WorkspaceNavItem[];
  children: ReactNode;
}

export function WorkspaceShell({ roleLabel, navItems = [], children }: WorkspaceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, tenant, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-[var(--z-sticky-nav)] border-b border-[var(--color-rule)] bg-[var(--color-paper)]/95 backdrop-blur-sm">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-[var(--space-md)] py-[var(--space-sm)]">
          <div className="flex flex-wrap items-baseline gap-[var(--space-md)]">
            <Link
              href="/"
              className="text-[var(--text-lg)] font-semibold tracking-tight text-[var(--color-ink)] no-underline"
            >
              Setor Hijau
            </Link>
            <span className="text-[var(--text-sm)] text-[var(--color-muted)]">
              {roleLabel}
              {tenant ? ` · ${tenant.name} (${tenant.code})` : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-[var(--space-md)]">
            {navItems.length > 0 ? (
              <nav aria-label="Navigasi ruang kerja" className="flex flex-wrap items-center gap-[var(--space-md)]">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
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
            ) : null}

            <span className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              {user?.full_name || user?.username}
            </span>
            <button type="button" onClick={handleLogout} className="btn btn--card">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-[var(--space-2xl)]">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
