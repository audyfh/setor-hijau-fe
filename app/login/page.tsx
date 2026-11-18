"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { ApiError } from "@/lib/api/client";
import { loginNasabahWithQr, loginWithPassword } from "@/lib/api/auth";

type LoginMode = "password" | "qr";
type LoginRoleHint = "pengelola" | "nasabah";

export default function LoginPage() {
  const router = useRouter();
  const { user, isReady, applyTokenPair } = useAuth();

  const [mode, setMode] = useState<LoginMode>("password");
  const [roleHint, setRoleHint] = useState<LoginRoleHint>("pengelola");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [bankSampahCode, setBankSampahCode] = useState("");

  const [qrToken, setQrToken] = useState("");
  const [pin, setPin] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && user) {
      router.replace(user.role === "pengelola" ? "/pengelola" : "/nasabah");
    }
  }, [isReady, user, router]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedIdentifier = identifier.trim();
    const trimmedCode = bankSampahCode.trim();

    if (!trimmedIdentifier || !password) {
      setErrorMessage("Nama pengguna/email dan kata sandi wajib diisi.");
      return;
    }

    if (roleHint === "nasabah" && !trimmedCode) {
      setErrorMessage("Kode bank sampah wajib diisi untuk akun Nasabah.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tokens = await loginWithPassword({
        identifier: trimmedIdentifier,
        password,
        ...(roleHint === "nasabah" ? { bank_sampah_code: trimmedCode } : {}),
      });
      const session = await applyTokenPair(tokens);
      const targetRole = session.user?.role ?? roleHint;
      router.push(targetRole === "pengelola" ? "/pengelola" : "/nasabah");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage("Kredensial tidak valid. Periksa kembali akun dan kata sandi Anda.");
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal masuk. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQrSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedQr = qrToken.trim();
    const trimmedPin = pin.trim();

    if (!trimmedQr || !/^\d{6}$/.test(trimmedPin)) {
      setErrorMessage("Token QR dan PIN 6 digit angka wajib diisi dengan benar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tokens = await loginNasabahWithQr({
        qr_token: trimmedQr,
        pin: trimmedPin,
      });
      await applyTokenPair(tokens);
      router.push("/nasabah");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage("Token QR atau PIN 6 digit tidak valid.");
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal masuk menggunakan QR dan PIN.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <SiteHeader activePath="/login" />

      <main className="flex-1 py-[var(--space-2xl)]">
        <div className="container grid gap-[var(--space-xl)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="space-y-[var(--space-md)]">
            <h1>Masuk ke Setor Hijau</h1>
            <p className="lead text-[var(--color-ink-2)]">
              Akses ruang kerja Pengelola atau portal Nasabah sesuai bank sampah RW Anda.
            </p>
            <div className="stock space-y-[var(--space-xs)] p-[var(--space-lg)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
              <p className="font-semibold text-[var(--color-ink)]">Belum mendaftarkan RW Anda?</p>
              <p>
                Pengelola dapat mendaftarkan unit bank sampah baru untuk mendapatkan kode unik RW.
              </p>
              <div className="pt-[var(--space-xs)]">
                <Link href="/daftar" className="btn btn--card">
                  Daftarkan Bank Sampah RW
                </Link>
              </div>
            </div>
          </div>

          <section className="stock space-y-[var(--space-lg)] p-[var(--space-xl)]">
            <div className="groove flex gap-[var(--space-xs)] p-[var(--space-2xs)]" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "password"}
                onClick={() => {
                  setMode("password");
                  setErrorMessage(null);
                }}
                className={
                  mode === "password"
                    ? "btn btn--card flex-1 text-[var(--text-sm)]"
                    : "flex-1 rounded-[var(--radius-input)] px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
                }
              >
                Akun &amp; Kata Sandi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "qr"}
                onClick={() => {
                  setMode("qr");
                  setErrorMessage(null);
                }}
                className={
                  mode === "qr"
                    ? "btn btn--card flex-1 text-[var(--text-sm)]"
                    : "flex-1 rounded-[var(--radius-input)] px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
                }
              >
                QR + PIN (Opsional Nasabah)
              </button>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="border-l-4 border-[var(--color-error)] bg-[var(--color-paper-2)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-error)]"
              >
                {errorMessage}
              </div>
            ) : null}

            {mode === "password" ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-[var(--space-md)]" noValidate>
                <fieldset className="space-y-[var(--space-xs)]">
                  <legend className="text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                    Peran akun
                  </legend>
                  <div className="flex gap-[var(--space-sm)]">
                    <button
                      type="button"
                      onClick={() => setRoleHint("pengelola")}
                      className={
                        roleHint === "pengelola"
                          ? "btn btn--ink flex-1 text-[var(--text-sm)]"
                          : "btn btn--card flex-1 text-[var(--text-sm)]"
                      }
                    >
                      Pengelola
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleHint("nasabah")}
                      className={
                        roleHint === "nasabah"
                          ? "btn btn--ink flex-1 text-[var(--text-sm)]"
                          : "btn btn--card flex-1 text-[var(--text-sm)]"
                      }
                    >
                      Nasabah
                    </button>
                  </div>
                </fieldset>

                {roleHint === "nasabah" ? (
                  <div className="space-y-[var(--space-2xs)]">
                    <label
                      htmlFor="login-bank-code"
                      className="block text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
                    >
                      Kode Bank Sampah RW
                    </label>
                    <input
                      id="login-bank-code"
                      name="bank_sampah_code"
                      type="text"
                      value={bankSampahCode}
                      onChange={(event) => setBankSampahCode(event.target.value)}
                      placeholder="Contoh: BSM-RW05"
                      autoComplete="organization"
                      className="field-input w-full"
                    />
                  </div>
                ) : null}

                <div className="space-y-[var(--space-2xs)]">
                  <label
                    htmlFor="login-identifier"
                    className="block text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
                  >
                    Username atau Email
                  </label>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Contoh: admin_melati"
                    autoComplete="username"
                    className="field-input w-full"
                  />
                </div>

                <div className="space-y-[var(--space-2xs)]">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
                    >
                      Kata Sandi
                    </label>
                    {roleHint === "pengelola" ? (
                      <Link
                        href="/lupa-password"
                        className="text-[var(--text-xs)] text-[var(--color-accent-2)]"
                      >
                        Lupa kata sandi?
                      </Link>
                    ) : null}
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="field-input w-full"
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className="btn btn--ink w-full">
                  {isSubmitting ? "Memproses…" : "Masuk"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleQrSubmit} className="space-y-[var(--space-md)]" noValidate>
                <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Metode opsional khusus Nasabah yang sudah memiliki kartu QR dan PIN 6 digit.
                </p>

                <div className="space-y-[var(--space-2xs)]">
                  <label
                    htmlFor="login-qr-token"
                    className="block text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
                  >
                    Token QR Nasabah
                  </label>
                  <input
                    id="login-qr-token"
                    name="qr_token"
                    type="text"
                    value={qrToken}
                    onChange={(event) => setQrToken(event.target.value)}
                    placeholder="Masukkan kode token dari kartu QR"
                    autoComplete="off"
                    className="field-input w-full"
                  />
                </div>

                <div className="space-y-[var(--space-2xs)]">
                  <label
                    htmlFor="login-qr-pin"
                    className="block text-[var(--text-sm)] font-medium text-[var(--color-ink-2)]"
                  >
                    PIN 6 Digit
                  </label>
                  <input
                    id="login-qr-pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="6 digit angka"
                    autoComplete="one-time-code"
                    className="field-input w-full"
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className="btn btn--ink w-full">
                  {isSubmitting ? "Memverifikasi…" : "Masuk dengan QR & PIN"}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
