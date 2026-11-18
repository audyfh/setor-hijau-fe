# Architecture (Frontend)

## Style & Runtime
`setor-hijau-fe` is a Next.js 16.4 App Router application using React 19.3, TypeScript 5 (`strict: true`), and Tailwind CSS 4.3 (`@tailwindcss/turbopack`).

Key Next.js 16 configuration (`next.config.ts`):
- `cacheComponents: true` and `partialPrefetching: true` are enabled.
- Server Components are the default (`app/`). Client Components (`"use client"`) are reserved strictly for interactive forms, IndexedDB offline storage, browser `PerformanceObserver` telemetry, QR scanning, and local session indicators.
- Client hooks mounted inside root layouts (e.g., `<CarbonTelemetryProvider>`) MUST be wrapped in `<Suspense>` so `cacheComponents: true` prerendering succeeds without dynamic-data build errors.

## Directory Structure
```
app/                         Routes, layouts, error/loading boundaries
components/
  carbon/                    @tgwf/co2 telemetry provider & SessionCarbonBadge
  ui/                        Reusable Hallmark-compliant UI primitives (added in M1+)
lib/
  api/                       Typed HTTP client & endpoint adapters for Cloud Run API
  auth/                      Token storage, refresh rotation, role guards (M2)
  carbon/                    @tgwf/co2 SWDM v4 math, URL filter, telemetry dispatcher
  config/                    Validated env configuration (NEXT_PUBLIC_API_BASE_URL)
  format/                    Integer-to-display formatters (IDR, g/kg, CO2e, bytes)
  offline/                   IndexedDB queue & background deposit sync (M4)
types/                       Ambient declarations (e.g. tgwf-co2.d.ts) & shared DTOs
docs/                        System of record
```

## Precision & Domain Rules
1. **No floats in state/DTOs**: Financial values (`amount_idr`, `price_per_kg_idr`), weights (`weight_grams`), and carbon ledger quantities (`co2e_grams`, `co2e_micrograms`) stay integer numbers in TypeScript state and API requests. Decimal presentation (`Rp15.000`, `1,5 kg`, `5,14 kg CO₂e`) happens only inside `lib/format/units.ts`.
2. **Backend is source of truth**: Price snapshotting, balance derivation (`SUM(deposits) - SUM(withdrawals)`), WARM v16 avoided emissions, and SWDM v4 ledger persistence all happen transactionally in the Go backend. The frontend displays previews/estimates and renders authoritative server responses.

## Auth & Multi-Tenancy Strategy (for M2)
- Backend issues a short-lived JWT access token (containing `user_id`, `role`, `bank_sampah_id`) plus a rotating refresh token (`POST /api/v1/auth/refresh`).
- API calls automatically attach `Authorization: Bearer <access_token>` and transparently retry once on `401 Unauthorized` via refresh token rotation before redirecting to login.
- Role routing guards separate `/pengelola/*` and `/nasabah/*` surfaces cleanly.

## Offline Deposit Architecture (for M4)
- Reference materials (with active prices) and Nasabah directory are cached locally in IndexedDB.
- Offline deposits are persisted in an IndexedDB outbox store keyed by `idempotency_key` (UUIDv4) with `client_recorded_at`.
- Online detection (`navigator.onLine` + `online` event + explicit "Sinkronkan Sekarang" trigger) flushes pending deposits via `POST /api/v1/deposits/sync` and reconciles statuses (`created`, `replayed`, or validation error).

## Digital Carbon Telemetry Architecture
- Implemented in M0 (`docs/CARBON-TELEMETRY.md`, ADR `0002`).
- Combines `@tgwf/co2` (SWDM v4) for client-side visibility with raw byte reporting to `POST /api/v1/public/impact/telemetry`.

## Deployment & Portability
- **Primary**: Vercel (native Next.js 16 deployment with `NEXT_PUBLIC_API_BASE_URL=https://prod-setor-hijau.cloud.run`).
- **Fallback**: Multi-stage Docker standalone build (`output: "standalone"` when needed) deployable to Google Cloud Run alongside the backend.
- All runtime config enters via environment variables (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`) with zero vendor-locked SDKs.
