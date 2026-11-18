"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import type { UserRole } from "@/lib/auth/types";

interface RoleGuardProps {
  allowedRole: UserRole;
  children: ReactNode;
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== allowedRole) {
      router.replace(user.role === "pengelola" ? "/pengelola" : "/nasabah");
    }
  }, [isReady, user, allowedRole, router]);

  if (!isReady) {
    return (
      <div className="container py-[var(--space-2xl)]">
        <div className="stock p-[var(--space-xl)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
          Memeriksa sesi autentikasi Anda…
        </div>
      </div>
    );
  }

  if (!user || user.role !== allowedRole) {
    return (
      <div className="container py-[var(--space-2xl)]">
        <div className="stock p-[var(--space-xl)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
          Mengalihkan ke halaman yang sesuai dengan peran Anda…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
