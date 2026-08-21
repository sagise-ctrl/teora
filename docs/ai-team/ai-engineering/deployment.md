# Deployment

## Frontend -> Vercel

- Triggered automatically on push to linked Git branch
- Build command: pnpm --filter @workspace/academic-workspace run build
- Output directory: artifacts/academic-workspace/dist/public
- Environment vars: set via Vercel dashboard or `vercel env add`
- Preview: https://academic-workspace-[hash].vercel.app
- Production: teora.vercel.app (needs domain config)

## Backend -> VPS Ubuntu 24

- **Automated via GitHub Actions** (`.github/workflows/deploy-backend.yml`)
- Triggered on push to `main` when `artifacts/api-server/` or `lib/db/` changes
- Pipeline: build -> rsync dist/ to VPS -> `pm2 restart teora-api` -> health check
- PM2 process: managed via `ecosystem.config.cjs`
- PM2 process name: `teora-api`
- Restart: `pm2 restart teora-api`

### Manual Deploy (fallback)

If GitHub Actions is unavailable:

1. Build: `pnpm --filter @workspace/api-server run build`
2. Copy `dist/` to VPS
3. Restart: `pm2 restart teora-api`

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private SSH key (with write access to VPS) |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_JWT_SECRET` | JWT secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `AI_API_KEY` | AI provider API key |
| `PORT` | Server port (e.g. 8080) |

### PM2 Ecosystem Config

Located at `artifacts/api-server/ecosystem.config.cjs`. Use:
```bash
pm2 start ecosystem.config.cjs  # start
pm2 restart teora-api           # restart
pm2 logs teora-api              # view logs
pm2 monit                       # monitor
```

## CI/CD Pipeline

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and PR:
1. **typecheck** — TypeScript type checking
2. **test** — Unit tests (Vitest, 91 tests)
3. **test-e2e** — E2E tests (Playwright, 30+ specs)
4. **build** — Production build

All jobs run in parallel after setup. `build` is the final gate.

### Deploy Pipeline (`.github/workflows/deploy-backend.yml`)

Runs on push to `main` when API server or DB files change:
1. **build** — Build API server
2. **deploy** — rsync to VPS + PM2 restart + health check

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
5. Deploy backend
