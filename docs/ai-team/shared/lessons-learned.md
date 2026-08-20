# Lessons Learned

Issue log derived from git history, bug reports, and code. Each entry documents the problem, root cause, and what was learned.

---

## 1. /projects/stats Routing Order

**Date:** 2025

**Problem:** Express route handler for `/projects/:projectId` was matching "stats" as a valid `projectId`. Requests to `/projects/stats` returned a 404 because no project with ID "stats" existed in the database.

**Root Cause:** Express matches routes in the order they are registered. The parameterized route `/projects/:projectId` was registered before the specific route `/projects/stats`. When a request came in for `/projects/stats`, Express matched it to the parameterized pattern first and tried to look up a project with id = "stats".

**Lesson:** Always register specific (literal) routes BEFORE parameterized routes. The fix was to move the `/projects/stats` route registration above `/projects/:projectId` in `src/routes/index.ts`.

**Prevention:** Add a lint rule or comment block in `routes/index.ts` warning about route ordering.

---

## 2. Type: integer in OpenAPI Breaks Zod Schemas

**Date:** 2025

**Problem:** After adding a new endpoint with `type: integer` in the OpenAPI YAML, Orval generated broken Zod schemas that caused type errors and runtime validation failures.

**Root Cause:** Orval's Zod code generation does not handle OpenAPI's `type: integer` correctly. The generated Zod schema was invalid TypeScript/JavaScript.

**Lesson:** Always use `type: number` in OpenAPI YAML, never `type: integer`. This is a known Orval limitation with OpenAPI integer types.

**Prevention:** Document this constraint in `conventions.md` and `conventions.md` (done). Add a CI check if possible, or document in `openapi.yaml` as a comment.

---

## 3. MSW Worker Registration in Development

**Date:** 2025

**Problem:** MSW (Mock Service Worker) was not intercepting API calls during frontend development. All requests went to the real backend instead of being mocked.

**Root Cause:** The MSW service worker file was not properly initialized. `msw` requires the browser worker to be registered via `npx msw init public/ --save` (or `pnpm exec msw init public/ --save`), which generates the service worker file in the `public/` directory. Without this step, the browser has no worker to register.

**Lesson:** After `pnpm install`, always run `pnpm exec msw init public/ --save` to generate the MSW worker file in the Vite `public/` directory. This should be part of the development setup steps.

**Prevention:** Document in onboarding docs. Consider adding to `package.json` scripts or a postinstall hook.

---

## 4. pnpm Workspace + Vite Dev Script

**Date:** 2025

**Problem:** Running `pnpm run dev` from the workspace root failed because the root `package.json` has no `dev` script, and pnpm workspaces does not fall back to running `dev` in workspace packages automatically.

**Root Cause:** pnpm workspaces does not automatically proxy unknown scripts to workspace packages. Running `pnpm run dev` at the root finds no `dev` script and exits.

**Lesson:** To run the frontend dev server in a pnpm workspace, use one of:

```bash
pnpm --filter @workspace/academic-workspace run dev
# or
pnpm --filter @workspace/academic-workspace run dev:bypass
```

The `dev:bypass` script skips the pnpm install check, making it faster for repeated restarts.

**Prevention:** Use the explicit `--filter` approach documented in `CLAUDE.md`. Do not document `pnpm run dev` at the root.

---

## 5. Drizzle Schema Push vs Migrations

**Date:** 2025

**Problem:** No migration files existed in the repository. The team was using `drizzle-kit push` to apply schema changes directly to the database during development.

**Root Cause:** `drizzle-kit push` modifies the database directly without generating migration files. It is designed for development/prototyping only. In production, direct schema pushes cause downtime and data loss risk because there is no migration history.

**Lesson:** `drizzle-kit push` is dev-only. For production deployments, always generate migration files with `drizzle-kit generate` and apply them with `drizzle-kit migrate`. This creates a proper migration history and allows for safer, incremental schema changes.

**Prevention:** Use `drizzle-kit push` only in local development. Add a note to `conventions.md` and `architecture.md` about the migration workflow. Consider separating dev and production database connections in the config.

---

## 6. Vite Proxy Only Works in Development

**Date:** 2025

**Problem:** API calls from the frontend worked in development (where Vite proxy was configured) but failed in production (Vercel deployment) because the Vite proxy does not exist in the production build.

**Root Cause:** The Vite proxy configuration in `vite.config.ts` is a Vite development server feature. It intercepts requests matching the proxy pattern and forwards them during `vite dev`. In the production build (Vite build -> `dist/` -> Vercel), there is no Vite server and no proxy. Requests go directly to the configured URL.

