# M1 — Public Experience: Landing Page, Net Impact Meter & Metode & Sumber

Status: COMPLETED

## Goal
Build the public-facing experience for Setor Hijau using the Hallmark `Coral` design system:
1. Adopt `tokens.css` and `base.css` with Setor Hijau brand styling and update `SessionCarbonBadge` to use design tokens.
2. Create typed public API client (`lib/api/public.ts`) consuming `GET /api/v1/public/impact`, `GET /api/v1/public/impact/tenants/:code`, and `GET /api/v1/public/methods`.
3. Build Landing Page (`app/page.tsx`) with hero, workflow overview, live **Net Impact Meter** (platform + per-tenant lookup by code), sorting teaser, and footer.
4. Build **"Metode & Sumber"** page (`app/metode/page.tsx`) displaying WARM v16 factors, SWDM v4 parameters, deterministic formulas, and academic disclaimers.
5. Build **Panduan Pemilahan Sampah** page (`app/panduan/page.tsx`) for inorganic waste categories.

## Acceptance Criteria
- Public pages render live Cloud Run data from `https://prod-setor-hijau.cloud.run`.
- All carbon figures are explicitly labeled as estimates (`Estimasi`).
- `sloplint.mjs` passes with 0 `FAIL`.
- `npm run check` (`lint`, `typecheck`, `test`) and `npm run build` pass.
- Unit tests cover `lib/api/public.ts` and public data formatting.
