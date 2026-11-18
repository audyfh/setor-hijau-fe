# ADR 0002: Client-Side CO2.js Integration & Dual Digital Footprint Telemetry

Status: Accepted, 2026-11-18

## Context
Backend ADR 0010 established the **Sustainable Web Design Model (SWDM) v4** for Setor Hijau's Net Impact Meter and left client byte collection to the frontend. In `setor-hijau-fe`, we need both:
1. Immediate user-facing transparency during every session ("Estimasi Jejak Digital Sesi Ini").
2. Reliable, tamper-resistant telemetry ingestion into `POST /api/v1/public/impact/telemetry` so the backend aggregates platform and per-tenant Net Impact metrics accurately.

Additionally, `@tgwf/co2` v0.19.0 ships ESM/CJS JavaScript bundles without TypeScript `.d.ts` declarations.

## Decision
1. **Install & Wrap `@tgwf/co2` (`^0.19.0`)**:
   - Provide ambient TypeScript types in `types/tgwf-co2.d.ts` so `tsc --noEmit` enforces strict type checking across all `@tgwf/co2` calls.
   - Instantiate `new co2({ model: "swd", version: 4 })` in `lib/carbon/swdm.ts` (`estimateWithCO2js`) to compute official CO2.js SWDM v4 estimates in real time.
2. **Deterministic Integer Cross-Verification**:
   - Alongside `swdmV4.perByte()`, `calculateDeterministicSWDMv4(bytes)` implements the exact `BigInt` integer fixed-point formula used by the Go backend (`floor((bytes * 35,568 + 500,000) / 1,000,000)` µg CO2e). This guarantees microgram-level consistency between the live UI badge and stored backend ledger rows.
3. **Browser Measurement via `PerformanceObserver`**:
   - `<CarbonTelemetryProvider>` monitors `"navigation"` and `"resource"` entries via `PerformanceObserver` (`buffered: true`), reading `transferSize` (with `encodedBodySize` fallback) and tracking seen `PerformanceEntry` objects in a `WeakSet`.
   - `shouldTrackResourceUrl()` explicitly excludes `/api/v1/public/impact/telemetry`, `data:`, and `blob:` URIs to eliminate infinite telemetry loops.
4. **Telemetry Dispatch & UI Indicator**:
   - Unreported bytes per `page_path` are sent via `navigator.sendBeacon` (or `fetch(..., { keepalive: true })`) on route navigation and `visibilitychange` (`hidden`), failing silently when offline.
   - `<SessionCarbonBadge />` renders a compact footer badge showing transferred bytes and estimated CO2e (`SWDM v4 · CO2.js`), wrapped in `<Suspense>` inside `app/layout.tsx`.

## Consequences
- Users see real-time digital footprint accountability on every screen without waiting for a server round-trip.
- Backend `digital_footprint_measurements` rows remain auditable because the server recomputes CO2e deterministically from raw `data_bytes_transferred`.
- Telemetry never blocks or degrades offline deposit recording.
