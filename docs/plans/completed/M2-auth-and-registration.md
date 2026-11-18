# M2 — Authentication, Bank Sampah Registration & SaaS Landing Page Emphasis

Status: COMPLETED

## Goal
1. Update the landing page (`app/page.tsx`) to emphasize the **Setor Hijau SaaS product** explanation (value proposition for RW-level multi-tenant bank sampah: Pengelola & Nasabah roles, offline-first deposits, automated cashbook, carbon ledger & Net Impact Meter), while keeping the existing **Contoh Format Struk Digital** illustration intact, and wiring CTA links to `/daftar` and `/login`.
2. Implement `lib/auth/` and `lib/api/auth.ts`:
   - Typed auth & tenant registration API client (`POST /api/v1/tenants/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/login/qr`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, `GET /api/v1/auth/me`, `GET /api/v1/tenants/current`).
   - Session storage (`lib/auth/session.ts`), automatic `401` refresh-token rotation in authenticated API helper (`lib/api/client.ts` or `lib/auth/fetch-auth.ts`), React `<AuthProvider>` context (`components/auth/auth-provider.tsx`), and role-based route guard (`components/auth/role-guard.tsx`).
   - Strict security discipline: never log tokens, passwords, or PINs; `pengelola` and `nasabah` roles only.
3. Build auth & registration UI routes:
   - `/daftar` (`app/daftar/page.tsx`): Bank Sampah tenant registration + initial Pengelola account (`POST /api/v1/tenants/register`).
   - `/login` (`app/login/page.tsx`): Primary login (`identifier` + `password`, plus `bank_sampah_code` toggle for Nasabah) + optional Nasabah QR token + 6-digit PIN login tab (`POST /api/v1/auth/login/qr`).
   - `/lupa-password` (`app/lupa-password/page.tsx`): Pengelola forgot-password (`POST /api/v1/auth/forgot-password`) and reset-password (`POST /api/v1/auth/reset-password`).
   - `/pengelola` (`app/pengelola/page.tsx`): Role-guarded Pengelola workspace shell (ready for M3–M5 features, with logout & session info).
   - `/nasabah` (`app/nasabah/page.tsx`): Role-guarded Nasabah portal shell (ready for M6 features, with logout & session info).
4. Add Vitest unit tests for auth session storage, refresh token rotation, and auth API calls.

## Acceptance Criteria
- Both `pengelola` and `nasabah` can log in, refresh tokens on `401`, and log out cleanly.
- QR + 6-digit PIN is an optional secondary tab for Nasabah only.
- No tokens, passwords, or PINs are logged to console.
- Landing page emphasizes Setor Hijau as a multi-tenant RW bank sampah SaaS while keeping the Struk Digital illustration intact.
- `npm run check`, `npm run build`, and `sloplint.mjs` pass.