**Lesson:** For production, always use the `VITE_API_URL` environment variable set to the absolute URL of the backend VPS (e.g., `https://api.teora.app`). The Vite proxy is only for local development convenience.

**Prevention:** Always test the `VITE_API_URL` configuration before deploying. Document that the proxy is dev-only.

---

## 7. MSW Service Worker vs Playwright page.route

**Date:** 2026-08-17

**Problem:** E2E tests with Playwright's `page.route()` intercepts were failing because MSW's service worker was intercepting API calls at the browser level before Playwright's route handlers could run.

**Root Cause:** In `main.tsx`, MSW is activated when `VITE_MOCK === "true"`. The MSW service worker registers at the browser level and intercepts ALL HTTP requests matching its handlers — before Playwright's `page.route()` can handle them. The dev server runs with `VITE_MOCK=true` so MSW was always active during E2E tests.

**Lesson:** For E2E testing with Playwright, MSW service worker conflicts with `page.route()` intercepts. Solution:
- Use `VITE_E2E=true` env var to skip MSW initialization during E2E tests
- Let Playwright's `page.route()` handle all API mocking
- Set `VITE_E2E=true` in Playwright's `webServer` config
- Keep MSW active for local dev (VITE_MOCK=true without VITE_E2E)

**Prevention:** The `main.tsx` now checks for `VITE_E2E=true` before initializing MSW. When running E2E tests, always use the Playwright-managed dev server (configured via `playwright.config.ts webServer`).

---

## 8. useAuth VITE_MOCK Bypass Bug

**Date:** 2026-08-17

**Problem:** In `VITE_MOCK=true` mode, the `useAuth` hook called `setIsLoading(false)` without calling `fetchMe()`. This meant `user` remained `null` even in mock mode, causing `ProtectedRoute` to redirect authenticated users to login during E2E tests.

**Root Cause:** The `useEffect` in `useAuth.tsx` had this logic:
```ts
if (VITE_MOCK === "true") {
  fetchMe().finally(() => setIsLoading(false));
  return;
}
refresh().finally(() => setIsLoading(false));
```
But `fetchMe()` was NOT being called in the VITE_MOCK path before the fix — it called `setIsLoading(false)` directly, leaving `user` as null.

**Lesson:** When MSW is enabled, `fetchMe()` must be called so MSW can intercept the `/auth/me` request. Never skip the API call in mock mode — the mock intercept IS the API call.

**Prevention:** E2E tests now intercept `/api/auth/me` with `page.route()` to ensure the user is authenticated. The `useAuth` fix ensures `fetchMe()` is called even in mock mode so the intercept works.

---

## 9. page.route Pattern for E2E Auth Mocking

**Date:** 2026-08-17

**Problem:** Dashboard and project page E2E tests failed because `ProtectedRoute` saw no authenticated user.

**Root Cause:** Multiple issues:
1. `page.route()` must be set BEFORE `page.goto()` to intercept from the start
2. Mock must cover ALL API routes the page needs (not just `/auth/me`)
3. Dashboard needs `/api/projects/stats` and `/api/projects`
4. Project page needs project detail, messages, references, attachments, activities, jobs, metadata

**Lesson:** When mocking for authenticated E2E tests, intercept all API routes the page will call:
- Auth: `**/api/auth/me`
- Dashboard: `**/api/projects/stats` + `**/api/projects**`
- Project: individual project + documents, messages, references, attachments, activities, jobs, metadata

**Prevention:** Each E2E spec has a comprehensive mock helper covering all routes. Keep mocks in sync when adding new API endpoints.

---

## 10. GitHub Actions: if Condition on Job with needs Dependency

**Date:** 2026-08-18

**Problem:** In `deploy-backend.yml`, the `deploy` job had `if: needs.setup.outputs.has_changes == 'true'` but `deploy` only declared `needs: build`, not `needs: setup`. GitHub Actions could not resolve `needs.setup.outputs` and the condition would fail.

**Lesson:** In GitHub Actions, `if` conditions on a job can only reference `needs.*.outputs` from jobs that the job actually `needs`. If `deploy needs: build`, it cannot reference `needs.setup.outputs`.

**Prevention:** Remove redundant `if` conditions on downstream jobs that already depend on upstream jobs via `needs`. The `build` job's `if` already gates whether it runs, so `deploy` doesn't need a second check.
