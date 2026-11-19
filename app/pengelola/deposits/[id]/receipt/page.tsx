"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";
import { DigitalReceiptCard } from "@/components/deposits/digital-receipt-card";
import { PENGELOLA_NAV } from "@/app/pengelola/page";
import { getDepositReceipt, type DepositReceipt } from "@/lib/api/deposits";

function ReceiptPageContent() {
  const params = useParams<{ id: string }>();
  const depositId = typeof params?.id === "string" ? params.id : "";

  const [receipt, setReceipt] = useState<DepositReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadReceipt() {
      if (!depositId) {
        if (active) {
          setErrorMessage("ID setoran tidak ditemukan.");
          setIsLoading(false);
        }
        return;
      }
      try {
        const data = await getDepositReceipt(depositId);
        if (active) {
          setReceipt(data);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Gagal memuat Struk Digital setoran.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void loadReceipt();
    return () => {
      active = false;
    };
  }, [depositId]);

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola" navItems={PENGELOLA_NAV}>
      <div className="mx-auto max-w-3xl space-y-[var(--space-lg)]">
        <div className="flex items-center justify-between gap-[var(--space-md)] print:hidden">
          <Link href="/pengelola/deposits" className="btn btn--card">
            Kembali ke Catat Setoran
          </Link>
        </div>

        {isLoading ? (
          <div className="stock p-[var(--space-xl)] text-[var(--text-sm)] text-[var(--color-muted)]">
            Memuat Struk Digital...
          </div>
        ) : errorMessage ? (
          <div
            role="alert"
            className="stock border-[var(--color-error)] p-[var(--space-xl)] text-[var(--text-sm)] text-[var(--color-error)]"
          >
            {errorMessage}
          </div>
        ) : receipt ? (
          <DigitalReceiptCard receipt={receipt} />
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

export default function PengelolaDepositReceiptPage() {
  return (
    <RoleGuard allowedRole="pengelola">
      <ReceiptPageContent />
    </RoleGuard>
  );
}
