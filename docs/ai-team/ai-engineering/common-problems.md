# Common Problems and Solutions

Known issues and solutions for the Teora codebase.

## 1. "Cannot find module" errors after adding new package

**Fix:** Run `pnpm install` to update lockfile and regenerate types.
**Fix:** Check if package is in the correct workspace.

## 2. MSW not intercepting requests in dev

**Fix:** Run `pnpm exec msw init public/ --save` to regenerate service worker.
**Fix:** Check that `VITE_MOCK=true` is set.
**Fix:** Restart dev server after regenerating the worker.

## 3. TypeScript errors in generated code (Orval output)

**Fix:** Run `pnpm --filter @workspace/api-spec run codegen`.
**Fix:** Check OpenAPI YAML for `type: integer` -- use `type: number` instead (Orval + Zod v3 produce broken schemas with integer).

## 4. Drizzle push fails on production

**Fix:** NEVER use `drizzle-kit push` on production. Create migration files instead.
**Fix:** Run `drizzle-kit generate`, then apply manually or via migration pipeline.

## 5. API returns 401 after refresh

**Context:** JWT expired and refresh failed.
**Fix:** Check `DATABASE_URL`, `SUPABASE_JWT_SECRET` env vars on the server.
**Fix:** Verify Supabase JWT secret matches your project settings.

## 6. Vite build succeeds but app shows blank screen

- Check that `VITE_API_URL` is set correctly for production.
- Check that the API server is running and accessible.
- Check CORS configuration on the backend.

## 7. Supabase Auth session not persisting

**Fix:** Check cookie configuration in the auth route.
**Fix:** Verify `sameSite` and `secure` flags for production.
**Fix:** Check Supabase URL and anon key match the project.
