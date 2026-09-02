# Deployment

## Frontend -> Vercel

- Triggered automatically on push to linked Git branch
- Build command: pnpm --filter @workspace/academic-workspace run build
- Output directory: artifacts/academic-workspace/dist/public
- Environment vars: set via Vercel dashboard or `vercel env add`
- Preview: https://academic-workspace-[hash].vercel.app
- Production: teora.vercel.app (needs domain config)

## Backend -> Vercel Function

- **Automated via Vercel** — deploys automatically on push to linked Git branch
- Build command: `node ./build.mjs` (framework: null in vercel.json)
- Output: `artifacts/api-server/api/index.mjs` (Vercel Function handler)
- The build also produces `artifacts/api-server/dist/index.mjs` for local dev
- Vercel auto-detects serverless functions in the `api/` directory

### Vercel Configuration

vercel.json (framework: null, buildCommand: node ./build.mjs):
- api/index.ts -> api/index.mjs (Vercel Function entry)
- src/index.ts -> dist/index.mjs (local dev server)

### Vercel Environment Variables

Required on Vercel:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_POOLER_URL` | Supabase connection pooler URL (preferred over DATABASE_URL for serverless) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_JWT_SECRET` | JWT secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `AI_API_KEY` | AI provider API key |

Note: `DATABASE_POOLER_URL` is recommended for Vercel Functions (pooled connections reduce database connection overhead). If not set, falls back to `DATABASE_URL`.

### Manual Local Build (fallback)

If Vercel is unavailable:

```bash
pnpm --filter @workspace/api-server run build
```

This produces both the Vercel Function handler (`api/index.mjs`) and the local dev server (`dist/index.mjs`).

## CI/CD Pipeline

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and PR:
1. **typecheck** — TypeScript type checking
2. **test** — Unit tests (Vitest)
3. **test-e2e** — E2E tests (Playwright)
4. **build** — Production build

All jobs run in parallel after setup. `build` is the final gate.

### Deploy Pipeline

- Frontend and backend deploy automatically via Vercel's built-in CI/CD
- No separate deploy workflow needed — Vercel handles both
- Backend deploys as Vercel Function (serverless)

## Database

- PostgreSQL on Supabase (managed)
- Schema changes: drizzle-kit push (dev) / migrations (prod)
- NEVER run drizzle-kit push on production database directly

## After Schema Changes (Development)

1. pnpm --filter @workspace/db run push
2. pnpm --filter @workspace/api-spec run codegen
3. pnpm run typecheck:libs

## After Schema Changes (Production)

1. pnpm --filter @workspace/db run generate (create migration)
2. Review migration SQL
3. Apply migration to production (drizzle-kit migrate or manual SQL)
4. Run codegen + typecheck
5. Vercel auto-deploys on next push

## Backup Plan: VPS Migration

If a future migration to VPS is needed, see `production-operations/vps-migration-guide.md`.
