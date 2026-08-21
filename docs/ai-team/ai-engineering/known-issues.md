# Known Issues

Known issues in the Teora project (not yet fixed).

## 1. Automated test suite (Vitest)

- **Severity:** ~~High~~ — **Status:** ✅ RESOLVED 2026-08-17
- Vitest configured for: api-server, academic-workspace, lib/db, lib/api-zod
- Tests: 91 passing (auth JWT, Zod schemas, integration tests, component tests)
- Run: `pnpm run test`

## 2. Automated E2E testing (Playwright)

- **Severity:** ~~Medium~~ — **Status:** ✅ RESOLVED 2026-08-17
- Playwright E2E tests covering: auth flows, dashboard, project workspace
- Config: `playwright.config.ts`, specs in `tests/e2e/`
- Run: `pnpm test:e2e`

## 3. MSW mock mode may not fully cover edge cases

- **Severity:** Medium
- **Impact:** Some API error paths not testable in mock mode.
- **Workaround:** Test against real API server (requires `DATABASE_URL`).
- **Date identified:** 2025

## 4. No GitHub Actions CI/CD

- **Severity:** ~~High~~ — **Status:** ✅ RESOLVED 2026-08-17
- CI pipeline: `.github/workflows/ci.yml` — typecheck + unit tests + E2E + build
- Deploy pipeline: `.github/workflows/deploy-backend.yml` — builds and deploys backend to VPS on main push
- PM2 ecosystem config: `artifacts/api-server/ecosystem.config.cjs`
- Required: GitHub Secrets (VPS credentials, database URL, Supabase keys, AI API key)
