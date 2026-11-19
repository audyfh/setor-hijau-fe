# M5 — Cashbook (Buku Kas), Dashboard Bulanan & Export Reports

Status: COMPLETED

## Goal
1. Extend `lib/auth/fetch-auth.ts` with `authFetchBlob` sharing the single-flight `401` refresh token rotation for authenticated CSV/PDF downloads.
2. Create typed Pengelola API clients:
   - `lib/api/cashbook.ts`: `createSale`, `listSales`, `getSaleDetail`, `createWithdrawal`, `listNasabahWithdrawals`, `getNasabahBalance`, `createCashbookEntry`, `listCashbookEntries`, `getCashbookSummary`, `getCashbookReconciliation`, plus integer validation and subtotal helpers.
   - `lib/api/reports.ts`: `getMonthlyDashboard`, `downloadMonthlyCsv`, `downloadMonthlyPdf`, `triggerBrowserDownload`.
   - `lib/api/carbon.ts`: `listCarbonLedger`, `getCarbonSummary`, `createCarbonReversal`.
3. Build Pengelola M5 workspace pages & navigation:
   - Update `PENGELOLA_NAV` and `PENGELOLA_MODULES` in `app/pengelola/page.tsx` with `/pengelola/cashbook` and `/pengelola/reports`.
   - `/pengelola/cashbook` (`app/pengelola/cashbook/page.tsx`): Cashbook summary & reconciliation, wholesale sales to Pengepul, Nasabah cash withdrawals (with live balance check), and manual cashbook entries.
   - `/pengelola/reports` (`app/pengelola/reports/page.tsx`): Monthly Dashboard (`YYYY-MM`), authenticated CSV & PDF report exports, and append-only Carbon Ledger viewer with reversal recording (`Estimasi` labeled).
4. Add Vitest unit tests (`lib/__tests__/cashbook-reports-carbon.test.ts`).

## Acceptance Criteria
- All money (`amount_idr`, `price_per_kg_idr`) and weight (`weight_grams`) values remain integers in state and API payloads.
- Cashbook summary & reconciliation views match backend totals cleanly.
- CSV & PDF downloads send `Authorization: Bearer <token>` via `authFetchBlob` and handle `401` refresh rotation.
- Carbon Ledger and Monthly Dashboard explicitly label all carbon figures as `"Estimasi"`; reversals append a new reversing entry without mutating history.
- `npm run check` (`make check`) and `npm run build` pass.
