"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/auth/workspace-shell";
import { PENGELOLA_NAV } from "@/app/pengelola/page";
import {
  createNasabah,
  listNasabah,
  regenerateNasabahQr,
  resetNasabahPassword,
  resetNasabahPin,
  updateNasabah,
  type NasabahItem,
} from "@/lib/api/nasabah";

function NasabahManagementContent() {
  const { tenant } = useAuth();

  const [items, setItems] = useState<NasabahItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [rwFilter, setRwFilter] = useState("");
  const [rtFilter, setRtFilter] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<NasabahItem | null>(null);
  const [qrItem, setQrItem] = useState<NasabahItem | null>(null);
  const [securityItem, setSecurityItem] = useState<NasabahItem | null>(null);

  // Create form state
  const [createFullName, setCreateFullName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRw, setCreateRw] = useState(tenant?.rw ?? "");
  const [createRt, setCreateRt] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createPin, setCreatePin] = useState("");

  // Edit form state
  const [editFullName, setEditFullName] = useState("");
  const [editRw, setEditRw] = useState("");
  const [editRt, setEditRt] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editActive, setEditActive] = useState(true);

  // Security reset state
  const [newPin, setNewPin] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNasabah = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await listNasabah({
        search: search.trim() || undefined,
        rw: rwFilter.trim() || undefined,
        rt: rtFilter.trim() || undefined,
        limit: 50,
        offset: 0,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat daftar nasabah.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, rwFilter, rtFilter]);

  useEffect(() => {
    let active = true;
    async function fetchFiltered() {
      try {
        const res = await listNasabah({
          search: search.trim() || undefined,
          rw: rwFilter.trim() || undefined,
          rt: rtFilter.trim() || undefined,
          limit: 50,
          offset: 0,
        });
        if (active) {
          setItems(res.items);
          setTotal(res.total);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Gagal memuat daftar nasabah.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void fetchFiltered();
    return () => {
      active = false;
    };
  }, [search, rwFilter, rtFilter]);

  function openEdit(item: NasabahItem) {
    setEditingItem(item);
    setEditFullName(item.full_name);
    setEditRw(item.rw);
    setEditRt(item.rt ?? "");
    setEditPhone(item.phone ?? "");
    setEditEmail(item.email ?? "");
    setEditAddress(item.address_notes ?? "");
    setEditActive(item.is_active);
    setShowCreateForm(false);
    setQrItem(null);
    setSecurityItem(null);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (
      !createFullName.trim() ||
      createUsername.trim().length < 3 ||
      createPassword.length < 8 ||
      !createRw.trim()
    ) {
      setErrorMessage(
        "Nama lengkap, username (min. 3 karakter), kata sandi (min. 8 karakter), dan RW wajib diisi.",
      );
      return;
    }

    if (createPin.trim() && !/^\d{6}$/.test(createPin.trim())) {
      setErrorMessage("PIN opsional harus terdiri dari tepat 6 digit angka.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createNasabah({
        full_name: createFullName.trim(),
        username: createUsername.trim(),
        password: createPassword,
        rw: createRw.trim(),
        rt: createRt.trim() || undefined,
        phone: createPhone.trim() || undefined,
        email: createEmail.trim() || undefined,
        address_notes: createAddress.trim() || undefined,
        pin: createPin.trim() || undefined,
      });
      setFeedback(`Nasabah ${created.full_name} berhasil ditambahkan beserta token QR.`);
      setShowCreateForm(false);
      setCreateFullName("");
      setCreateUsername("");
      setCreatePassword("");
      setCreateRt("");
      setCreatePhone("");
      setCreateEmail("");
      setCreateAddress("");
      setCreatePin("");
      setQrItem(created);
      await loadNasabah();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menambah nasabah.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) return;
    setErrorMessage(null);
    setFeedback(null);

    if (!editFullName.trim() || !editRw.trim()) {
      setErrorMessage("Nama lengkap dan RW wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateNasabah(editingItem.id, {
        full_name: editFullName.trim(),
        rw: editRw.trim(),
        rt: editRt.trim() || undefined,
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        address_notes: editAddress.trim() || undefined,
        is_active: editActive,
      });
      setFeedback(`Data nasabah ${editFullName.trim()} berhasil diperbarui.`);
      setEditingItem(null);
      await loadNasabah();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memperbarui data nasabah.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegenerateQr(item: NasabahItem) {
    setErrorMessage(null);
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await regenerateNasabahQr(item.id);
      const updated = { ...item, qr_token: res.qr_token };
      setQrItem(updated);
      setFeedback(`Token QR untuk ${item.full_name} berhasil diperbarui.`);
      await loadNasabah();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memperbarui token QR.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!securityItem) return;
    setErrorMessage(null);
    setFeedback(null);

    if (!/^\d{6}$/.test(newPin.trim())) {
      setErrorMessage("PIN harus tepat 6 digit angka.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetNasabahPin(securityItem.id, newPin.trim());
      setFeedback(`PIN 6 digit untuk ${securityItem.full_name} berhasil diatur ulang.`);
      setNewPin("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengatur ulang PIN.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!securityItem) return;
    setErrorMessage(null);
    setFeedback(null);

    if (newPassword.length < 8) {
      setErrorMessage("Kata sandi baru minimal 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetNasabahPassword(securityItem.id, newPassword);
      setFeedback(`Kata sandi untuk ${securityItem.full_name} berhasil diatur ulang.`);
      setNewPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengatur ulang kata sandi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <WorkspaceShell roleLabel="Ruang Kerja Pengelola" navItems={PENGELOLA_NAV}>
      <div className="space-y-[var(--space-xl)]">
        <header className="flex flex-wrap items-end justify-between gap-[var(--space-md)]">
          <div className="space-y-[var(--space-xs)]">
            <h1>Manajemen Nasabah</h1>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Kelola data warga RW, kartu QR setoran, serta reset PIN atau kata sandi nasabah.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setEditingItem(null);
              setQrItem(null);
              setSecurityItem(null);
            }}
            className="btn btn--ink"
          >
            {showCreateForm ? "Tutup Form Tambah" : "Tambah Nasabah"}
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
            <h2>Tambah Nasabah Baru</h2>
            <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-fullname" className="block text-[var(--text-sm)] font-medium">
                  Nama Lengkap *
                </label>
                <input
                  id="c-fullname"
                  type="text"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-username" className="block text-[var(--text-sm)] font-medium">
                  Username *
                </label>
                <input
                  id="c-username"
                  type="text"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-password" className="block text-[var(--text-sm)] font-medium">
                  Kata Sandi (min. 8) *
                </label>
                <input
                  id="c-password"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-rw" className="block text-[var(--text-sm)] font-medium">
                  RW *
                </label>
                <input
                  id="c-rw"
                  type="text"
                  value={createRw}
                  onChange={(e) => setCreateRw(e.target.value)}
                  placeholder="05"
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-rt" className="block text-[var(--text-sm)] font-medium">
                  RT
                </label>
                <input
                  id="c-rt"
                  type="text"
                  value={createRt}
                  onChange={(e) => setCreateRt(e.target.value)}
                  placeholder="01"
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-pin" className="block text-[var(--text-sm)] font-medium">
                  PIN 6 Digit (Opsional)
                </label>
                <input
                  id="c-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value)}
                  placeholder="123456"
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-phone" className="block text-[var(--text-sm)] font-medium">
                  No. HP
                </label>
                <input
                  id="c-phone"
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-email" className="block text-[var(--text-sm)] font-medium">
                  Email
                </label>
                <input
                  id="c-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="c-address" className="block text-[var(--text-sm)] font-medium">
                  Catatan Alamat
                </label>
                <input
                  id="c-address"
                  type="text"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  className="field-input w-full"
                />
              </div>
            </div>
            <div className="flex gap-[var(--space-sm)]">
              <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                {isSubmitting ? "Menyimpan…" : "Simpan Nasabah"}
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

        {editingItem ? (
          <form
            onSubmit={handleEditSubmit}
            className="stock space-y-[var(--space-md)] p-[var(--space-xl)]"
            noValidate
          >
            <h2>Ubah Profil Nasabah: {editingItem.full_name}</h2>
            <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="e-fullname" className="block text-[var(--text-sm)] font-medium">
                  Nama Lengkap *
                </label>
                <input
                  id="e-fullname"
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="e-rw" className="block text-[var(--text-sm)] font-medium">
                  RW *
                </label>
                <input
                  id="e-rw"
                  type="text"
                  value={editRw}
                  onChange={(e) => setEditRw(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="e-rt" className="block text-[var(--text-sm)] font-medium">
                  RT
                </label>
                <input
                  id="e-rt"
                  type="text"
                  value={editRt}
                  onChange={(e) => setEditRt(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="e-phone" className="block text-[var(--text-sm)] font-medium">
                  No. HP
                </label>
                <input
                  id="e-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="e-email" className="block text-[var(--text-sm)] font-medium">
                  Email
                </label>
                <input
                  id="e-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="e-address" className="block text-[var(--text-sm)] font-medium">
                  Catatan Alamat
                </label>
                <input
                  id="e-address"
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
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
              Akun nasabah aktif
            </label>
            <div className="flex gap-[var(--space-sm)]">
              <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                {isSubmitting ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="btn btn--card"
              >
                Tutup
              </button>
            </div>
          </form>
        ) : null}

        {qrItem ? (
          <section
            aria-label="Kartu QR Nasabah"
            className="stock space-y-[var(--space-md)] p-[var(--space-xl)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-[var(--space-md)]">
              <div>
                <h2>Kartu QR Nasabah</h2>
                <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  {tenant ? `${tenant.name} (${tenant.code})` : "Setor Hijau"} · RW {qrItem.rw}
                  {qrItem.rt ? ` / RT ${qrItem.rt}` : ""}
                </p>
              </div>
              <span className="pressed-seal text-[var(--text-xs)]">Kartu Resmi</span>
            </div>

            <div className="groove space-y-[var(--space-xs)] p-[var(--space-lg)]">
              <p className="text-[var(--text-lg)] font-semibold text-[var(--color-ink)]">
                {qrItem.full_name}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                Username: <span className="fig">{qrItem.username}</span>
              </p>
              <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                Token QR:{" "}
                <code className="fig font-semibold text-[var(--color-ink)]">
                  {qrItem.qr_token ?? "Belum tersedia"}
                </code>
              </p>
            </div>

            <div className="flex flex-wrap gap-[var(--space-sm)]">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn--ink"
              >
                Cetak Kartu QR
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleRegenerateQr(qrItem)}
                className="btn btn--card"
              >
                Regenerasi Token QR
              </button>
              <button
                type="button"
                onClick={() => setQrItem(null)}
                className="btn btn--card"
              >
                Tutup
              </button>
            </div>
          </section>
        ) : null}

        {securityItem ? (
          <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
            <div className="flex items-center justify-between gap-[var(--space-md)]">
              <h2>Reset Keamanan: {securityItem.full_name}</h2>
              <button
                type="button"
                onClick={() => setSecurityItem(null)}
                className="btn btn--card"
              >
                Tutup
              </button>
            </div>

            <div className="grid gap-[var(--space-lg)] md:grid-cols-2">
              <form onSubmit={handleResetPin} className="space-y-[var(--space-sm)]" noValidate>
                <label htmlFor="reset-pin" className="block text-[var(--text-sm)] font-medium">
                  Atur Ulang PIN 6 Digit
                </label>
                <input
                  id="reset-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="6 digit angka"
                  className="field-input w-full"
                />
                <button type="submit" disabled={isSubmitting} className="btn btn--ink">
                  Simpan PIN Baru
                </button>
              </form>

              <form onSubmit={handleResetPassword} className="space-y-[var(--space-sm)]" noValidate>
                <label htmlFor="reset-pw" className="block text-[var(--text-sm)] font-medium">
                  Atur Ulang Kata Sandi (min. 8)
                </label>
                <input
                  id="reset-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="field-input w-full"
                />
                <button type="submit" disabled={isSubmitting} className="btn btn--card">
                  Simpan Kata Sandi Baru
                </button>
              </form>
            </div>
          </section>
        ) : null}

        <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
          <div className="grid gap-[var(--space-sm)] sm:grid-cols-4">
            <input
              type="search"
              aria-label="Cari nama atau username nasabah"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau username…"
              className="field-input sm:col-span-2"
            />
            <input
              type="text"
              aria-label="Filter RW"
              value={rwFilter}
              onChange={(e) => setRwFilter(e.target.value)}
              placeholder="Filter RW"
              className="field-input"
            />
            <input
              type="text"
              aria-label="Filter RT"
              value={rtFilter}
              onChange={(e) => setRtFilter(e.target.value)}
              placeholder="Filter RT"
              className="field-input"
            />
          </div>

          <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
            Menampilkan <span className="fig">{items.length}</span> dari{" "}
            <span className="fig">{total}</span> nasabah.
          </p>

          {isLoading ? (
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">Memuat data nasabah…</p>
          ) : items.length === 0 ? (
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Belum ada nasabah yang cocok dengan pencarian Anda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[var(--text-sm)]">
                <thead>
                  <tr className="border-b border-[var(--color-rule-2)] text-[var(--color-muted)]">
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">Nama</th>
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                      Username
                    </th>
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                      RW / RT
                    </th>
                    <th className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                      Status
                    </th>
                    <th className="py-[var(--space-sm)] font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-[var(--space-sm)] pr-[var(--space-md)] font-medium">
                        {item.full_name}
                      </td>
                      <td className="fig py-[var(--space-sm)] pr-[var(--space-md)] text-[var(--color-ink-2)]">
                        {item.username}
                      </td>
                      <td className="fig py-[var(--space-sm)] pr-[var(--space-md)] text-[var(--color-ink-2)]">
                        RW {item.rw}
                        {item.rt ? ` / RT ${item.rt}` : ""}
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
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQrItem(item);
                              setEditingItem(null);
                              setSecurityItem(null);
                            }}
                            className="text-[var(--text-xs)] font-medium text-[var(--color-ink)] underline"
                          >
                            Kartu QR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSecurityItem(item);
                              setQrItem(null);
                              setEditingItem(null);
                            }}
                            className="text-[var(--text-xs)] font-medium text-[var(--color-ink-2)] underline"
                          >
                            Reset PIN/Sandi
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}

export default function PengelolaNasabahPage() {
  return (
    <RoleGuard allowedRole="pengelola">
      <NasabahManagementContent />
    </RoleGuard>
  );
}
