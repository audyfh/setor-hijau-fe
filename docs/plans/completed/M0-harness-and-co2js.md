# Plan: M0 — Harness, Scaffolding & CO2.js Telemetry Engine

Status: completed (2026-11-18)
Roadmap: `../ROADMAP.md` (M0)

## Goal
Establish the complete agent harness, documentation system of record, verification pipeline (`make check`), API client targeting `https://prod-setor-hijau.cloud.run`, and `@tgwf/co2` (SWDM v4) digital footprint telemetry engine with a live UI session badge.

## Steps Completed
1. Installed `@tgwf/co2` (`^0.19.0`), `vitest` (`^5.1.1`), and `@types/node` (`^22`), and created ambient types in `types/tgwf-co2.d.ts`.
2. Updated `package.json` scripts (`lint`, `typecheck`, `test`, `test:watch`, `check`), added `vitest.config.ts`, `Makefile`, `.env.example`, and `.github/workflows/ci.yml`.
3. Created `/AGENTS.md` (preserving Next.js 16 rules header) and `docs/` system of record (`PROJECT-CONTEXT.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `CARBON-TELEMETRY.md`, `API-CONTRACT.md`, ADRs `0001` & `0002`, `ROADMAP.md`).
4. Implemented `lib/config/env.ts`, `lib/format/units.ts`, `lib/api/client.ts`, `lib/carbon/swdm.ts`, `lib/carbon/telemetry.ts`, and `components/carbon/carbon-telemetry-provider.tsx` (`<CarbonTelemetryProvider>` + `<SessionCarbonBadge />`) mounted inside `<Suspense>` in `app/layout.tsx`.
5. Wrote unit tests in `lib/__tests__/swdm.test.ts`, `lib/__tests__/units.test.ts`, and `lib/__tests__/env.test.ts`.
6. Verified `npm run check` and `npm run build` pass cleanly.

## Acceptance
- `npm run check` (`eslint`, `tsc --noEmit`, `vitest run`) passes locally and in CI.
- `npm run build` succeeds cleanly with Next.js 16 `cacheComponents: true`.
- `@tgwf/co2` SWDM v4 calculation and deterministic integer microgram math match backend `CARBON-METHOD.md` Section 8.2.
