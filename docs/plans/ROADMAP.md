# Roadmap (Frontend)

Each milestone gets its own plan file in `docs/plans/active/` when started and moves to `docs/plans/completed/` when verified. A milestone is complete only when `npm run check` (`make check`) and `npm run build` pass and all acceptance criteria are met.

## M0 — Harness, Scaffolding & CO2.js Telemetry Engine [COMPLETED]
- `/AGENTS.md` rulebook, `docs/` system of record, ADRs `0001` & `0002`, `Makefile`, `.env.example`, GitHub Actions CI
- `@tgwf/co2` (SWDM v4) + `types/tgwf-co2.d.ts`, Vitest (`^5.1.1`), `@types/node` (`^22`)
- `lib/config/env.ts`, `lib/api/client.ts` targeting `https://prod-setor-hijau.cloud.run`, `lib/format/units.ts`
- `lib/carbon/swdm.ts`, `lib/carbon/telemetry.ts`, `<CarbonTelemetryProvider>`, `<SessionCarbonBadge />` mounted in `app/layout.tsx`
- Accept: `npm run check` and `npm run build` pass; unit tests verify CO2.js SWDM v4 & deterministic microgram math

## M1 — Public Experience: Landing Page, Net Impact Meter & Metode & Sumber [COMPLETED]
- Adopt Hallmark design system (`tokens.css`, `base.css`, `:root` tokens) for Setor Hijau brand identity
- Public landing page explaining Setor Hijau (RW-level bank sampah SaaS)
- Live **Net Impact Meter** powered by `GET /api/v1/public/impact` and tenant lookup `GET /api/v1/public/impact/tenants/:code`
- Public **"Metode & Sumber"** page (`GET /api/v1/public/methods`) displaying WARM v16 factors, SWDM v4 parameters, formulas, and academic disclaimers
- Public **Panduan Pemilahan Sampah** section/page
- Accept: Public pages render live Cloud Run data, explicitly label all carbon figures as estimates, and pass Hallmark `sloplint` + `npm run check`

## M2 — Authentication & Bank Sampah Registration [COMPLETED]
- Bank Sampah registration flow (`POST /api/v1/tenants/register`)
- Primary login (`identifier` + `password`, plus `bank_sampah_code` for Nasabah)
- Optional Nasabah QR + 6-digit PIN login (`POST /api/v1/auth/login/qr`)
- Pengelola password reset (`forgot-password` / `reset-password`)
- Auth context, automatic access/refresh token rotation (`POST /api/v1/auth/refresh`), logout, and role-based route guards (`/pengelola/*`, `/nasabah/*`)
- Accept: Both roles log in and refresh tokens seamlessly; QR + PIN is optional; no tokens/PINs logged

## M3 — Pengelola Workspace: Nasabah & Master Data [NEXT]
- Nasabah CRUD (`GET/POST/PUT /api/v1/nasabah`), QR card modal/print, QR token regeneration, Pengelola PIN/password reset
- Master Data Jenis & Harga Sampah (`GET/POST/PUT /api/v1/materials`), append-only price update & history viewer (`POST/GET /api/v1/materials/:id/prices`)
- Accept: Price changes show append-only history; all weights/prices remain integer values in forms/state

## M4 — Deposit Recording (Setoran), QR Lookup, Offline Sync & Struk Digital
- Deposit form with integer gram inputs, live subtotal & estimated CO2e preview, and Pengelola QR scanner lookup (`POST /api/v1/nasabah/lookup-qr`)
- IndexedDB cache (materials & nasabah) and offline outbox queue generating UUIDv4 `idempotency_key` & `client_recorded_at`
- Background & manual sync via `POST /api/v1/deposits/sync` handling `200`/`201` idempotent replays cleanly
- **Struk Digital** view & printable receipt (`GET /api/v1/deposits/:id/receipt`) showing Rupiah & estimated avoided CO2e per line
- Accept: Recording deposits offline persists across reload, syncs without duplicates on reconnect, and renders Struk Digital

## M5 — Cashbook (Buku Kas), Dashboard Bulanan & Export Reports
- Sales to Pengepul (`POST/GET /api/v1/cashbook/sales`), Nasabah withdrawals (`POST /api/v1/nasabah/:id/withdrawals`), manual cashbook entries, summary & reconciliation view
- Monthly Dashboard (`GET /api/v1/dashboard/monthly?month=YYYY-MM`)
- CSV & PDF report download buttons (`GET /api/v1/reports/monthly/csv`, `/pdf`) with authenticated blob download
- Carbon ledger viewer & reversal recording (`GET /api/v1/carbon/ledger`, `POST /api/v1/carbon/reversals`)
- Accept: Cashbook & reconciliation views match backend totals; CSV & PDF downloads work cleanly

## M6 — Nasabah Portal
- Nasabah dashboard: derived Rupiah balance (`/api/v1/nasabah/me/balance`), estimated Tabungan Karbon (`/api/v1/nasabah/me/carbon`), deposit history + Struk Digital, withdrawal history, self-service 6-digit PIN setup (`/api/v1/nasabah/me/pin`), and sorting guide
- Accept: Nasabah sees strictly own data and clear "Estimasi" carbon labels

## M7 — Production Deployment & Verification
- Configure Vercel deployment (primary) with `NEXT_PUBLIC_API_BASE_URL=https://prod-setor-hijau.cloud.run`
- Verify CORS interaction with Cloud Run backend and add optional `Dockerfile` (standalone fallback)
- End-to-end verification across public, Pengelola (online + offline sync), and Nasabah flows against live backend
- Accept: Production frontend live, telemetry recorded cleanly in backend DB, all `make check` & build gates green
