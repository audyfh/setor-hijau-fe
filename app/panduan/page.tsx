import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const metadata: Metadata = {
  title: "Panduan Pemilahan Sampah — Setor Hijau",
  description:
    "Panduan praktis pemilahan sampah anorganik (plastik, kertas, logam, kaca) untuk nasabah bank sampah RW di Setor Hijau.",
};

const WASTE_CATEGORIES = [
  {
    name: "Plastik PET & HDPE",
    accepted: [
      "Botol air mineral atau minuman kemasan transparan dan berwarna (kode PET #1)",
      "Botol detergen, jeriken, dan wadah plastik keras (kode HDPE #2)",
    ],
    rejected: [
      "Plastik bungkus makanan berminyak atau berlapis foil",
      "Kantong kresek basah dan styrofoam",
    ],
    prep: "Kosongkan sisa cairan, bilas singkat, lalu tekan atau remas botol agar menghemat ruang timbang.",
  },
  {
    name: "Kertas & Kardus",
    accepted: [
      "Kardus kemasan atau karton gelombang",
      "Kertas HVS bekas, buku tulis, koran, dan majalah",
    ],
    rejected: [
      "Kertas tisu bekas, kertas karbon, dan karton basah atau berjamur",
      "Kertas pembungkus makanan yang terkena minyak",
    ],
    prep: "Lipat kardus hingga pipih, ikat berdasarkan jenis kertas, dan simpan di tempat kering sebelum disetor.",
  },
  {
    name: "Logam & Kaleng",
    accepted: [
      "Kaleng minuman aluminium",
      "Kaleng makanan atau susu berbahan besi/baja (steel cans)",
    ],
    rejected: [
      "Kaleng cat berbahan kimia berbahaya atau tabung aerosol bertekanan",
      "Logam berkarat berat yang bercampur tanah basah",
    ],
    prep: "Bilas sisa makanan atau minuman di dalam kaleng dan tiriskan agar tidak menimbulkan bau di pos RW.",
  },
  {
    name: "Kaca & Botol Beling",
    accepted: [
      "Botol kaca kecap, sirup, atau minuman yang masih utuh",
      "Wadah gelas kaca bening maupun berwarna",
    ],
    rejected: [
      "Kaca jendela, cermin, bohlam lampu, dan keramik pecah",
      "Botol obat atau bahan kimia rumah tangga berbahaya",
    ],
    prep: "Pisahkan botol kaca dalam wadah kokoh tersendiri agar tidak pecah saat dibawa ke tempat penimbangan.",
  },
];

export default function PanduanPage() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <SiteHeader activePath="/panduan" />

      <main className="flex-1 py-[var(--space-2xl)]">
        <div className="container space-y-[var(--space-2xl)]">
          <header className="space-y-[var(--space-md)]">
            <h1>Panduan Pemilahan Sampah</h1>
            <p className="lead text-[var(--color-ink-2)]">
              Pilah sampah bersih dan kering agar nilai jual dan estimasi emisi akurat.
            </p>
          </header>

          <section className="grid gap-[var(--space-lg)] md:grid-cols-2">
            {WASTE_CATEGORIES.map((category) => (
              <article
                key={category.name}
                className="stock flex flex-col justify-between gap-[var(--space-md)] p-[var(--space-xl)]"
              >
                <div className="space-y-[var(--space-md)]">
                  <h2>{category.name}</h2>

                  <div className="space-y-[var(--space-xs)]">
                    <h3 className="text-[var(--text-sm)] font-semibold text-[var(--color-ink)]">
                      Diterima
                    </h3>
                    <ul className="list-disc space-y-[var(--space-2xs)] pl-[var(--space-lg)] text-[var(--text-sm)] text-[var(--color-ink-2)]">
                      {category.accepted.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-[var(--space-xs)]">
                    <h3 className="text-[var(--text-sm)] font-semibold text-[var(--color-ink)]">
                      Tidak diterima
                    </h3>
                    <ul className="list-disc space-y-[var(--space-2xs)] pl-[var(--space-lg)] text-[var(--text-sm)] text-[var(--color-muted)]">
                      {category.rejected.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="border-t border-[var(--color-rule)] pt-[var(--space-sm)] text-[var(--text-xs)] text-[var(--color-ink-2)]">
                  Persiapan sebelum setor: {category.prep}
                </p>
              </article>
            ))}
          </section>

          <section className="stock space-y-[var(--space-sm)] p-[var(--space-xl)]">
            <h2>Catatan Ruang Lingkup Karbon</h2>
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              Carbon Ledger Setor Hijau hanya menghitung estimasi emisi terhindar dari sampah
              anorganik bernilai ekonomi di atas menggunakan faktor US EPA WARM v16. Sampah organik
              rumah tangga tidak termasuk dalam akuntansi karbon aplikasi ini.
            </p>
            <div className="flex flex-wrap gap-[var(--space-md)] pt-[var(--space-sm)]">
              <Link href="/metode" className="btn btn--ink">
                Lihat Faktor WARM v16
              </Link>
              <Link href="/#net-impact" className="btn btn--card">
                Lihat Net Impact Meter
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
