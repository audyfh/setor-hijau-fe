# Backend API Contract Reference

Base URL (production): `https://prod-setor-hijau.cloud.run`
Interactive OpenAPI / Swagger UI: `https://prod-setor-hijau.cloud.run/docs` (`/openapi.yaml`)

All authenticated endpoints require `Authorization: Bearer <access_token>`. Tenant ID (`bank_sampah_id`) is derived strictly from the JWT on the backend.

## System
- `GET /healthz` — Liveness probe (`{ status: "ok" }`)
- `GET /readyz` — Readiness probe (`{ status: "ready", database: "connected" }`)

## Tenants & Auth
- `POST /api/v1/tenants/register` — Register Bank Sampah tenant + initial Pengelola account
- `GET /api/v1/tenants/current` — Get current tenant profile (Auth)
- `POST /api/v1/auth/login` — Primary login (`identifier`, `password`, optional `bank_sampah_code` required for Nasabah)
- `POST /api/v1/auth/login/qr` — Optional Nasabah login (`qr_token`, 6-digit `pin`)
- `POST /api/v1/auth/refresh` — Rotate refresh token (`refresh_token`)
- `POST /api/v1/auth/logout` — Revoke refresh token (`refresh_token`)
- `POST /api/v1/auth/forgot-password` — Request Pengelola password reset token (`email`)
- `POST /api/v1/auth/reset-password` — Complete password reset (`token`, `new_password`)
- `GET /api/v1/auth/me` — Current authenticated user profile (Auth)

## Nasabah Management
- `POST /api/v1/nasabah` — Create Nasabah + generate initial QR token (Pengelola)
- `GET /api/v1/nasabah` — Paginated Nasabah list (`search`, `rw`, `rt`, `limit`, `offset`) (Pengelola)
- `POST /api/v1/nasabah/lookup-qr` — Lookup Nasabah by `qr_token` for deposit recording without creating a login session (Pengelola)
- `GET /api/v1/nasabah/:id` — Nasabah detail (Pengelola)
- `PUT /api/v1/nasabah/:id` — Update Nasabah profile (Pengelola)
- `POST /api/v1/nasabah/:id/regenerate-qr` — Revoke old QR & generate new token (Pengelola)
- `POST /api/v1/nasabah/:id/reset-password` — Reset Nasabah password (Pengelola)
- `POST /api/v1/nasabah/:id/reset-pin` — Set/reset Nasabah 6-digit PIN (Pengelola)
- `GET /api/v1/nasabah/me` — Own profile (Nasabah)
- `PUT /api/v1/nasabah/me/pin` — Set/update own 6-digit PIN (Nasabah)

## Master Data: Materials & Price History
- `GET /api/v1/materials` — List material types with active prices (Auth)
- `POST /api/v1/materials` — Create material type + initial integer Rupiah price (Pengelola)
- `GET /api/v1/materials/:id` — Material detail (Auth)
- `PUT /api/v1/materials/:id` — Update material metadata (Pengelola)
- `POST /api/v1/materials/:id/prices` — Append new price row (`price_per_kg_idr`) (Pengelola)
- `GET /api/v1/materials/:id/prices` — View append-only price history (Pengelola)

## Deposits & Balance
- `POST /api/v1/deposits` — Record single deposit with `idempotency_key` & `client_recorded_at` (Pengelola; `201` created or `200` idempotent replay)
- `POST /api/v1/deposits/sync` — Batch offline deposit sync (`deposits[]`) (Pengelola)
- `GET /api/v1/deposits` — List deposits (tenant-scoped; Nasabah sees own only)
- `GET /api/v1/deposits/:id` — Deposit detail (Auth)
- `GET /api/v1/deposits/:id/receipt` — Digital receipt (*Struk Digital*) with Rupiah & estimated CO2e (Auth)
- `GET /api/v1/nasabah/me/balance` — Own derived Rupiah balance (Nasabah)
- `GET /api/v1/nasabah/:id/balance` — Nasabah derived Rupiah balance (Pengelola)

## Carbon Ledger (WARM v16)
- `GET /api/v1/carbon/factors` — List active EPA WARM v16 emission factors
- `GET /api/v1/carbon/ledger` — Append-only carbon ledger entries (Auth)
- `GET /api/v1/carbon/balance` — Own estimated CO2e savings (Nasabah)
- `GET /api/v1/carbon/summary` — Tenant total estimated CO2e savings (Pengelola)
- `POST /api/v1/carbon/reversals` — Record reversing carbon ledger entry (Pengelola)
- `GET /api/v1/nasabah/me/carbon` — Own estimated CO2e savings (Nasabah)
- `GET /api/v1/nasabah/:id/carbon` — Nasabah estimated CO2e savings (Pengelola)

## Cashbook, Dashboard & Reports
- `POST /api/v1/cashbook/sales` — Record wholesale sale to Pengepul (Pengelola)
- `GET /api/v1/cashbook/sales` — List sales to Pengepul (Pengelola)
- `GET /api/v1/cashbook/sales/:id` — Sale detail (Pengelola)
- `POST /api/v1/cashbook/entries` — Manual cashbook entry (`cash_in` / `cash_out`) (Pengelola)
- `GET /api/v1/cashbook/entries` — List cashbook entries (Pengelola)
- `GET /api/v1/cashbook/summary` — Cashbook summary (Pengelola)
- `GET /api/v1/cashbook/reconciliation` — Financial reconciliation report (Pengelola)
- `GET /api/v1/nasabah/me/withdrawals` — Own cash withdrawals (Nasabah)
- `POST /api/v1/nasabah/:id/withdrawals` — Record Nasabah cash withdrawal (Pengelola)
- `GET /api/v1/nasabah/:id/withdrawals` — List Nasabah withdrawals (Pengelola)
- `GET /api/v1/dashboard/monthly?month=YYYY-MM` — Monthly operational, financial & carbon dashboard (Pengelola)
- `GET /api/v1/reports/monthly/csv?month=YYYY-MM` — Export CSV report with UTF-8 BOM (Pengelola)
- `GET /api/v1/reports/monthly/pdf?month=YYYY-MM` — Export PDF report (Pengelola)

## Impact & Public Methods (SWDM v4 & Net Impact Meter)
- `GET /api/v1/public/methods` — Public "Metode & Sumber" constants, formulas, WARM v16 factors, and academic disclaimers
- `GET /api/v1/public/impact` — Platform-wide Net Impact Meter
- `GET /api/v1/public/impact/tenants/:code` — Public Net Impact Meter for a specific bank sampah (`code`)
- `POST /api/v1/public/impact/telemetry` — Ingest frontend `data_bytes_transferred` telemetry (`201 Created`)
- `GET /api/v1/impact/tenant` — Authenticated tenant Net Impact Meter (Auth)
