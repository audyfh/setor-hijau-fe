<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Setor Hijau Frontend

Setor Hijau is a multi-tenant SaaS waste bank (bank sampah) system at RW level. Each bank sampah is a tenant.
Besides rupiah balances, it records a per-deposit carbon ledger (CO2e avoided) and a Net Impact Meter
(avoided CO2e minus the app's own estimated digital footprint). This repo is the **frontend only**; it consumes the live Go backend API at `https://prod-setor-hijau.cloud.run/` (OpenAPI spec at `/openapi.yaml`, Swagger UI at `/docs`).

**New here (human or AI agent)? Read `docs/PROJECT-CONTEXT.md` first**, then the doc for the area you are touching, and check `node_modules/next/dist/docs/` for Next.js 16 conventions.
This file is the map and the rulebook. Details live in `docs/`.

## Stack
- Next.js 16.4 (`App Router`, `cacheComponents: true`), React 19.3, TypeScript 5 (`strict: true`)
- Tailwind CSS 4.3 (`@tailwindcss/turbopack`)
- `@tgwf/co2` (>= 0.19) for client-side SWDM v4 digital carbon footprint estimation
- IndexedDB for offline deposit recording & background sync queue
- Vitest for unit/component verification; ESLint 9 (`eslint-config-next`)
- UI Design Skill: Hallmark (`.agents/skills/hallmark/SKILL.md`)
- Primary hosting: Vercel. Portable fallback: Docker standalone on Google Cloud Run (`docs/decisions/0001-frontend-stack-and-hosting.md`)

## Commands (run via `make <target>` or `npm run <script>`)
- `make dev` / `npm run dev` — start Next.js development server
- `make build` / `npm run build` — production build
- `make lint` / `npm run lint` — run ESLint (`eslint-config-next`)
- `make typecheck` / `npm run typecheck` — run TypeScript compiler (`tsc --noEmit`)
- `make test` / `npm run test` — run Vitest unit tests
- `make check` / `npm run check` — lint + typecheck + test; must pass before any change is considered done

## Hard rules (do not violate; tests and reviews enforce them)
1. *Multi-tenant & role isolation*: Only two authenticated roles exist (`pengelola`, `nasabah`), plus unauthenticated public routes. Tenant context comes from the authenticated session/JWT; never allow cross-tenant URL or request parameter tampering.
2. *No floats for money, weight, or emissions in state/payloads*: Store and transmit money as integer Rupiah (`amount_idr`), weight as integer grams (`weight_grams`), and carbon as integer grams/micrograms (`co2e_grams`, `co2e_micrograms`). Format to `Rp`, `kg`, or `g/kg CO₂e` exclusively at the display boundary (`lib/format/units.ts`).
3. *Offline-first & idempotent deposit recording*: Every deposit recorded by a Pengelola must generate a client `idempotency_key` (UUIDv4) and `client_recorded_at` (ISO 8601 timestamp) at the exact moment of physical weighing, queue safely in IndexedDB when offline, and sync to `POST /api/v1/deposits` or `POST /api/v1/deposits/sync`.
4. *Carbon honesty*: All carbon figures (US EPA WARM v16 avoided emissions and SWDM v4 digital footprint) are **estimates**, never physical sensor measurements. UI labels and TypeScript types must explicitly mark them as estimates (`Estimasi`, `estimated_`).
5. *Digital footprint telemetry (`@tgwf/co2` SWDM v4)*: Every page visit measures transferred bytes via `PerformanceObserver`, computes local real-time estimates with `@tgwf/co2` (`model: "swd"`, `version: 4`) + deterministic integer microgram math (`lib/carbon/swdm.ts`), updates the session indicator, and sends `data_bytes_transferred` to `POST /api/v1/public/impact/telemetry`. Never measure or report requests to `/api/v1/public/impact/telemetry` itself (prevents telemetry recursion).
6. *Authentication discipline*: Regular login (`identifier` + `password`, plus `bank_sampah_code` for Nasabah) is primary. QR code + 6-digit PIN (`POST /api/v1/auth/login/qr`) is an optional extra for Nasabah and never the sole login method. Pengelola QR scanning (`POST /api/v1/nasabah/lookup-qr`) only identifies a Nasabah for deposit entry and never creates a Nasabah session. Never log tokens, passwords, or PINs.
7. *Green Software Engineering*: Default to React Server Components (`app/`), keep client JS bundles minimal, avoid heavy third-party UI/chart libraries when native CSS/SVG suffices, respect `prefers-reduced-motion`, and follow Next.js 16 caching semantics (`cacheComponents`).
8. *Stay in scope*: Out of scope: digital payments, marketplace integration, kelurahan-level dashboard, pickup scheduling, leaderboard, organic waste carbon accounting.
9. *Design system & Hallmark skill*: When designing pages/components, follow `.agents/skills/hallmark/SKILL.md` — all colors and fonts via CSS tokens at `:root`, no `transition: all`, `:focus-visible` on every interactive element, no invented metrics, testimonials, or logo walls.
10. *Language*: End-user UI copy and thesis docs are in Indonesian; code, identifiers, types, and engineering docs are in English.

## Layout (target)
```
app/                 Next.js App Router pages, layouts, and route groups (public, auth, pengelola, nasabah)
components/          Shared UI & feature client/server components (carbon/, ui/, etc.)
lib/api/             Typed HTTP client & endpoint modules consuming the Go backend
lib/auth/            Session state, token refresh, and role guards
lib/carbon/          @tgwf/co2 SWDM v4 estimator, deterministic microgram math, and telemetry dispatcher
lib/config/          Validated environment config (NEXT_PUBLIC_API_BASE_URL)
lib/format/          Pure display formatters (Rupiah, grams/kg, CO2e, bytes)
lib/offline/         IndexedDB offline deposit queue & background sync engine
types/               Ambient module declarations and shared domain types
docs/                System of record
```

## Working agreements
- Work from the active plan in `docs/plans/active/`; one plan file per milestone/task, move to `docs/plans/completed/` when done.
- Non-obvious frontend architectural choice? Record an ADR in `docs/decisions/` instead of leaving it in chat.
- Definition of done: `make check` (`npm run check`) and `npm run build` pass, new logic has Vitest unit tests, and docs (`PROJECT-CONTEXT.md` + plan status) are updated.
- Handing off to another agent or session: update the active plan's status and the "Current status" section of `docs/PROJECT-CONTEXT.md` so the next session starts from facts, not chat history.

## Docs index
- `docs/PROJECT-CONTEXT.md` — start here: context, live backend, stack, scope, status, handoff protocol
- `docs/PRODUCT.md` — roles, page map, offline UX, honesty rules, out-of-scope
- `docs/ARCHITECTURE.md` — Next.js 16 structure, RSC vs client boundaries, auth, IndexedDB offline sync, Green Software
- `docs/CARBON-TELEMETRY.md` — `@tgwf/co2` (SWDM v4) calculation, `PerformanceObserver` collection, backend telemetry ingestion
- `docs/API-CONTRACT.md` — endpoint mapping to `https://prod-setor-hijau.cloud.run`
- `docs/plans/ROADMAP.md` — frontend milestones (`M0`–`M7`); `docs/plans/active/` — current task plans
- `docs/decisions/` — ADRs (`0001` stack & hosting, `0002` CO2.js telemetry)
