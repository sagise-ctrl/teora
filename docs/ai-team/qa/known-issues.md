# Known Issues

Known issues in the Teora project (not yet fixed).

## 1. No automated test suite

- ~~**Severity:** High~~ — **Status:** ✅ RESOLVED 2026-08-16 — Vitest installed, 34 tests passing
- Vitest configured for: api-server, academic-workspace, lib/db, lib/api-zod
- Initial tests: JWT validation (6) + Zod schema validation (28)
- Run: `pnpm test`

## 2. MSW mock mode may not fully cover edge cases

- **Severity:** Medium
- **Impact:** Some API error paths not testable in mock mode.
- **Workaround:** Test against real API server (requires `DATABASE_URL`).
- **Date identified:** 2025

## 3. No E2E testing (Playwright/Cypress)

- **Severity:** Medium
- **Impact:** Cannot verify full user flows automatically.
- **Status:** Not planned yet.
- **Date identified:** 2025
