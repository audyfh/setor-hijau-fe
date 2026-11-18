# ADR 0001: Frontend Stack, Offline Storage, and Hosting

Status: Accepted, 2026-11-18

## Context
Setor Hijau's Go backend is deployed and running at `https://prod-setor-hijau.cloud.run/`. The frontend (`setor-hijau-fe`) is a separate Next.js repository serving RW-level bank sampah operations in Indonesia, where:
- Field deposit recording happens outdoors at neighborhood outposts (*pos RW*) with intermittent connectivity.
- Green Software Engineering requires minimal JavaScript payloads, server-first rendering where possible, and explicit carbon accounting.
- The course project requires zero vendor lock-in and reproducible CI checks (`make check`).

## Decision
1. **Framework & Language**: Next.js 16.4 (App Router with `cacheComponents: true` and `partialPrefetching: true`), React 19.3, and TypeScript 5 (`strict: true`).
2. **Styling & Design System**: Tailwind CSS 4.3 (`@tailwindcss/turbopack`) governed by the Hallmark UI skill (`.agents/skills/hallmark/SKILL.md`), ensuring CSS token discipline, accessibility (`:focus-visible`, `prefers-reduced-motion`), and zero bloated UI libraries.
3. **Offline Storage**: Browser **IndexedDB** for caching Nasabah/material reference lists and storing the offline deposit outbox queue keyed by client-generated UUIDv4 `idempotency_key` and `client_recorded_at`.
4. **Testing & Quality Harness**: ESLint 9 (`eslint-config-next`), TypeScript (`tsc --noEmit`), and **Vitest** (`^5.1.1` with `@types/node@^22`), unified behind `npm run check` / `make check` and GitHub Actions CI.
5. **Hosting & Portability**:
   - **Primary**: **Vercel** for zero-config Next.js 16 Edge/Serverless deployment, configured strictly via `NEXT_PUBLIC_API_BASE_URL`.
   - **Portable Fallback**: Docker standalone build (`output: "standalone"` in `next.config.ts`) deployable to **Google Cloud Run** alongside the Go backend.

## Consequences
- No Vercel-proprietary SDKs or vendor-specific database bindings are permitted inside application code.
- Switching between local development (`localhost:8080`), Cloud Run production (`https://prod-setor-hijau.cloud.run`), or another host requires only changing `NEXT_PUBLIC_API_BASE_URL`.
- Because `cacheComponents: true` is active in `next.config.ts`, client components mounted inside Server Component layouts (such as `<CarbonTelemetryProvider>`) must be wrapped in `<Suspense>` to keep static/partial prerendering clean.
