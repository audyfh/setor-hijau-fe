"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api/auth";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!email.trim()) {
      setErrorMessage("Masukkan email Pengelola yang terdaftar.");
      return;
    }

    setIsRequesting(true);
    try {
      await requestPasswordReset(email.trim());
      setFeedback(
        "Jika email terdaftar, instruksi dan token reset kata sandi telah dikirimkan.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memproses permintaan reset kata sandi.",
      );
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!token.trim() || newPassword.length < 8) {
      setErrorMessage("Token reset dan kata sandi baru (minimal 8 karakter) wajib diisi.");
      return;
    }

    setIsResetting(true);
    try {
      await confirmPasswordReset({
        token: token.trim(),
        new_password: newPassword,
      });
      setFeedback("Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.");
      setToken("");
      setNewPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memperbarui kata sandi.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <SiteHeader activePath="/login" />

      <main className="flex-1 py-[var(--space-2xl)]">
        <div className="container space-y-[var(--space-xl)]">
          <header className="space-y-[var(--space-sm)]">
            <h1>Reset Kata Sandi Pengelola</h1>
            <p className="lead text-[var(--color-ink-2)]">
              Minta token pemulihan melalui email terdaftar, lalu atur kata sandi baru Anda.
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

          {feedback ? (
            <div className="stock border-l-4 border-[var(--color-success)] p-[var(--space-md)] text-[var(--text-sm)] text-[var(--color-ink)]">
              {feedback}
            </div>
          ) : null}

          <div className="grid gap-[var(--space-xl)] lg:grid-cols-2">
            <form onSubmit={handleForgotSubmit} className="stock space-y-[var(--space-md)] p-[var(--space-xl)]" noValidate>
              <h2>1. Minta Token Reset</h2>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="forgot-email" className="block text-[var(--text-sm)] font-medium">
                  Email Pengelola
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@melati.id"
                  autoComplete="email"
                  className="field-input w-full"
                />
              </div>
              <button type="submit" disabled={isRequesting} className="btn btn--ink">
                {isRequesting ? "Mengirim…" : "Kirim Permintaan Reset"}
              </button>
            </form>

            <form onSubmit={handleResetSubmit} className="stock space-y-[var(--space-md)] p-[var(--space-xl)]" noValidate>
              <h2>2. Atur Kata Sandi Baru</h2>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="reset-token" className="block text-[var(--text-sm)] font-medium">
                  Token Reset
                </label>
                <input
                  id="reset-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Tempel token reset di sini"
                  autoComplete="off"
                  className="field-input w-full"
                />
              </div>
              <div className="space-y-[var(--space-2xs)]">
                <label htmlFor="reset-new-password" className="block text-[var(--text-sm)] font-medium">
                  Kata Sandi Baru (minimal 8 karakter)
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="field-input w-full"
                />
              </div>
              <div className="flex flex-wrap items-center gap-[var(--space-md)]">
                <button type="submit" disabled={isResetting} className="btn btn--ink">
                  {isResetting ? "Menyimpan…" : "Simpan Kata Sandi Baru"}
                </button>
                <Link href="/login" className="btn btn--card">
                  Kembali ke Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
