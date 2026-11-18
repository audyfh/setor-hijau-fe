import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { NetImpactMeter } from "@/components/public/net-impact-meter";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { fetchPublicImpact } from "@/lib/api/public";
import { formatEstimatedCO2eGrams, formatRupiah, formatWeightGrams } from "@/lib/format/units";

const SAAS_CAPABILITIES = [
  {
    title: "Multi-Tenant per Bank Sampah RW",
    detail:
      "Setiap bank sampah mendapatkan kode unik RW dengan isolasi data penuh untuk nasabah, harga, dan kas.",
  },
  {
    title: "Setoran Offline-First & Idempoten",
    detail:
      "Penimbangan di pos RW tetap berjalan saat sinyal lemah melalui antrean lokal dan sinkronisasi tanpa duplikasi.",
  },
  {
    title: "Buku Kas & Struk Digital Otomatis",
    detail:
      "Saldo rupiah nasabah, penjualan ke pengepul, penarikan kas, hingga laporan bulanan CSV/PDF terhitung otomatis.",
  },
  {
    title: "Carbon Ledger & Net Impact Meter",
    detail:
      "Setiap setoran mencatat estimasi emisi terhindar (WARM v16) dikurangi estimasi jejak digital web (SWDM v4).",
  },
];

const SORTING_SUMMARY = [
  {
    category: "Plastik PET & HDPE",
    examples: "Botol minum transparan, jeriken, dan botol detergen bilas bersih.",
    note: "Lepaskan tutup dan label jika memungkinkan, lalu remas agar ringkas.",
  },
  {
    category: "Kertas & Kardus",
    examples: "Karton gelombang, kardus kemasan, kertas HVS, koran, dan majalah.",
    note: "Pastikan kering dan bebas minyak atau sisa makanan.",
  },
  {
    category: "Logam & Kaleng",
    examples: "Kaleng minuman aluminium dan kaleng makanan berbahan besi atau baja.",
    note: "Kosongkan isi dan bilas singkat sebelum ditimbang di pos RW.",
  },
  {
    category: "Kaca & Botol Beling",
    examples: "Botol kaca bening maupun berwarna yang masih utuh.",
    note: "Pisahkan dari pecahan tajam agar aman bagi petugas penimbangan.",
  },
];

