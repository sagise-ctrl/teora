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
- Port 8080 (local dev), managed by Vercel Functions (serverless)
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
- Backend: deployed as Vercel Function via Vercel's built-in CI/CD (no separate deploy workflow)
  - `.github/workflows/ci.yml` — typecheck + unit tests + E2E tests + build (runs on every push/PR)
  - Vercel Function — builds via `node ./build.mjs` and deploys automatically on push to main
- See `ai-engineering/deployment.md` for full pipeline documentation
