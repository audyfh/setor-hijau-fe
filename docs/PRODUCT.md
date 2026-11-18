# Product (Frontend)

## Problem
RW-level bank sampah typically record deposits and balances in handwritten books, while residents only see rupiah value (often delayed) with no visibility into their environmental contribution. Field weighing also frequently happens at RW outposts (*pos RW*) with unstable internet connectivity.

## Solution
A lightweight, offline-tolerant multi-tenant web application in Next.js (`setor-hijau-fe`) backed by the Setor Hijau Go API (`https://prod-setor-hijau.cloud.run`).

## Roles & Surfaces
| Role | Who | Primary Frontend Surfaces |
|---|---|---|
| Public (no login) | Anyone | Landing page, live **Net Impact Meter** (platform & per-tenant by code), **"Metode & Sumber"** page, and **Panduan Pemilahan Sampah** |
| Pengelola | Officer & administrator of one bank sampah | Register Bank Sampah, Login, Dashboard Bulanan, Manajemen Nasabah (CRUD, QR card view/print, PIN/password reset), Master Jenis & Harga Sampah, Catat Setoran (online & IndexedDB offline queue + QR scanner lookup), Struk Digital, Buku Kas (penjualan pengepul, penarikan saldo, transaksi manual, rekonsiliasi), Ekspor CSV/PDF |
| Nasabah | RW resident belonging to one bank sampah | Login (`bank_sampah_code` + username + password, or optional QR + 6-digit PIN), Saldo Rupiah & Tabungan Karbon, Riwayat Setoran & Struk Digital, Riwayat Penarikan, Set/Ubah PIN, Panduan Pemilahan |

Only `pengelola` and `nasabah` roles exist. No super-admin dashboard is in scope.

## Authentication Rules
- **Primary login (both roles)**: identifier + password (`POST /api/v1/auth/login`, with `bank_sampah_code` required for Nasabah).
- **Optional login (Nasabah only)**: QR token + 6-digit PIN (`POST /api/v1/auth/login/qr`). Never the sole login method.
- **QR lookup by Pengelola**: Scanning a resident's QR code when recording a deposit calls `POST /api/v1/nasabah/lookup-qr`. This identifies the Nasabah within the Pengelola's tenant without creating a Nasabah login session.

## Offline Deposit UX
1. Pengelola loads active Nasabah list and material prices while online (cached locally for offline use).
2. When offline (or during poor signal), Pengelola selects Nasabah and records weights in integer grams.
3. The app generates a UUIDv4 `idempotency_key` and `client_recorded_at` timestamp immediately upon submission and stores the entry in IndexedDB.
4. When connectivity returns (or via manual sync button), queued items sync to `POST /api/v1/deposits/sync` without creating duplicates.

## Honesty & Green Software Constraints
- **Estimated carbon only**: Every avoided CO2e value (WARM v16) and digital footprint value (SWDM v4 / CO2.js) must be labeled as an estimate (*Estimasi*).
- **Session transparency**: Every page visibly displays the live session digital footprint indicator (*"Estimasi Jejak Digital Sesi Ini"*) powered by `@tgwf/co2` (SWDM v4) and reports bytes transferred to the backend so the Net Impact Meter reflects real usage.
- **Lightweight UI**: Fast first load, minimal JavaScript shipped to the browser, crisp typography, accessible contrast, and zero wasteful background polling or heavy decorative animations.

## Out of scope
Digital payments / e-wallet disbursement, marketplace integration, kelurahan-level dashboard, pickup scheduling, neighborhood leaderboards, organic waste carbon accounting.
