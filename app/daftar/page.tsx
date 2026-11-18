"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { registerTenant } from "@/lib/api/auth";
import type { RegisterTenantRequest } from "@/lib/auth/types";

const INITIAL_FORM: RegisterTenantRequest = {
  name: "",
  code: "",
  address: "",
  rw: "",
  rt: "",
  kelurahan: "",
  kecamatan: "",
  kabupaten_kota: "",
  provinsi: "",
  contact_phone: "",
  pengelola_full_name: "",
  pengelola_username: "",
  pengelola_email: "",
  pengelola_password: "",
  pengelola_phone: "",
};

export default function DaftarPage() {
  const router = useRouter();
  const { applyTokenPair } = useAuth();

  const [form, setForm] = useState<RegisterTenantRequest>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof RegisterTenantRequest>(
    key: K,
    value: RegisterTenantRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (
      !form.name.trim() ||
      !form.code.trim() ||
      !form.address.trim() ||
      !form.rw.trim() ||
      !form.kelurahan.trim() ||
      !form.kecamatan.trim() ||
      !form.kabupaten_kota.trim() ||
      !form.provinsi.trim() ||
      !form.pengelola_full_name.trim() ||
      !form.pengelola_username.trim() ||
      !form.pengelola_email.trim() ||
      form.pengelola_password.length < 8
    ) {
      setErrorMessage(
        "Lengkapi seluruh kolom wajib bank sampah dan akun Pengelola (kata sandi minimal 8 karakter).",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RegisterTenantRequest = {
        ...form,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        rw: form.rw.trim(),
        rt: form.rt?.trim() || undefined,
        kelurahan: form.kelurahan.trim(),
        kecamatan: form.kecamatan.trim(),
        kabupaten_kota: form.kabupaten_kota.trim(),
        provinsi: form.provinsi.trim(),
        contact_phone: form.contact_phone?.trim() || undefined,
        pengelola_full_name: form.pengelola_full_name.trim(),
        pengelola_username: form.pengelola_username.trim(),
        pengelola_email: form.pengelola_email.trim(),
        pengelola_phone: form.pengelola_phone?.trim() || undefined,
      };

      const result = await registerTenant(payload);
      if ("access_token" in result && result.access_token && result.refresh_token) {
        await applyTokenPair(result);
        router.push("/pengelola");
        return;
      }

      setSuccessMessage(
        `Bank Sampah ${payload.name} (${payload.code}) berhasil didaftarkan. Silakan masuk menggunakan akun Pengelola Anda.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Pendaftaran bank sampah gagal diproses.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <SiteHeader activePath="/daftar" />

      <main className="flex-1 py-[var(--space-2xl)]">
        <div className="container space-y-[var(--space-xl)]">
          <header className="space-y-[var(--space-sm)]">
            <h1>Daftarkan Bank Sampah RW</h1>
            <p className="lead text-[var(--color-ink-2)]">
              Buat ruang kerja multi-tenant tersendiri untuk unit bank sampah RW dan akun Pengelola
              utama.
            </p>
          </header>

          {errorMessage ? (
            <div
              role="alert"
              className="stock border-l-4 border-[var(--color-error)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-error)]"
            >
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="stock space-y-[var(--space-md)] border-l-4 border-[var(--color-success)] p-[var(--space-xl)]">
              <p className="text-[var(--text-md)] font-medium text-[var(--color-ink)]">
                {successMessage}
              </p>
              <Link href="/login" className="btn btn--ink">
                Masuk Sekarang
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-[var(--space-xl)] lg:grid-cols-2" noValidate>
              <section className="stock space-y-[var(--space-md)] p-[var(--space-xl)]">
                <h2>Profil Bank Sampah</h2>

                <div className="grid gap-[var(--space-md)] sm:grid-cols-2">
                  <div className="space-y-[var(--space-2xs)] sm:col-span-2">
                    <label htmlFor="tenant-name" className="block text-[var(--text-sm)] font-medium">
                      Nama Bank Sampah
                    </label>
                    <input
                      id="tenant-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Contoh: Bank Sampah Melati RW 05"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-code" className="block text-[var(--text-sm)] font-medium">
                      Kode Unik Bank Sampah
                    </label>
                    <input
                      id="tenant-code"
                      type="text"
                      value={form.code}
                      onChange={(e) => updateField("code", e.target.value)}
                      placeholder="Contoh: BSM-RW05"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-phone" className="block text-[var(--text-sm)] font-medium">
                      Telepon Pos RW (Opsional)
                    </label>
                    <input
                      id="tenant-phone"
                      type="tel"
                      value={form.contact_phone ?? ""}
                      onChange={(e) => updateField("contact_phone", e.target.value)}
                      placeholder="081234567890"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)] sm:col-span-2">
                    <label htmlFor="tenant-address" className="block text-[var(--text-sm)] font-medium">
                      Alamat Lengkap
                    </label>
                    <input
                      id="tenant-address"
                      type="text"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Jl. Melati No. 12"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-rw" className="block text-[var(--text-sm)] font-medium">
                      RW
                    </label>
                    <input
                      id="tenant-rw"
                      type="text"
                      value={form.rw}
                      onChange={(e) => updateField("rw", e.target.value)}
                      placeholder="05"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-rt" className="block text-[var(--text-sm)] font-medium">
                      RT (Opsional)
                    </label>
                    <input
                      id="tenant-rt"
                      type="text"
                      value={form.rt ?? ""}
                      onChange={(e) => updateField("rt", e.target.value)}
                      placeholder="02"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-kelurahan" className="block text-[var(--text-sm)] font-medium">
                      Kelurahan
                    </label>
                    <input
                      id="tenant-kelurahan"
                      type="text"
                      value={form.kelurahan}
                      onChange={(e) => updateField("kelurahan", e.target.value)}
                      placeholder="Lowokwaru"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-kecamatan" className="block text-[var(--text-sm)] font-medium">
                      Kecamatan
                    </label>
                    <input
                      id="tenant-kecamatan"
                      type="text"
                      value={form.kecamatan}
                      onChange={(e) => updateField("kecamatan", e.target.value)}
                      placeholder="Lowokwaru"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-kota" className="block text-[var(--text-sm)] font-medium">
                      Kabupaten / Kota
                    </label>
                    <input
                      id="tenant-kota"
                      type="text"
                      value={form.kabupaten_kota}
                      onChange={(e) => updateField("kabupaten_kota", e.target.value)}
                      placeholder="Kota Malang"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="tenant-provinsi" className="block text-[var(--text-sm)] font-medium">
                      Provinsi
                    </label>
                    <input
                      id="tenant-provinsi"
                      type="text"
                      value={form.provinsi}
                      onChange={(e) => updateField("provinsi", e.target.value)}
                      placeholder="Jawa Timur"
                      className="field-input w-full"
                    />
                  </div>
                </div>
              </section>

              <section className="stock flex flex-col justify-between gap-[var(--space-lg)] p-[var(--space-xl)]">
                <div className="space-y-[var(--space-md)]">
                  <h2>Akun Pengelola Utama</h2>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="pengelola-name" className="block text-[var(--text-sm)] font-medium">
                      Nama Lengkap Pengelola
                    </label>
                    <input
                      id="pengelola-name"
                      type="text"
                      value={form.pengelola_full_name}
                      onChange={(e) => updateField("pengelola_full_name", e.target.value)}
                      placeholder="Budi Santoso"
                      autoComplete="name"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="pengelola-username" className="block text-[var(--text-sm)] font-medium">
                      Username Pengelola
                    </label>
                    <input
                      id="pengelola-username"
                      type="text"
                      value={form.pengelola_username}
                      onChange={(e) => updateField("pengelola_username", e.target.value)}
                      placeholder="admin_melati"
                      autoComplete="username"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="pengelola-email" className="block text-[var(--text-sm)] font-medium">
                      Email Pengelola
                    </label>
                    <input
                      id="pengelola-email"
                      type="email"
                      value={form.pengelola_email}
                      onChange={(e) => updateField("pengelola_email", e.target.value)}
                      placeholder="admin@melati.id"
                      autoComplete="email"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="pengelola-phone" className="block text-[var(--text-sm)] font-medium">
                      Nomor HP Pengelola (Opsional)
                    </label>
                    <input
                      id="pengelola-phone"
                      type="tel"
                      value={form.pengelola_phone ?? ""}
                      onChange={(e) => updateField("pengelola_phone", e.target.value)}
                      placeholder="081234567890"
                      autoComplete="tel"
                      className="field-input w-full"
                    />
                  </div>

                  <div className="space-y-[var(--space-2xs)]">
                    <label htmlFor="pengelola-password" className="block text-[var(--text-sm)] font-medium">
                      Kata Sandi (minimal 8 karakter)
                    </label>
                    <input
                      id="pengelola-password"
                      type="password"
                      value={form.pengelola_password}
                      onChange={(e) => updateField("pengelola_password", e.target.value)}
                      autoComplete="new-password"
                      className="field-input w-full"
                    />
                  </div>
                </div>

                <div className="space-y-[var(--space-sm)] border-t border-[var(--color-rule)] pt-[var(--space-md)]">
                  <button type="submit" disabled={isSubmitting} className="btn btn--ink w-full">
                    {isSubmitting ? "Mendaftarkan…" : "Daftarkan Bank Sampah"}
                  </button>
                  <p className="text-center text-[var(--text-xs)] text-[var(--color-muted)]">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="text-[var(--color-accent-2)]">
                      Masuk di sini
                    </Link>
                  </p>
                </div>
              </section>
            </form>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