async function LiveNetImpactSection() {
  await connection();
  let impact = null;
  let errorMessage: string | null = null;

  try {
    impact = await fetchPublicImpact();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Gagal terhubung ke layanan backend Setor Hijau.";
  }

  return <NetImpactMeter initialImpact={impact} initialError={errorMessage} />;
}

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <SiteHeader activePath="/" />

      <main className="flex-1">
        <section className="desk border-b border-[var(--color-rule)] py-[var(--space-2xl)]">
          <div className="container grid items-center gap-[var(--space-xl)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-[var(--space-lg)]">
              <h1>Platform SaaS bank sampah RW, rapi dan terukur.</h1>
              <p className="lead text-[var(--color-ink-2)]">
                Kelola nasabah, setoran offline, buku kas, dan estimasi karbon dalam satu sistem.
              </p>
              <div className="flex flex-wrap items-center gap-[var(--space-md)]">
                <Link href="/daftar" className="btn btn--ink">
                  Daftarkan Bank Sampah RW
                </Link>
                <Link href="/login" className="btn btn--card">
                  Masuk ke Akun
                </Link>
              </div>
            </div>

            <aside
              aria-label="Contoh format struk digital Setor Hijau"
              className="stock p-[var(--space-xl)]"
            >
              <div className="flex items-start justify-between gap-[var(--space-md)] border-b border-[var(--color-rule)] pb-[var(--space-md)]">
                <div>
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--color-ink)]">
                    Contoh Format Struk Digital
                  </p>
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                    Ilustrasi tampilan catatan setoran nasabah RW
                  </p>
                </div>
                <span className="pressed-seal text-[var(--text-xs)]">Tercatat</span>
              </div>

              <dl className="mt-[var(--space-md)] divide-y divide-[var(--color-rule)] text-[var(--text-sm)]">
                <div className="flex items-center justify-between gap-[var(--space-md)] py-[var(--space-sm)]">
                  <dt className="text-[var(--color-ink-2)]">
                    Botol Plastik PET ({formatWeightGrams(2000)})
                  </dt>
                  <dd className="fig font-medium text-[var(--color-ink)]">
                    {formatRupiah(8000)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-[var(--space-md)] py-[var(--space-sm)]">
                  <dt className="text-[var(--color-ink-2)]">
                    Kardus Gelombang ({formatWeightGrams(3000)})
                  </dt>
                  <dd className="fig font-medium text-[var(--color-ink)]">
                    {formatRupiah(7500)}
                  </dd>
                </div>
              </dl>

              <div className="mt-[var(--space-md)] flex flex-wrap items-baseline justify-between gap-[var(--space-sm)] border-t border-[var(--color-rule-2)] pt-[var(--space-md)]">
                <div>
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                    Total nilai setoran (contoh)
                  </p>
                  <p className="fig text-[var(--text-xl)] font-semibold text-[var(--color-ink)]">
                    {formatRupiah(15500)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                    Estimasi emisi terhindar (WARM v16)
                  </p>
                  <p className="fig text-[var(--text-lg)] font-semibold text-[var(--color-accent-2)]">
                    {formatEstimatedCO2eGrams(12820)}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="produk-saas" className="section-band">
          <div className="container space-y-[var(--space-xl)]">
            <div className="space-y-[var(--space-xs)]">
              <h2>Satu platform SaaS untuk operasional bank sampah RW</h2>
              <p className="lead text-[var(--color-ink-2)]">
                Menggantikan buku tulis manual di pos RW dengan alur kerja terstruktur untuk
                Pengelola dan Nasabah.
              </p>
            </div>

            <div className="grid gap-[var(--space-lg)] md:grid-cols-2">
              {SAAS_CAPABILITIES.map((cap, index) => (
                <article key={cap.title} className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]">
                  <p className="fig text-[var(--text-xs)] font-medium text-[var(--color-accent-2)]">
                    0{index + 1}
                  </p>
                  <h3>{cap.title}</h3>
                  <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">{cap.detail}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-[var(--space-lg)] lg:grid-cols-2">
              <article className="stock space-y-[var(--space-sm)] p-[var(--space-xl)]">
                <h3>Untuk Pengelola Bank Sampah</h3>
                <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Daftarkan unit bank sampah RW Anda dalam hitungan menit, kelola daftar nasabah dan
                  kartu QR, atur riwayat harga per jenis sampah, catat setoran secara offline, dan
                  unduh laporan kas bulanan CSV maupun PDF.
                </p>
                <div className="pt-[var(--space-xs)]">
                  <Link href="/daftar" className="btn btn--ink">
                    Mulai Daftarkan RW
                  </Link>
                </div>
              </article>

              <article className="stock space-y-[var(--space-sm)] p-[var(--space-xl)]">
                <h3>Untuk Nasabah Warga RW</h3>
                <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Masuk menggunakan kode bank sampah dan akun warga (atau QR + PIN 6 digit opsional)
                  untuk memantau saldo rupiah, struk digital setiap setoran, riwayat penarikan, dan
                  estimasi tabungan karbon pribadi.
                </p>
                <div className="pt-[var(--space-xs)]">
                  <Link href="/login" className="btn btn--card">
                    Masuk sebagai Nasabah
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="net-impact" className="section-band section-rule bg-[var(--color-paper-2)]">
          <div className="container">
            <Suspense
              fallback={
                <div className="stock p-[var(--space-xl)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
                  Memuat data langsung Net Impact Meter dari server…
                </div>
              }
            >
              <LiveNetImpactSection />
            </Suspense>
          </div>
        </section>

        <section className="section-band section-rule">
          <div className="container space-y-[var(--space-xl)]">
            <div className="flex flex-wrap items-end justify-between gap-[var(--space-md)]">
              <div className="space-y-[var(--space-xs)]">
                <h2>Panduan pemilahan sampah anorganik</h2>
                <p className="lead text-[var(--color-ink-2)]">
                  Empat kelompok material bernilai ekonomi yang dicatat dalam Carbon Ledger Setor
                  Hijau.
                </p>
              </div>
              <Link href="/panduan" className="btn btn--card">
                Baca Panduan Lengkap
              </Link>
            </div>

            <div className="grid gap-[var(--space-lg)] sm:grid-cols-2">
              {SORTING_SUMMARY.map((item) => (
                <article
                  key={item.category}
                  className="stock space-y-[var(--space-xs)] p-[var(--space-lg)]"
                >
                  <h3>{item.category}</h3>
                  <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">{item.examples}</p>
                  <p className="text-[var(--text-xs)] text-[var(--color-muted)]">{item.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
