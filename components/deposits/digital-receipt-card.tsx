"use client";

import type { DepositReceipt } from "@/lib/api/deposits";
import {
  formatEstimatedCO2eGrams,
  formatRupiah,
  formatWeightGrams,
} from "@/lib/format/units";

interface DigitalReceiptCardProps {
  receipt: DepositReceipt;
  onClose?: () => void;
}

function formatDateTimeId(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DigitalReceiptCard({ receipt, onClose }: DigitalReceiptCardProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <article
      aria-label="Struk Digital Setoran Sampah"
      className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-[var(--space-md)] border-b border-[var(--color-rule)] pb-[var(--space-md)]">
        <div className="space-y-[var(--space-2xs)]">
          <p className="text-[var(--text-lg)] font-semibold text-[var(--color-ink)]">
            Struk Digital Setoran
          </p>
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
            {receipt.bank_sampah_name || "Unit Bank Sampah"}
            {receipt.bank_sampah_code ? ` (${receipt.bank_sampah_code})` : ""}
          </p>
          <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
            No. {receipt.receipt_number || receipt.deposit_id.slice(0, 8).toUpperCase()} ·{" "}
            {formatDateTimeId(receipt.client_recorded_at)}
          </p>
        </div>
        <span className="pressed-seal text-[var(--text-xs)]">Tercatat</span>
      </header>

      <dl className="grid gap-[var(--space-sm)] rounded-[var(--radius-card)] bg-[var(--color-paper-2)] p-[var(--space-md)] text-[var(--text-sm)] sm:grid-cols-2">
        <div>
          <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Nasabah</dt>
          <dd className="font-medium text-[var(--color-ink)]">{receipt.nasabah_name}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Wilayah</dt>
          <dd className="text-[var(--color-ink-2)]">
            {receipt.nasabah_rw ? `RW ${receipt.nasabah_rw}` : "RW —"}
            {receipt.nasabah_rt ? ` / RT ${receipt.nasabah_rt}` : ""}
          </dd>
        </div>
        {receipt.recorded_by_name ? (
          <div>
            <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Dicatat oleh</dt>
            <dd className="text-[var(--color-ink-2)]">{receipt.recorded_by_name}</dd>
          </div>
        ) : null}
        {receipt.notes ? (
          <div>
            <dt className="text-[var(--text-xs)] text-[var(--color-muted)]">Catatan</dt>
            <dd className="text-[var(--color-ink-2)]">{receipt.notes}</dd>
          </div>
        ) : null}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[var(--text-sm)]">
          <thead>
            <tr className="border-b border-[var(--color-rule)] text-[var(--text-xs)] text-[var(--color-muted)]">
              <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">Jenis Sampah</th>
              <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">Berat</th>
              <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">Harga/kg</th>
              <th className="py-[var(--space-xs)] pr-[var(--space-sm)] text-right font-medium">
                Subtotal
              </th>
              <th className="py-[var(--space-xs)] text-right font-medium">
                Estimasi CO₂e terhindar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-rule)]">
            {receipt.lines.map((line, index) => (
              <tr key={`${line.material_name}-${index}`}>
                <td className="py-[var(--space-sm)] pr-[var(--space-sm)] font-medium text-[var(--color-ink)]">
                  {line.material_name}
                </td>
                <td className="num py-[var(--space-sm)] pr-[var(--space-sm)] text-[var(--color-ink-2)]">
                  {formatWeightGrams(line.weight_grams)}
                </td>
                <td className="num py-[var(--space-sm)] pr-[var(--space-sm)] text-[var(--color-ink-2)]">
                  {formatRupiah(line.price_per_kg_idr)}
                </td>
                <td className="num py-[var(--space-sm)] pr-[var(--space-sm)] text-right font-medium text-[var(--color-ink)]">
                  {formatRupiah(line.subtotal_idr)}
                </td>
                <td className="num py-[var(--space-sm)] text-right text-[var(--color-accent-2)]">
                  {formatEstimatedCO2eGrams(line.estimated_co2e_grams)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-md)] border-t border-[var(--color-rule-2)] pt-[var(--space-md)]">
        <div>
          <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
            Total nilai setoran ({formatWeightGrams(receipt.total_weight_grams)})
          </p>
          <p className="fig text-[var(--text-xl)] font-semibold text-[var(--color-ink)]">
            {formatRupiah(receipt.total_amount_idr)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
            Estimasi emisi terhindar (WARM v16)
          </p>
          <p className="fig text-[var(--text-lg)] font-semibold text-[var(--color-accent-2)]">
            {formatEstimatedCO2eGrams(receipt.total_estimated_co2e_grams)}
          </p>
        </div>
      </div>

      <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
        {receipt.methodology_note ||
          "Catatan: Nilai emisi CO₂e merupakan estimasi berdasarkan faktor US EPA WARM v16, bukan pengukuran sensor fisik."}
      </p>

      <div className="flex flex-wrap items-center gap-[var(--space-sm)] print:hidden">
        <button type="button" onClick={handlePrint} className="btn btn--ink">
          Cetak Struk
        </button>
        {onClose ? (
          <button type="button" onClick={onClose} className="btn btn--card">
            Tutup
          </button>
        ) : null}
      </div>
    </article>
  );
}
