# Project Context — Setor Hijau Frontend

Read this first. It is written so any AI agent or new contributor can understand the frontend repository without prior chat history.

## What this is
**Setor Hijau** is a web-based, multi-tenant SaaS information system for waste banks (bank sampah) at RW (Rukun Warga, neighborhood) level in Indonesia. One platform serves many bank sampah; each bank sampah is a tenant whose data is isolated from the others.

This repository (`setor-hijau-fe`) is the **frontend web application** built with Next.js App Router. It connects to the live Go backend API deployed on Google Cloud Run:
- **Production Backend URL**: `https://prod-setor-hijau.cloud.run`
- **API Docs / Spec**: `https://prod-setor-hijau.cloud.run/docs` and `/openapi.yaml`

Besides showing rupiah balances and deposit receipts (*struk digital*), the frontend presents the **Carbon Ledger** (estimated CO2e avoided via US EPA WARM v16 on the backend), calculates and displays the app's own real-time **Digital Carbon Footprint** via `@tgwf/co2` (CO2.js, SWDM v4), and presents the **Net Impact Meter** and public **"Metode & Sumber"** page.

## Why it exists
- Course final project: "Proyek Akhir Sistem Informasi Berkelanjutan", Sistem Informasi, Fakultas Ilmu Komputer, Universitas Brawijaya (2026).
- Portfolio project for the owner (Audy), requiring high engineering craft, strict verification (`make check`), documented decisions (ADRs), and honest sustainability reporting.
- Sustainability angle: Triple Bottom Line (people, planet, profit) and Green Software Engineering.

## Who
- Owner/lead developer: Audy (Indonesian speaker).
- End users:
  - **Pengelola**: Officer and administrator of one bank sampah (registers tenant, manages nasabah & prices, records deposits offline/online, manages cashbook, exports monthly CSV/PDF reports).
  - **Nasabah**: RW resident with an account at one bank sampah (tracks rupiah balance, tabungan karbon, deposit history + digital receipt, and sorting guide).
  - **Public (no login)**: Anyone viewing the landing page, **Net Impact Meter**, and **"Metode & Sumber"** transparency page.
- Only `pengelola` and `nasabah` roles exist.

## Scope
In scope: bank sampah registration, login (identifier + password primary; optional QR + PIN for Nasabah), nasabah management, material types & price history, offline-tolerant deposit recording (IndexedDB queue + idempotency key sync), digital receipt (*struk digital*), automatic cashbook & withdrawals, monthly dashboard & CSV/PDF report downloads, Carbon Ledger views, real-time `@tgwf/co2` digital footprint telemetry, Net Impact Meter, public "Metode & Sumber" page, and sorting guide.

Out of scope: digital payments, marketplace integration, kelurahan-level dashboard, pickup scheduling, leaderboard, organic waste carbon accounting. Details: [`docs/PRODUCT.md`](PRODUCT.md).

## Tech stack and decisions
| Area | Choice |
|---|---|
| Framework | Next.js 16.4 (App Router, `cacheComponents: true`) |
| UI Runtime | React 19.3, TypeScript 5 (`strict: true`) |
| Styling & Design | Tailwind CSS 4.3 (`@tailwindcss/turbopack`) + Hallmark skill (`.agents/skills/hallmark/SKILL.md`) |
| Carbon Telemetry | `@tgwf/co2` (>= 0.19, SWDM v4) + browser `PerformanceObserver` |
| Offline Storage | IndexedDB queue (`idempotency_key` + `client_recorded_at`) |
| Testing & Lint | Vitest + ESLint 9 (`eslint-config-next`) + `tsc --noEmit` |
| Primary Hosting | Vercel |
| Portable Fallback | Docker standalone image on Google Cloud Run |

Rationale and alternatives are in [`docs/decisions/0001-frontend-stack-and-hosting.md`](decisions/0001-frontend-stack-and-hosting.md) and [`docs/decisions/0002-co2js-digital-footprint-telemetry.md`](decisions/0002-co2js-digital-footprint-telemetry.md).

## Non-negotiables (summary; full list in `/AGENTS.md`)
- Two roles only (`pengelola`, `nasabah`) + public pages; respect tenant/role isolation.
- Never use floating-point numbers in state or API payloads for money (`amount_idr`), weight (`weight_grams`), or emissions (`co2e_grams`, `co2e_micrograms`). Format only in display helpers (`lib/format/units.ts`).
- Deposits always attach a client-generated UUIDv4 `idempotency_key` and `client_recorded_at` timestamp, and queue in IndexedDB when offline.
- Carbon figures are **estimates** and must always be labeled clearly (`Estimasi`, `estimated_`).
- Measure session bytes with `PerformanceObserver` + `@tgwf/co2` (SWDM v4) and dispatch to `POST /api/v1/public/impact/telemetry` while ignoring telemetry requests themselves.
- Regular login (identifier + password) is primary; QR + PIN is optional extra for Nasabah; Pengelola QR scan is lookup-only.
- User-facing UI copy is in Indonesian; code, types, and engineering docs are in English.

