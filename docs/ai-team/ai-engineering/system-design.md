# System Design

Three-layer architecture:

## Layer 1 - Frontend (React SPA)

- artifacts/academic-workspace/
- Port 18543 (dev), builds to dist/
- Vite bundler, Tailwind CSS v4
- TanStack Query for server state
- wouter for routing
- MSW for API mocking in dev
- Vercel deployment (static hosting)

## Layer 2 - API Server (Express)

- artifacts/api-server/
- Port 8080 (production), managed by PM2 on VPS
- Express 5 with typed middleware
- Drizzle ORM for database
- pino for structured logging
- express-rate-limit for rate limiting
- jose + Supabase JWKS for JWT validation

## Layer 3 - Data (PostgreSQL on Supabase)

- lib/db/ with Drizzle schema
- Supabase Auth for authentication
- Supabase storage (future: for attachments)

## Data Flow

User -> React SPA -> HTTP (REST API) -> Express -> Drizzle ORM -> PostgreSQL
User <- React SPA <- HTTP (JSON) <- Express <- Drizzle ORM <- PostgreSQL

Auth: Supabase Auth (frontend) -> JWT cookie -> Express validates via jose -> Supabase JWKS

## Key Boundary

Frontend tidak boleh import dari backend (artifacts/* tidak boleh depend ke artifacts/*). Shared types via lib/ packages.

## CI/CD

- Vercel auto-deploys frontend on push (preview + production)
- Backend: automated deploy via GitHub Actions CI/CD pipeline
  - `.github/workflows/ci.yml` — typecheck + unit tests + E2E tests + build (runs on every push/PR)
  - `.github/workflows/deploy-backend.yml` — build + rsync to VPS + PM2 restart + health check (runs on push to main)
- PM2 ecosystem config: `artifacts/api-server/ecosystem.config.cjs`
- See `devops/deployment.md` for full pipeline documentation
