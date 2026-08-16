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