## Carbon telemetry in one paragraph
While avoided CO2e from physical recycling is computed server-side using US EPA WARM v16 integer PPM factors, the frontend measures the web app's own data transfer footprint per route using the browser `PerformanceObserver` API (`navigation` + `resource` entries). It estimates emissions locally in real time using `@tgwf/co2` (`model: "swd"`, `version: 4` — `35.568 g CO2e / GB`) alongside the exact deterministic microgram formula (`floor((bytes * 35,568 + 500,000) / 1,000,000)`), surfaces a transparent session indicator (*"Estimasi Jejak Digital Sesi Ini"*), and sends raw `data_bytes_transferred` to `POST /api/v1/public/impact/telemetry` so the backend stores reproducible inputs for the Net Impact Meter. Full specification: [`docs/CARBON-TELEMETRY.md`](CARBON-TELEMETRY.md).

## Current status
_Update this section whenever work is handed off._
- **Milestone M0 (Harness, Scaffolding & CO2.js Telemetry Engine) is completed**:
  - Agent rulebook (`/AGENTS.md`) preserving Next.js 16 agent rules block and enforcing 10 frontend hard rules.
  - Documentation system of record (`docs/PROJECT-CONTEXT.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/CARBON-TELEMETRY.md`, `docs/API-CONTRACT.md`, ADRs `0001` & `0002`, `docs/plans/ROADMAP.md`).
  - Dependencies installed: `@tgwf/co2` (`^0.19.0`), `vitest` (`^5.1.1`), `@types/node` (`^22`), plus ambient module declaration in `types/tgwf-co2.d.ts`.
  - Tooling harness: `Makefile`, `.env.example`, `vitest.config.ts`, `package.json` scripts (`lint`, `typecheck`, `test`, `check`), and GitHub Actions CI (`.github/workflows/ci.yml`).
  - Environment & API client: `lib/config/env.ts` and `lib/api/client.ts` configured for `https://prod-setor-hijau.cloud.run`.
  - Integer unit display formatters: `lib/format/units.ts` (Rupiah, grams/kg, CO2e grams/micrograms, bytes).
  - CO2.js digital carbon telemetry subsystem: `lib/carbon/swdm.ts`, `lib/carbon/telemetry.ts`, `components/carbon/carbon-telemetry-provider.tsx` (`<CarbonTelemetryProvider>` + `<SessionCarbonBadge />`) wired into `app/layout.tsx`.
  - Unit tests in `lib/__tests__/` covering `@tgwf/co2` SWDM v4 estimation, hand-verified microgram/gram math, telemetry URL exclusion, integer formatters, and env normalization.
- **Milestone M1 (Public Experience: Landing Page, Net Impact Meter & Metode & Sumber) is completed**:
  - Hallmark `Coral` design system adopted (`app/tokens.css`, `app/base.css`, `app/globals.css`, `public/cotton.svg`, `public/felt.svg`) with `General Sans` + `Geist Mono` (`next/font/google`), and `<SessionCarbonBadge />` aligned to design tokens.
  - Typed public API client (`lib/api/public.ts`) + unit tests (`lib/__tests__/public-api.test.ts`) consuming `GET /api/v1/public/impact`, `GET /api/v1/public/impact/tenants/:code`, and `GET /api/v1/public/methods`.
  - Public routes implemented with explicit `"Estimasi"` carbon labels: Landing page & live **Net Impact Meter** with tenant code lookup (`app/page.tsx`, `components/public/net-impact-meter.tsx`), **"Metode & Sumber"** (`app/metode/page.tsx`), and **Panduan Pemilahan Sampah** (`app/panduan/page.tsx`).
- **Next milestone**: `M2` — Authentication & Bank Sampah Registration (`docs/plans/ROADMAP.md`).

## Where to look
| Need | File |
|---|---|
| Rules and commands | `/AGENTS.md` |
| Features, roles, screen scope | `PRODUCT.md` |
| Frontend architecture & offline design | `ARCHITECTURE.md` |
| CO2.js & SWDM v4 telemetry spec | `CARBON-TELEMETRY.md` |
| Live backend endpoint reference | `API-CONTRACT.md` |
| Why a choice was made | `decisions/` |
| What to build next | `plans/ROADMAP.md`, `plans/active/` |

## Handoff protocol for agents
1. Read `/AGENTS.md`, this file, `node_modules/next/dist/docs/`, then the active plan in `plans/active/`.
2. Execute one milestone plan at a time; keep `npm run check` (`make check`) and `npm run build` green.
3. Record non-obvious frontend choices as ADRs in `docs/decisions/`.
4. Before stopping, update the plan's status and the "Current status" section above.
