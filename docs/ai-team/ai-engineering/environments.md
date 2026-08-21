# Environments

## Local Development

- Frontend: `pnpm --filter @workspace/academic-workspace run dev:bypass` (port 18543)
- Backend: `pnpm --filter @workspace/api-server run dev` (port 8080)
- Requires: DATABASE_URL, SUPABASE_JWT_SECRET, AI_* env vars in api-server .env
- Frontend mock mode: VITE_MOCK=true (default in .env)
- API URL: VITE_API_URL empty = relative (for proxy) or http://localhost:8080

## Frontend Dev with Mock API

```
cd artifacts/academic-workspace
pnpm run dev:bypass
# Opens localhost:18543 with MSW intercepting API calls
```

## Frontend Dev with Real API

```
# Terminal 1: Start API
cd artifacts/api-server
pnpm run dev
# (Requires DATABASE_URL, etc. in .env)

# Terminal 2: Start frontend
pnpm --filter @workspace/academic-workspace run dev:bypass
# Set VITE_API_URL=http://localhost:8080 in .env
```

## Production (Vercel)

- Build: pnpm --filter @workspace/academic-workspace run build
- Output: artifacts/academic-workspace/dist/public
- Required env vars on Vercel: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Vercel auto-builds on push to linked branch

## VPS (Backend)

- Manual deployment via PM2
- Env vars managed on VPS (not in git)
- No CI/CD pipeline yet - manual deploy
