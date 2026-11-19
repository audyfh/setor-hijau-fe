# M4 — Deposit Recording (Setoran), QR Lookup, Offline Sync & Struk Digital

Status: COMPLETED

## Goal
1. Create typed Deposit & QR Lookup API client (`lib/api/deposits.ts`):
   - `lookupNasabahByQr` (`POST /api/v1/nasabah/lookup-qr`, Pengelola lookup only, no Nasabah session)
   - `createDeposit` (`POST /api/v1/deposits`, handles `201` created and `200` idempotent replay)
   - `syncDeposits` (`POST /api/v1/deposits/sync`)
   - `listDeposits` (`GET /api/v1/deposits`)
   - `getDepositDetail` (`GET /api/v1/deposits/:id`)
   - `getDepositReceipt` (`GET /api/v1/deposits/:id/receipt`)
   - Pure integer preview helpers (`calculateLineSubtotalIdr`, `calculateEstimatedCo2eGrams`) with strict integer gram validation.
2. Build IndexedDB offline cache & outbox sync subsystem (`lib/offline/db.ts`, `lib/offline/sync.ts`):
   - Cache active Nasabah directory, materials, and WARM v16 carbon factors locally in IndexedDB.
   - Persist offline deposits in an IndexedDB outbox keyed by client-generated UUIDv4 `idempotency_key` and `client_recorded_at`.
   - Automatic (`online` event) and manual ("Sinkronkan Sekarang") sync via `POST /api/v1/deposits/sync`, reconciling `created`, `replayed`, and `error` outcomes cleanly.
3. Build Pengelola Deposit Recording & Struk Digital UI:
   - Update `PENGELOLA_NAV` and `/pengelola` (`app/pengelola/page.tsx`) to link to `/pengelola/deposits`.
   - `/pengelola/deposits` (`app/pengelola/deposits/page.tsx`):
     - Online/offline status indicator, reference cache sync, and pending outbox panel.
     - Nasabah selector + QR Lookup modal (`components/pengelola/qr-lookup-modal.tsx`) supporting camera `BarcodeDetector` (when available) and manual/USB QR token entry.
     - Multi-line deposit form with integer gram (`weight_grams`) inputs, live integer Rupiah subtotal & estimated WARM v16 CO2e preview.
     - Recent deposits table with direct Struk Digital access.
   - Reusable `<DigitalReceiptCard />` (`components/deposits/digital-receipt-card.tsx`) and dedicated printable route `/pengelola/deposits/[id]/receipt` (`app/pengelola/deposits/[id]/receipt/page.tsx`).
4. Add Vitest unit tests (`lib/__tests__/deposits-offline.test.ts`) covering integer validation, API contracts, preview math, and offline outbox sync reconciliation.

## Acceptance Criteria
- All weights (`weight_grams`), prices (`price_per_kg_idr`), totals (`amount_idr`), and carbon values remain integers in state and API payloads.
- Every deposit generates a UUIDv4 `idempotency_key` and `client_recorded_at` at submission time.
- Offline deposits persist in IndexedDB across reloads and sync without duplicates via `POST /api/v1/deposits/sync`.
- Struk Digital renders Rupiah and explicitly labeled `"Estimasi"` avoided CO2e per line and total, with print support.
- `npm run check` and `npm run build` pass.
