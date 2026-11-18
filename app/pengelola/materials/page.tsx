"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";
import { PENGELOLA_NAV } from "@/app/pengelola/page";
import {
  appendMaterialPrice,
  createMaterial,
  listCarbonFactors,
  listMaterialPrices,
  listMaterials,
  updateMaterial,
  type CarbonFactorOption,
  type MaterialItem,
  type MaterialPriceEntry,
} from "@/lib/api/materials";
import { formatRupiah } from "@/lib/format/units";

const MATERIAL_CATEGORIES = ["plastik", "kertas", "logam", "kaca", "lainnya"];

function parsePositiveIntInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function MaterialsManagementContent() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [factors, setFactors] = useState<CarbonFactorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [priceMaterial, setPriceMaterial] = useState<MaterialItem | null>(null);
  const [priceHistory, setPriceHistory] = useState<MaterialPriceEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Create form
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState("plastik");
  const [createUnit, setCreateUnit] = useState("kg");
  const [createDescription, setCreateDescription] = useState("");
  const [createFactorId, setCreateFactorId] = useState("");
  const [createPriceInput, setCreatePriceInput] = useState("");

  // Edit metadata form
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("plastik");
  const [editUnit, setEditUnit] = useState("kg");
  const [editDescription, setEditDescription] = useState("");
  const [editFactorId, setEditFactorId] = useState("");
  const [editActive, setEditActive] = useState(true);

  // Append-only price update
  const [newPriceInput, setNewPriceInput] = useState("");

  const loadData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [mats, facs] = await Promise.all([
        listMaterials(),
        listCarbonFactors().catch(() => []),
      ]);
      setMaterials(mats);
      setFactors(facs);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat master data sampah.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [mats, facs] = await Promise.all([
          listMaterials(),
          listCarbonFactors().catch(() => []),
        ]);
        if (active) {
          setMaterials(mats);
          setFactors(facs);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Gagal memuat master data sampah.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  async function openPriceViewer(item: MaterialItem) {
    setPriceMaterial(item);
    setNewPriceInput(String(item.current_price_per_kg_idr ?? item.price_per_kg_idr ?? 0));
    setEditingMaterial(null);
    setShowCreateForm(false);
    setIsLoadingHistory(true);
    setErrorMessage(null);
    try {
      const history = await listMaterialPrices(item.id);
      setPriceHistory(history);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat riwayat harga material.",
      );
      setPriceHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function openEdit(item: MaterialItem) {
    setEditingMaterial(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit ?? "kg");
    setEditDescription(item.description ?? "");
    setEditFactorId(item.emission_factor_id ?? "");
    setEditActive(item.is_active);
    setShowCreateForm(false);
    setPriceMaterial(null);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    const parsedPrice = parsePositiveIntInput(createPriceInput);
    if (!createName.trim() || parsedPrice === null) {
      setErrorMessage("Nama jenis sampah dan harga integer Rupiah (>= 0) wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createMaterial({
        name: createName.trim(),
        category: createCategory,
        unit: createUnit.trim() || "kg",
        description: createDescription.trim() || undefined,
        emission_factor_id: createFactorId || undefined,
        price_per_kg_idr: parsedPrice,
      });
      setFeedback(
        `Jenis sampah "${created.name}" berhasil ditambahkan dengan harga awal ${formatRupiah(parsedPrice)}/kg.`,
      );
      setShowCreateForm(false);
      setCreateName("");
      setCreateDescription("");
      setCreateFactorId("");
      setCreatePriceInput("");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menambah jenis sampah.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMaterial) return;
    setErrorMessage(null);
    setFeedback(null);

    if (!editName.trim()) {
      setErrorMessage("Nama jenis sampah wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMaterial(editingMaterial.id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit.trim() || "kg",
        description: editDescription.trim() || undefined,
        emission_factor_id: editFactorId || undefined,
        is_active: editActive,
      });
      setFeedback(`Metadata "${editName.trim()}" berhasil diperbarui.`);
      setEditingMaterial(null);
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memperbarui metadata jenis sampah.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppendPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceMaterial) return;
    setErrorMessage(null);
    setFeedback(null);

    const parsedPrice = parsePositiveIntInput(newPriceInput);
    if (parsedPrice === null) {
      setErrorMessage("Harga baru harus berupa bilangan bulat Rupiah tanpa desimal.");
      return;
    }

    setIsSubmitting(true);
    try {
      await appendMaterialPrice(priceMaterial.id, parsedPrice);
      setFeedback(
        `Harga baru ${formatRupiah(parsedPrice)}/kg untuk "${priceMaterial.name}" berhasil ditambahkan ke riwayat.`,
      );
      const [history] = await Promise.all([listMaterialPrices(priceMaterial.id), loadData()]);
      setPriceHistory(history);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memperbarui harga.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola" navItems={PENGELOLA_NAV}>
      <div className="space-y-[var(--space-xl)]">
        <header className="flex flex-wrap items-end justify-between gap-[var(--space-md)]">
          <div className="space-y-[var(--space-xs)]">
            <h1>Master Jenis &amp; Harga Sampah</h1>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Kelola jenis sampah, tautkan faktor emisi WARM v16, dan catat pembaruan harga
              berbasis riwayat append-only dalam Rupiah bulat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setEditingMaterial(null);
              setPriceMaterial(null);
            }}
            className="btn btn--ink"
          >
            {showCreateForm ? "Tutup Form" : "Tambah Jenis Sampah"}
          </button>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="stock border-l-4 border-[var(--color-error)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-error)]"
          >
            {errorMessage}
          </div>
        ) : null}

        {feedback ? (
          <div className="stock border-l-4 border-[var(--color-success)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-ink)]">
            {feedback}
          </div>
        ) : null}

        {showCreateForm ? (
          <form
            onSubmit={handleCreateSubmit}
            className="stock space-y-[var(--space-md)] p-[var(--space-xl)]"
            noValidate
          >
            <h2>Tambah Jenis Sampah Baru</h2>
            <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="m-name" className="block text-[var(--text-sm)] font-medium">
                  Nama Material *
                </label>
                <input
                  id="m-name"
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Contoh: Botol PET Bening"
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="m-cat" className="block text-[var(--text-sm)] font-medium">
                  Kategori *
                </label>
                <select
                  id="m-cat"
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="field-input w-full"
                >
                  {MATERIAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="m-price" className="block text-[var(--text-sm)] font-medium">
                  Harga Awal per kg (Rp bulat) *
                </label>
                <input
                  id="m-price"
                  type="text"
                  inputMode="numeric"
                  value={createPriceInput}
                  onChange={(e) => setCreatePriceInput(e.target.value)}
                  placeholder="3500"
                  className="field-input fig w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="m-unit" className="block text-[var(--text-sm)] font-medium">
                  Satuan
                </label>
                <input
                  id="m-unit"
                  type="text"
                  value={createUnit}
                  onChange={(e) => setCreateUnit(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="m-factor" className="block text-[var(--text-sm)] font-medium">
                  Faktor Emisi WARM v16
                </label>
                <select
                  id="m-factor"
                  value={createFactorId}
                  onChange={(e) => setCreateFactorId(e.target.value)}
                  className="field-input w-full"
                >
                  <option value="">-- Pilih faktor (opsional) --</option>
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="m-desc" className="block text-[var(--text-sm)] font-medium">
                  Deskripsi
                </label>
                <input
                  id="m-desc"
                  type="text"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="field-input w-full"
                />
              </div>
            </div>
            <div className="flex gap-[var(--space-sm)]">
              <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                {isSubmitting ? "Menyimpan…" : "Simpan Jenis Sampah"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn btn--card"
              >
                Batal
              </button>
            </div>
          </form>
        ) : null}

        {editingMaterial ? (
          <form
            onSubmit={handleEditSubmit}
            className="stock space-y-[var(--space-md)] p-[var(--space-xl)]"
            noValidate
          >
            <h2>Ubah Metadata: {editingMaterial.name}</h2>
            <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="em-name" className="block text-[var(--text-sm)] font-medium">
                  Nama Material *
                </label>
                <input
                  id="em-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="em-cat" className="block text-[var(--text-sm)] font-medium">
                  Kategori *
                </label>
                <select
                  id="em-cat"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="field-input w-full"
                >
                  {MATERIAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="em-unit" className="block text-[var(--text-sm)] font-medium">
                  Satuan
                </label>
                <input
                  id="em-unit"
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="em-factor" className="block text-[var(--text-sm)] font-medium">
                  Faktor Emisi WARM v16
                </label>
                <select
                  id="em-factor"
                  value={editFactorId}
                  onChange={(e) => setEditFactorId(e.target.value)}
                  className="field-input w-full"
                >
                  <option value="">-- Tidak terhubung --</option>
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-[var(--space-2xs)] sm:col-span-2">
                <label htmlFor="em-desc" className="block text-[var(--text-sm)] font-medium">
                  Deskripsi
                </label>
                <input
                  id="em-desc"
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="field-input w-full"
                />
              </div>
            </div>
            <label className="flex items-center gap-[var(--space-xs)] text-[var(--text-sm)]">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              Material aktif untuk penimbangan
            </label>
            <div className="flex gap-[var(--space-sm)]">
              <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                {isSubmitting ? "Menyimpan…" : "Simpan Metadata"}
              </button>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="btn btn--card"
              >
                Tutup
              </button>
            </div>
          </form>
        ) : null}

        {priceMaterial ? (
          <section className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]">
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)]">
              <div>
                <h2>Harga &amp; Riwayat Append-Only: {priceMaterial.name}</h2>
                <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Setiap perubahan harga menambah baris baru tanpa menimpa riwayat harga setoran
                  lama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPriceMaterial(null)}
                className="btn btn--card"
              >
                Tutup
              </button>
            </div>

            <form
              onSubmit={handleAppendPrice}
              className="flex flex-wrap items-end gap-[var(--space-md)]"
              noValidate
            >
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="new-price-idr" className="block text-[var(--text-sm)] font-medium">
                  Harga Baru per kg (Rp bulat)
                </label>
                <input
                  id="new-price-idr"
                  type="text"
                  inputMode="numeric"
                  value={newPriceInput}
                  onChange={(e) => setNewPriceInput(e.target.value)}
                  className="field-input fig"
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                {isSubmitting ? "Menyimpan…" : "Tambahkan Harga Baru"}
              </button>
            </form>

            {isLoadingHistory ? (
              <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                Memuat riwayat harga…
              </p>
            ) : priceHistory.length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                Belum ada riwayat harga tercatat.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                  <thead>
                    <tr className="border-b border-[var(--color-rule-2)] text-[var(--color-muted)]">
                      <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                        Harga per kg
                      </th>
                      <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                        Berlaku Sejak
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-rule)]">
                    {priceHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td className="fig py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                          {formatRupiah(entry.price_per_kg_idr)}
                        </td>
                        <td className="fig py-[var(--space-sm)] pr-[var(--space-md)] text-[var(--color-ink-2)]">
                          {entry.effective_from || entry.created_at || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
          {isLoading ? (
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Memuat master data jenis sampah…
            </p>
          ) : materials.length === 0 ? (
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Belum ada jenis sampah terdaftar. Klik &ldquo;Tambah Jenis Sampah&rdquo; untuk
              memulai.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                <thead>
                  <tr className="border-b border-[var(--color-rule-2)] text-[var(--color-muted)]">
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">Nama</th>
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                      Kategori
                    </th>
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                      Harga Aktif / kg
                    </th>
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                      Status
                    </th>
                    <th className="py-[var(--space-sm)] font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {materials.map((item) => {
                    const activePrice = item.current_price_per_kg_idr ?? item.price_per_kg_idr ?? 0;
                    return (
                      <tr key={item.id}>
                        <td className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                          {item.name}
                        </td>
                        <td className="py-[var(--space-sm)] pr-[var(--space-md)] capitalize text-[var(--color-ink-2)]">
                          {item.category}
                        </td>
                        <td className="fig py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                          {formatRupiah(activePrice)}
                        </td>
                        <td className="py-[var(--space-sm)] pr-[var(--space-md)]">
                          {item.is_active ? "Aktif" : "Nonaktif"}
                        </td>
                        <td className="py-[var(--space-sm)]">
                          <div className="flex flex-wrap gap-[var(--space-xs)]">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="text-[var(--text-xs)] font-medium text-[var(--color-accent-2)] underline"
                            >
                              Ubah Metadata
                            </button>
                            <button
                              type="button"
                              onClick={() => void openPriceViewer(item)}
                              className="text-[var(--text-xs)] font-medium text-[var(--color-ink)] underline"
                            >
                              Harga &amp; Riwayat
                            </button>
                          </div>
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
    </WorkspaceShell>
  );
}

export default function PengelolaMaterialsPage() {
  return (
    <RoleGuard allowedRole="pengelola">
      <MaterialsManagementContent />
    </RoleGuard>
  );
}
