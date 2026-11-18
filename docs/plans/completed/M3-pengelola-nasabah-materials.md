# M3 — Pengelola Workspace: Nasabah & Master Data

Status: COMPLETED

## Goal
1. Create typed Pengelola API clients:
   - `lib/api/nasabah.ts`: `listNasabah`, `createNasabah`, `getNasabahDetail`, `updateNasabah`, `regenerateNasabahQr`, `resetNasabahPassword`, `resetNasabahPin`.
   - `lib/api/materials.ts`: `listMaterials`, `createMaterial`, `getMaterialDetail`, `updateMaterial`, `appendMaterialPrice`, `listMaterialPrices`, `listCarbonFactors`.
2. Build Pengelola navigation & workspace pages under `/pengelola`:
   - Update `components/auth/workspace-shell.tsx` to support Pengelola sub-navigation (`/pengelola`, `/pengelola/nasabah`, `/pengelola/materials`).
   - `/pengelola/nasabah` (`app/pengelola/nasabah/page.tsx`): searchable/filterable Nasabah list (`search`, `rw`, `rt`), Create & Edit Nasabah form, QR Card modal/printable view (`qr_token`), Regenerate QR token, and Pengelola-initiated Password & 6-digit PIN reset actions.
   - `/pengelola/materials` (`app/pengelola/materials/page.tsx`): Master Data Jenis & Harga Sampah list with active integer Rupiah `price_per_kg_idr`, Create & Edit Material form (linked to WARM v16 carbon factor if supported), Append-only Price Update (`POST /api/v1/materials/:id/prices`), and Price History viewer (`GET /api/v1/materials/:id/prices`).
   - Update `/pengelola` (`app/pengelola/page.tsx`) with direct links to the live M3 modules.
3. Add Vitest unit tests (`lib/__tests__/pengelola-api.test.ts`) verifying integer price/parameter handling and endpoint contracts.

## Acceptance Criteria
- Price changes use append-only `POST /api/v1/materials/:id/prices` and display full history.
- All prices in forms and state remain integer Rupiah (`price_per_kg_idr`, no floats).
- Nasabah CRUD, QR card view/print, QR regeneration, and PIN/password resets work against the API contract.
- `npm run check` and `npm run build` pass.
