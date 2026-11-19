"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";
import { DigitalReceiptCard } from "@/components/deposits/digital-receipt-card";
import { QrLookupModal } from "@/components/pengelola/qr-lookup-modal";
import { PENGELOLA_NAV } from "@/app/pengelola/page";
import { ApiError } from "@/lib/api/client";
import {
  calculateEstimatedCo2eGrams,
  calculateLineSubtotalIdr,
  createDeposit,
  getDepositReceipt,
  listDeposits,
  type DepositReceipt,
  type DepositRecord,
} from "@/lib/api/deposits";
import {
  listCarbonFactors,
  listMaterials,
  type CarbonFactorOption,
  type MaterialItem,
} from "@/lib/api/materials";
import { listNasabah, type NasabahItem } from "@/lib/api/nasabah";
import {
  formatEstimatedCO2eGrams,
  formatRupiah,
  formatWeightGrams,
} from "@/lib/format/units";
import {
  cacheReferenceData,
  enqueueOfflineDeposit,
  getCachedReferenceData,
  listOfflineDeposits,
  removeOfflineDeposit,
  type QueuedDeposit,
} from "@/lib/offline/db";
import { flushDepositOutbox, generateIdempotencyKey } from "@/lib/offline/sync";

interface DraftLine {
  key: string;
  materialId: string;
  weightGramsInput: string;
}

function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

function getMaterialPrice(material: MaterialItem): number {
  return material.current_price_per_kg_idr ?? material.price_per_kg_idr ?? 0;
}

