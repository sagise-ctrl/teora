# Deployment

## Frontend -> Vercel

- Triggered automatically on push to linked Git branch
- Build command: pnpm --filter @workspace/academic-workspace run build
- Output directory: artifacts/academic-workspace/dist/public
- Environment vars: set via Vercel dashboard or `vercel env add`
- Preview: https://academic-workspace-[hash].vercel.app
- Production: teora.vercel.app (needs domain config)

## Backend -> VPS Ubuntu 24

- Manual deployment (no CI/CD yet)
- Build: node build.mjs in artifacts/api-server/
- Deploy: copy dist/ to VPS, restart PM2 process
- PM2 process name: api-server
- Restart: pm2 restart api-server

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
