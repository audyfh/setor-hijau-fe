import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import {
  CarbonTelemetryProvider,
  SessionCarbonBadge,
} from "@/components/carbon/carbon-telemetry-provider";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Setor Hijau — Sistem Informasi Bank Sampah & Akuntansi Karbon RW",
  description:
    "Platform bank sampah tingkat RW dengan pencatatan setoran offline, buku kas otomatis, Carbon Ledger berbasis estimasi EPA WARM v16, dan Net Impact Meter SWDM v4.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <CarbonTelemetryProvider>
            <div className="flex flex-1 flex-col">{children}</div>
            <SessionCarbonBadge />
          </CarbonTelemetryProvider>
        </Suspense>
      </body>
    </html>
  );
}
