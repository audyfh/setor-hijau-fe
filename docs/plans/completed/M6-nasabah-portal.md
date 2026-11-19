# M6 — Nasabah Portal

Status: COMPLETED

## Goal
1. Create typed Nasabah Portal API client (`lib/api/nasabah-portal.ts`):
   - `getMyNasabahProfile` (`GET /api/v1/nasabah/me`)
   - `getMyBalance` (`GET /api/v1/nasabah/me/balance`)
   - `getMyCarbon` (`GET /api/v1/nasabah/me/carbon`)
   - `listMyWithdrawals` (`GET /api/v1/nasabah/me/withdrawals`)
   - `updateMyPin` (`PUT /api/v1/nasabah/me/pin`, strict 6-digit numeric validation)
2. Build the live Nasabah Portal at `/nasabah` (`app/nasabah/page.tsx`):
   - Derived Rupiah balance summary (`formatRupiah`), estimated Tabungan Karbon (`formatEstimatedCO2eGrams`, explicitly labeled `"Estimasi"`), and personal profile/QR summary.
   - Own deposit history (`listDeposits`) with inline/printable **Struk Digital** viewer reusing `<DigitalReceiptCard />` (`getDepositReceipt`).
   - Own cash withdrawal history (`listMyWithdrawals`).
   - Self-service 6-digit PIN setup/update form (`updateMyPin`, without ever logging PINs).
   - Direct links to `/panduan` (sorting guide) and `/metode` (carbon methodology).
3. Add Vitest unit tests (`lib/__tests__/nasabah-portal.test.ts`).

## Acceptance Criteria
- Nasabah sees strictly own data and clear `"Estimasi"` carbon labels.
- All money, weight, and carbon figures use integer state/payloads and display formatters from `lib/format/units.ts`.
- 6-digit PIN validation rejects non-6-digit inputs before calling the API and never logs PINs.
- `npm run check` (`make check`) and `npm run build` pass.