function formatDateTimeShort(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function createEmptyLine(): DraftLine {
  return {
    key: generateIdempotencyKey(),
    materialId: "",
    weightGramsInput: "",
  };
}

function subscribeOnlineStatus(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getOnlineServerSnapshot(): boolean {
  return true;
}

function DepositsWorkspaceContent() {
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [nasabahList, setNasabahList] = useState<NasabahItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [factors, setFactors] = useState<CarbonFactorOption[]>([]);
  const [lastCachedAt, setLastCachedAt] = useState<string | null>(null);

  const [outbox, setOutbox] = useState<QueuedDeposit[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<DepositRecord[]>([]);

  const [nasabahSearch, setNasabahSearch] = useState("");
  const [selectedNasabahId, setSelectedNasabahId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() => [createEmptyLine()]);

  const [showQrModal, setShowQrModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<DepositReceipt | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const factorById = useMemo(
    () => new Map(factors.map((f) => [f.id, f])),
    [factors],
  );

  const materialById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials],
  );

  const activeMaterials = useMemo(
    () => materials.filter((m) => m.is_active !== false),
    [materials],
  );

  const filteredNasabah = useMemo(() => {
    const q = nasabahSearch.trim().toLowerCase();
    const active = nasabahList.filter((n) => n.is_active !== false);
    if (!q) return active;
    return active.filter(
      (n) =>
        n.full_name.toLowerCase().includes(q) ||
        n.username.toLowerCase().includes(q) ||
        `rw ${n.rw}`.toLowerCase().includes(q),
    );
  }, [nasabahList, nasabahSearch]);

  const selectedNasabah = useMemo(
    () => nasabahList.find((n) => n.id === selectedNasabahId) ?? null,
    [nasabahList, selectedNasabahId],
  );

  const loadOutbox = useCallback(async () => {
    const items = await listOfflineDeposits().catch(() => []);
    setOutbox(items);
    return items;
  }, []);

  const loadRemoteData = useCallback(async () => {
    try {
      const [nasabahRes, matsRes, factorsRes, depositsRes] = await Promise.all([
        listNasabah({ limit: 200, offset: 0 }),
        listMaterials(),
        listCarbonFactors().catch(() => []),
        listDeposits({ limit: 20, offset: 0 }).catch(() => ({
          items: [],
          total: 0,
          limit: 20,
          offset: 0,
        })),
      ]);

      setNasabahList(nasabahRes.items);
      setMaterials(matsRes);
      setFactors(factorsRes);
      setRecentDeposits(depositsRes.items);

      await cacheReferenceData({
        nasabah: nasabahRes.items,
        materials: matsRes,
        factors: factorsRes,
      });
      setLastCachedAt(new Date().toISOString());
    } catch {
      const cached = await getCachedReferenceData();
      if (cached.nasabah.length > 0 || cached.materials.length > 0) {
        setNasabahList(cached.nasabah);
        setMaterials(cached.materials);
        setFactors(cached.factors);
        setLastCachedAt(cached.lastCachedAt);
      } else {
        setErrorMessage(
          "Gagal memuat data nasabah & harga sampah. Periksa koneksi internet Anda.",
        );
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const handleSyncOutbox = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setErrorMessage("Perangkat masih offline. Sinkronisasi akan berjalan saat terhubung kembali.");
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const summary = await flushDepositOutbox();
      await loadOutbox();
      if (summary.total > 0) {
        const depositsRes = await listDeposits({ limit: 20, offset: 0 }).catch(() => null);
        if (depositsRes) {
          setRecentDeposits(depositsRes.items);
        }
        const syncedCount = summary.createdCount + summary.replayedCount;
        if (summary.errorCount > 0) {
          setErrorMessage(
            `${syncedCount} setoran tersinkron, ${summary.errorCount} setoran gagal. Periksa antrean offline.`,
          );
        } else {
          setFeedback(
            `Sinkronisasi selesai: ${summary.createdCount} setoran baru, ${summary.replayedCount} replay idempoten.`,
          );
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal menyinkronkan antrean offline.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [loadOutbox]);

  useEffect(() => {
    let active = true;

    async function init() {
      const initialOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      const queuedItems = await listOfflineDeposits().catch(() => []);
      if (active) {
        setOutbox(queuedItems);
      }

      if (initialOnline) {
        await loadRemoteData();
      } else {
        const cached = await getCachedReferenceData();
        if (active) {
          setNasabahList(cached.nasabah);
          setMaterials(cached.materials);
          setFactors(cached.factors);
          setLastCachedAt(cached.lastCachedAt);
          setIsLoadingData(false);
        }
      }
    }

    void init();

    function handleOnline() {
      void loadRemoteData();
      void handleSyncOutbox();
    }

    window.addEventListener("online", handleOnline);
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
    };
  }, [handleSyncOutbox, loadRemoteData]);

  const previewSummary = useMemo(() => {
    const linePreviews = lines.map((line) => {
      const material = materialById.get(line.materialId);
      const weight = parsePositiveInt(line.weightGramsInput) ?? 0;
      const pricePerKg = material ? getMaterialPrice(material) : 0;
      const factor = material?.emission_factor_id
        ? factorById.get(material.emission_factor_id)
        : undefined;
      const ppm = factor?.co2e_factor_ppm ?? 0;

      const subtotalIdr = calculateLineSubtotalIdr(weight, pricePerKg);
      const estimatedCo2eGrams = calculateEstimatedCo2eGrams(weight, ppm);

      return {
        key: line.key,
        material,
        weight,
        pricePerKg,
        ppm,
        subtotalIdr,
        estimatedCo2eGrams,
      };
    });

    const totalWeightGrams = linePreviews.reduce((sum, l) => sum + l.weight, 0);
    const totalAmountIdr = linePreviews.reduce((sum, l) => sum + l.subtotalIdr, 0);
    const totalEstimatedCo2eGrams = linePreviews.reduce(
      (sum, l) => sum + l.estimatedCo2eGrams,
      0,
    );

    return {
      linePreviews,
      totalWeightGrams,
      totalAmountIdr,
      totalEstimatedCo2eGrams,
    };
  }, [factorById, lines, materialById]);

  function addLine() {
    setLines((prev) => [...prev, createEmptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function queueLocally(params: {
    idempotencyKey: string;
    clientRecordedAt: string;
    nasabah: NasabahItem;
    validatedLines: Array<{
      material_type_id: string;
      material_name: string;
      weight_grams: number;
      price_per_kg_idr: number;
      co2e_factor_ppm: number;
    }>;
  }) {
    await enqueueOfflineDeposit({
      idempotency_key: params.idempotencyKey,
      client_recorded_at: params.clientRecordedAt,
      nasabah_id: params.nasabah.id,
      nasabah_name: params.nasabah.full_name,
      notes: notes.trim() || undefined,
      lines: params.validatedLines,
      total_weight_grams: previewSummary.totalWeightGrams,
      estimated_amount_idr: previewSummary.totalAmountIdr,
      estimated_co2e_grams: previewSummary.totalEstimatedCo2eGrams,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    await loadOutbox();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!selectedNasabah) {
      setErrorMessage("Pilih nasabah terlebih dahulu atau pindai QR nasabah.");
      return;
    }

    const validatedLines: Array<{
      material_type_id: string;
      material_name: string;
      weight_grams: number;
      price_per_kg_idr: number;
      co2e_factor_ppm: number;
    }> = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const material = materialById.get(line.materialId);
      if (!material) {
        setErrorMessage(`Pilih jenis sampah pada baris ${i + 1}.`);
        return;
      }
      const weight = parsePositiveInt(line.weightGramsInput);
      if (weight === null) {
        setErrorMessage(
          `Berat pada baris ${i + 1} harus berupa bilangan bulat gram (>= 1 g), tanpa desimal.`,
        );
        return;
      }
      const factor = material.emission_factor_id
        ? factorById.get(material.emission_factor_id)
        : undefined;
      validatedLines.push({
        material_type_id: material.id,
        material_name: material.name,
        weight_grams: weight,
        price_per_kg_idr: getMaterialPrice(material),
        co2e_factor_ppm: factor?.co2e_factor_ppm ?? 0,
      });
    }

    const idempotencyKey = generateIdempotencyKey();
    const clientRecordedAt = new Date().toISOString();

    setIsSubmitting(true);
    try {
      if (!isOnline) {
        await queueLocally({
          idempotencyKey,
          clientRecordedAt,
          nasabah: selectedNasabah,
          validatedLines,
        });
        setFeedback(
          `Setoran untuk ${selectedNasabah.full_name} disimpan ke antrean offline (IndexedDB) dan akan disinkronkan saat online.`,
        );
        setLines([createEmptyLine()]);
        setNotes("");
        return;
      }

      try {
        const created = await createDeposit({
          nasabah_id: selectedNasabah.id,
          idempotency_key: idempotencyKey,
          client_recorded_at: clientRecordedAt,
          notes: notes.trim() || undefined,
          lines: validatedLines.map((l) => ({
            material_type_id: l.material_type_id,
            weight_grams: l.weight_grams,
          })),
        });

        setFeedback(`Setoran untuk ${selectedNasabah.full_name} berhasil dicatat.`);
        setLines([createEmptyLine()]);
        setNotes("");

        const [depositsRes, receiptRes] = await Promise.all([
          listDeposits({ limit: 20, offset: 0 }).catch(() => null),
          getDepositReceipt(created.id).catch(() => null),
        ]);
        if (depositsRes) {
          setRecentDeposits(depositsRes.items);
        }
        if (receiptRes) {
          setActiveReceipt(receiptRes);
        }
      } catch (err) {
        // Queue to IndexedDB only when network/transport fails, not on 4xx validation rejection
        if (!(err instanceof ApiError)) {
          await queueLocally({
            idempotencyKey,
            clientRecordedAt,
            nasabah: selectedNasabah,
            validatedLines,
          });
          setFeedback(
            `Koneksi terganggu. Setoran untuk ${selectedNasabah.full_name} diamankan ke antrean offline (IndexedDB).`,
          );
          setLines([createEmptyLine()]);
          setNotes("");
        } else {
          setErrorMessage(err.message);
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mencatat setoran.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDiscardOutboxItem(idempotencyKey: string) {
    await removeOfflineDeposit(idempotencyKey);
    await loadOutbox();
  }

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola" navItems={PENGELOLA_NAV}>
      <div className="space-y-[var(--space-xl)]">
        <header className="stock flex flex-wrap items-center justify-between gap-[var(--space-md)] p-[var(--space-xl)]">
          <div className="space-y-[var(--space-2xs)]">
            <h1>Catat Setoran Sampah</h1>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Penimbangan dalam satuan gram bulat, dukungan antrean offline IndexedDB, dan Struk Digital.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-[var(--space-sm)]">
            <span
              className={
                isOnline
                  ? "rounded-[var(--radius-pill)] border border-[var(--color-success)] px-[var(--space-sm)] py-[var(--space-2xs)] text-[var(--text-xs)] font-medium text-[var(--color-success)]"
                  : "rounded-[var(--radius-pill)] border border-[var(--color-error)] px-[var(--space-sm)] py-[var(--space-2xs)] text-[var(--text-xs)] font-medium text-[var(--color-error)]"
              }
            >
              {isOnline ? "Terhubung (Online)" : "Mode Offline"}
            </span>
            {outbox.length > 0 ? (
              <button
                type="button"
                onClick={handleSyncOutbox}
                disabled={isSyncing || !isOnline}
                className="btn btn--accent"
              >
                {isSyncing
                  ? "Menyinkronkan..."
                  : `Sinkronkan Sekarang (${outbox.length})`}
              </button>
            ) : null}
          </div>
        </header>

        {lastCachedAt ? (
          <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
            Cache referensi offline (nasabah &amp; harga sampah): {nasabahList.length} nasabah,{" "}
            {activeMaterials.length} jenis sampah aktif · diperbarui {formatDateTimeShort(lastCachedAt)}.
          </p>
        ) : null}

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-[var(--radius-input)] border border-[var(--color-error)] bg-[var(--color-paper)] px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)] text-[var(--color-error)]"
          >
            {errorMessage}
          </p>
        ) : null}

        {feedback ? (
          <p
            role="status"
            className="rounded-[var(--radius-input)] border border-[var(--color-success)] bg-[var(--color-paper)] px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)] text-[var(--color-success)]"
          >
            {feedback}
          </p>
        ) : null}

        {activeReceipt ? (
          <section aria-label="Struk Digital Terbaru">
            <DigitalReceiptCard
              receipt={activeReceipt}
              onClose={() => setActiveReceipt(null)}
            />
          </section>
        ) : null}

        <section className="stock p-[var(--space-xl)]">
          <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">
            <div className="flex flex-wrap items-end justify-between gap-[var(--space-md)]">
              <div className="min-w-0 flex-1 space-y-[var(--space-xs)]">
                <label className="block text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                  1. Pilih Nasabah
                </label>
                <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
                  <input
                    type="search"
                    value={nasabahSearch}
                    onChange={(e) => setNasabahSearch(e.target.value)}
                    placeholder="Cari nama, username, atau RW..."
                    aria-label="Cari nasabah"
                    className="w-full rounded-[var(--radius-input)] border border-[var(--color-rule-2)] bg-[var(--color-cotton)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-ink)]"
                  />
                  <select
                    value={selectedNasabahId}
                    onChange={(e) => setSelectedNasabahId(e.target.value)}
                    aria-label="Daftar nasabah"
                    disabled={isLoadingData}
                    className="w-full rounded-[var(--radius-input)] border border-[var(--color-rule-2)] bg-[var(--color-cotton)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-ink)]"
                  >
                    <option value="">-- Pilih Nasabah ({filteredNasabah.length}) --</option>
                    {filteredNasabah.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.full_name} (RW {item.rw}
                        {item.rt ? `/RT ${item.rt}` : ""})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="btn btn--card"
              >
                Pindai / Cari QR Nasabah
              </button>
            </div>

            {selectedNasabah ? (
              <div className="rounded-[var(--radius-card)] bg-[var(--color-paper-2)] px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)]">
                Nasabah terpilih:{" "}
                <span className="font-semibold text-[var(--color-ink)]">
                  {selectedNasabah.full_name}
                </span>{" "}
                · RW {selectedNasabah.rw}
                {selectedNasabah.rt ? ` / RT ${selectedNasabah.rt}` : ""}
              </div>
            ) : null}

            <div className="space-y-[var(--space-md)]">
              <div className="flex flex-wrap items-center justify-between gap-[var(--space-sm)]">
                <h2 className="text-[var(--text-md)] font-semibold">
                  2. Rincian Timbangan (Gram Bulat)
                </h2>
                <button type="button" onClick={addLine} className="btn btn--card">
                  + Tambah Jenis Sampah
                </button>
              </div>

              <div className="space-y-[var(--space-sm)]">
                {lines.map((line, idx) => {
                  const preview = previewSummary.linePreviews[idx];
                  return (
                    <div
                      key={line.key}
                      className="grid gap-[var(--space-sm)] rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-[var(--space-md)] md:grid-cols-12 md:items-end"
                    >
                      <label className="block space-y-[var(--space-2xs)] md:col-span-5">
                        <span className="text-[var(--text-xs)] text-[var(--color-muted)]">
                          Jenis Sampah #{idx + 1}
                        </span>
                        <select
                          value={line.materialId}
                          onChange={(e) =>
                            updateLine(line.key, { materialId: e.target.value })
                          }
                          className="w-full rounded-[var(--radius-input)] border border-[var(--color-rule-2)] bg-[var(--color-cotton)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-ink)]"
                        >
                          <option value="">-- Pilih Jenis Sampah --</option>
                          {activeMaterials.map((mat) => (
                            <option key={mat.id} value={mat.id}>
                              {mat.name} ({formatRupiah(getMaterialPrice(mat))}/kg)
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-[var(--space-2xs)] md:col-span-3">
                        <span className="text-[var(--text-xs)] text-[var(--color-muted)]">
                          Berat (gram bulat)
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={line.weightGramsInput}
                          onChange={(e) =>
                            updateLine(line.key, { weightGramsInput: e.target.value })
                          }
                          placeholder="Contoh: 1500"
                          className="num w-full rounded-[var(--radius-input)] border border-[var(--color-rule-2)] bg-[var(--color-cotton)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-ink)]"
                        />
                      </label>

                      <div className="space-y-[var(--space-2xs)] text-[var(--text-xs)] md:col-span-3">
                        <p className="text-[var(--color-muted)]">
                          Setara:{" "}
                          <span className="num font-medium text-[var(--color-ink)]">
                            {formatWeightGrams(preview?.weight ?? 0)}
                          </span>
                        </p>
                        <p className="text-[var(--color-ink-2)]">
                          Pratinjau:{" "}
                          <span className="num font-semibold text-[var(--color-ink)]">
                            {formatRupiah(preview?.subtotalIdr ?? 0)}
                          </span>
                        </p>
                        <p className="text-[var(--color-accent-2)]">
                          Estimasi:{" "}
                          <span className="num font-medium">
                            {formatEstimatedCO2eGrams(preview?.estimatedCo2eGrams ?? 0)}
                          </span>
                        </p>
                      </div>

                      <div className="flex justify-end md:col-span-1">
                        {lines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            className="btn btn--card text-[var(--color-error)]"
                            aria-label={`Hapus baris ${idx + 1}`}
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="block space-y-[var(--space-2xs)]">
              <span className="text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
                Catatan Setoran (opsional)
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mis. kondisi botol bersih & sudah dipilah"
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-rule-2)] bg-[var(--color-cotton)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-ink)]"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)] border-t border-[var(--color-rule)] pt-[var(--space-md)]">
              <div className="flex flex-wrap gap-[var(--space-lg)]">
                <div>
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">Total Berat</p>
                  <p className="num text-[var(--text-lg)] font-semibold text-[var(--color-ink)]">
                    {formatWeightGrams(previewSummary.totalWeightGrams)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                    Pratinjau Total Nilai
                  </p>
                  <p className="num text-[var(--text-lg)] font-semibold text-[var(--color-ink)]">
                    {formatRupiah(previewSummary.totalAmountIdr)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                    Estimasi Emisi Terhindar (WARM v16)
                  </p>
                  <p className="num text-[var(--text-lg)] font-semibold text-[var(--color-accent-2)]">
                    {formatEstimatedCO2eGrams(previewSummary.totalEstimatedCo2eGrams)}
                  </p>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                {isSubmitting
                  ? "Menyimpan..."
                  : isOnline
                    ? "Catat Setoran"
                    : "Simpan ke Antrean Offline"}
              </button>
            </div>
          </form>
        </section>

        <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)]">
            <div>
              <h2 className="text-[var(--text-lg)] font-semibold">
                Antrean Offline (IndexedDB)
              </h2>
              <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                Setoran yang dicatat saat offline tersimpan di perangkat dan disinkronkan secara idempoten.
              </p>
            </div>
            {outbox.length > 0 ? (
              <button
                type="button"
                onClick={handleSyncOutbox}
                disabled={isSyncing || !isOnline}
                className="btn btn--ink"
              >
                {isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
              </button>
            ) : null}
          </div>

          {outbox.length === 0 ? (
            <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
              Tidak ada setoran tertunda di antrean offline.
            </p>
          ) : (
            <div className="space-y-[var(--space-sm)]">
              {outbox.map((item) => (
                <div
                  key={item.idempotency_key}
                  className="flex flex-wrap items-center justify-between gap-[var(--space-md)] rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-[var(--space-md)]"
                >
                  <div className="space-y-[var(--space-3xs)]">
                    <p className="text-[var(--text-sm)] font-semibold text-[var(--color-ink)]">
                      {item.nasabah_name} · {formatWeightGrams(item.total_weight_grams)} ·{" "}
                      {formatRupiah(item.estimated_amount_idr)}
                    </p>
                    <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                      Dicatat: {formatDateTimeShort(item.client_recorded_at)} · Status:{" "}
                      <span className="font-medium text-[var(--color-ink-2)]">{item.status}</span>
                    </p>
                    {item.error_message ? (
                      <p className="text-[var(--text-xs)] text-[var(--color-error)]">
                        {item.error_message}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDiscardOutboxItem(item.idempotency_key)}
                    className="btn btn--card text-[var(--color-error)]"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)]">
            <h2 className="text-[var(--text-lg)] font-semibold">Riwayat Setoran Terbaru</h2>
            <span className="text-[var(--text-xs)] text-[var(--color-muted)]">
              Menampilkan {recentDeposits.length} setoran terbaru
            </span>
          </div>

          {recentDeposits.length === 0 ? (
            <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
              Belum ada setoran tercatat pada sesi ini atau perangkat sedang offline.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                <thead>
                  <tr className="border-b border-[var(--color-rule)] text-[var(--text-xs)] text-[var(--color-muted)]">
                    <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">Waktu</th>
                    <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">Nasabah</th>
                    <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">Berat</th>
                    <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">Nilai</th>
                    <th className="py-[var(--space-xs)] pr-[var(--space-sm)] font-medium">
                      Estimasi CO₂e
                    </th>
                    <th className="py-[var(--space-xs)] text-right font-medium">Struk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {recentDeposits.map((dep) => {
                    const co2e =
                      dep.total_estimated_co2e_grams ?? dep.estimated_co2e_grams ?? 0;
                    return (
                      <tr key={dep.id}>
                        <td className="py-[var(--space-sm)] pr-[var(--space-sm)] text-[var(--color-ink-2)]">
                          {formatDateTimeShort(dep.client_recorded_at || dep.created_at)}
                        </td>
                        <td className="py-[var(--space-sm)] pr-[var(--space-sm)] font-medium text-[var(--color-ink)]">
                          {dep.nasabah_name || dep.nasabah_username || dep.nasabah_id.slice(0, 8)}
                        </td>
                        <td className="num py-[var(--space-sm)] pr-[var(--space-sm)] text-[var(--color-ink-2)]">
                          {formatWeightGrams(dep.total_weight_grams)}
                        </td>
                        <td className="num py-[var(--space-sm)] pr-[var(--space-sm)] font-medium text-[var(--color-ink)]">
                          {formatRupiah(dep.total_amount_idr)}
                        </td>
                        <td className="num py-[var(--space-sm)] pr-[var(--space-sm)] text-[var(--color-accent-2)]">
                          {formatEstimatedCO2eGrams(co2e)}
                        </td>
                        <td className="py-[var(--space-sm)] text-right">
                          <Link
                            href={`/pengelola/deposits/${encodeURIComponent(dep.id)}/receipt`}
                            className="btn btn--card"
                          >
                            Lihat Struk
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showQrModal ? (
        <QrLookupModal
          isOnline={isOnline}
          cachedNasabah={nasabahList}
          onSelectNasabah={(nasabah) => {
            setSelectedNasabahId(nasabah.id);
            setFeedback(`Nasabah ditemukan via QR: ${nasabah.full_name} (RW ${nasabah.rw}).`);
          }}
          onClose={() => setShowQrModal(false)}
        />
      ) : null}
    </WorkspaceShell>
  );
}

export default function PengelolaDepositsPage() {
  return (
    <RoleGuard allowedRole="pengelola">
      <DepositsWorkspaceContent />
    </RoleGuard>
  );
}
