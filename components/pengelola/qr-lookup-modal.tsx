"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { lookupNasabahByQr } from "@/lib/api/deposits";
import type { NasabahItem } from "@/lib/api/nasabah";

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
}

interface QrLookupModalProps {
  isOnline: boolean;
  cachedNasabah: NasabahItem[];
  onSelectNasabah: (nasabah: NasabahItem) => void;
  onClose: () => void;
}

export function QrLookupModal({
  isOnline,
  cachedNasabah,
  onSelectNasabah,
  onClose,
}: QrLookupModalProps) {
  const [qrInput, setQrInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      "BarcodeDetector" in window &&
      Boolean(navigator.mediaDevices?.getUserMedia),
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  function stopCamera() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function resolveToken(rawToken: string) {
    const token = rawToken.trim();
    if (!token) {
      setErrorMessage("Masukkan atau pindai token QR nasabah terlebih dahulu.");
      return;
    }

    setErrorMessage(null);
    setIsLookingUp(true);
    try {
      if (isOnline) {
        const nasabah = await lookupNasabahByQr(token);
        stopCamera();
        onSelectNasabah(nasabah);
        onClose();
        return;
      }

      const localMatch = cachedNasabah.find(
        (item) => item.qr_token && item.qr_token.trim() === token,
      );
      if (localMatch) {
        stopCamera();
        onSelectNasabah(localMatch);
        onClose();
        return;
      }

      setErrorMessage(
        "Sedang offline dan token QR tidak ditemukan di cache lokal. Pilih nasabah dari daftar.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nasabah dengan kode QR tersebut tidak ditemukan.",
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  async function startCamera() {
    setErrorMessage(null);
    try {
      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;

      if (!DetectorCtor || !navigator.mediaDevices?.getUserMedia) {
        setErrorMessage("Pemindai kamera QR tidak didukung di browser ini. Gunakan input token.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new DetectorCtor({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        void detector
          .detect(video)
          .then((codes) => {
            const firstValue = codes.find((c) => c.rawValue?.trim())?.rawValue?.trim();
            if (firstValue) {
              setQrInput(firstValue);
              stopCamera();
              void resolveToken(firstValue);
            }
          })
          .catch(() => {
            // ignore transient detection frame errors
          });
      }, 450);
    } catch {
      stopCamera();
      setErrorMessage("Tidak dapat mengakses kamera. Periksa izin kamera atau masukkan token QR.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolveToken(qrInput);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-lookup-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--color-ink)]/45 p-[var(--space-md)]"
    >
      <div className="stock w-full max-w-lg space-y-[var(--space-md)] p-[var(--space-xl)]">
        <div className="flex items-start justify-between gap-[var(--space-md)]">
          <div>
            <h2 id="qr-lookup-title" className="text-[var(--text-lg)] font-semibold">
              Pindai / Cari QR Nasabah
            </h2>
            <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
              Identifikasi nasabah untuk pencatatan setoran tanpa membuka sesi login nasabah.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="btn btn--card"
          >
            Tutup
          </button>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-[var(--radius-input)] border border-[var(--color-error)] bg-[var(--color-paper)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-error)]"
          >
            {errorMessage}
          </p>
        ) : null}

        {cameraSupported ? (
          <div className="space-y-[var(--space-sm)]">
            {isCameraActive ? (
              <div className="space-y-[var(--space-xs)]">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-video w-full rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-ink)] object-cover"
                />
                <button type="button" onClick={stopCamera} className="btn btn--card">
                  Hentikan Kamera
                </button>
              </div>
            ) : (
              <button type="button" onClick={startCamera} className="btn btn--card">
                Aktifkan Kamera Pemindai QR
              </button>
            )}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-[var(--space-sm)]">
          <label className="block space-y-[var(--space-2xs)]">
            <span className="text-[var(--text-sm)] font-medium text-[var(--color-ink)]">
              Token QR Kartu Nasabah
            </span>
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Tempel atau pindai kode token QR..."
              autoFocus
              className="w-full rounded-[var(--radius-input)] border border-[var(--color-rule-2)] bg-[var(--color-cotton)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-sm)] text-[var(--color-ink)]"
            />
          </label>
          <div className="flex items-center justify-end gap-[var(--space-sm)]">
            <button type="submit" disabled={isLookingUp} className="btn btn--ink">
              {isLookingUp ? "Mencari..." : "Cari Nasabah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
