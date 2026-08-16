# Architecture Decision Records (ADR)

Format per decision: **Decision / Context / Options / Chosen / Reason / Consequences / Date**

---

## ADR-001: OpenAPI as Single Source of Truth

**Decision:** Use OpenAPI YAML as the single source of truth for API types across frontend and backend.

**Context:** The frontend (React) and backend (Express) need consistent types. When the API schema changes, both sides must stay in sync without manual coordination.

**Options:**
1. Manual type definitions -- maintain separate type files, easy to drift
2. tRPC -- end-to-end type safety but requires dedicated backend setup
3. OpenAPI + Orval -- human-readable spec, auto-generates Zod schemas and TanStack Query hooks

**Chosen:** Option 3 -- OpenAPI + Orval

**Reason:** OpenAPI spec is readable by both humans and tools. Orval generates both Zod schemas (`api-zod`) and TanStack Query hooks (`api-client-react`) automatically from the same spec. Changes are visible in a single file before they propagate.

**Consequences:**
- Must run `pnpm --filter @workspace/api-spec run codegen` after any API schema change
- Generated files are committed to the repo (not re-generated at build time)
- Schema drift between YAML and implementation causes type mismatches at runtime

**Date:** 2025

---

## ADR-002: Supabase for Authentication

**Decision:** Use Supabase Auth instead of building custom authentication.

**Context:** Authentication is security-sensitive and complex. Building custom auth from scratch risks introducing vulnerabilities. The project already uses Supabase PostgreSQL.

**Options:**
1. Supabase Auth -- integrated with database, built-in JWT, OAuth, email verification
2. Clerk -- powerful auth, additional cost, separate from database
3. Custom JWT -- full control, high maintenance burden, security risk

**Chosen:** Option 1 -- Supabase Auth

**Reason:** Supabase integrates naturally with the Supabase PostgreSQL database, provides built-in JWT validation (via `jose` + JWKS), supports OAuth providers, and includes email verification. No additional vendor to manage.

**Consequences:**
- Frontend uses Supabase SDK (`@supabase/supabase-js`) for auth flows
- Backend validates Supabase JWT via `jose` library against Supabase JWKS endpoint
- Auth state managed client-side; JWT passed on every API request
- Supabase project must be kept active (vendor lock-in to Supabase ecosystem)

**Date:** 2025

---

## ADR-003: TanStack Query for Server State

**Decision:** Use TanStack Query for all server state management.

**Context:** The React app fetches data from the API extensively. Need consistent caching, loading states, error handling, and cache invalidation on mutations.

**Options:**
1. TanStack Query -- robust caching, explicit query keys, hooks auto-generated
2. SWR -- similar features, slightly different API
3. RTK Query -- Redux-based, heavier
4. Manual fetch + Context -- ad-hoc, hard to maintain

**Chosen:** Option 1 -- TanStack Query

**Reason:** TanStack Query has superior cache invalidation mechanisms. Query keys are explicit and composable, making it easy to invalidate related queries on mutations. Orval generates hooks directly from the OpenAPI spec, reducing boilerplate to near zero.

**Consequences:**
- All data fetching goes through TanStack Query hooks (no raw `fetch` in components)
- Must invalidate queries after mutations (`queryClient.invalidateQueries`)
- Loading and error states handled by TanStack Query (`isLoading`, `isError`)
- Generated hooks live in `lib/api-client-react/src/generated/`

**Date:** 2025

---

## ADR-004: Tailwind CSS v4

**Decision:** Use Tailwind CSS v4 (not v3) with CSS-first configuration.

**Context:** Project started recently. Tailwind v4 was available with significant improvements over v3.

**Options:**
1. Tailwind CSS v4 -- CSS-first config, better performance, Vite plugin
2. Tailwind CSS v3 -- JavaScript config file, mature plugin ecosystem

**Chosen:** Option 1 -- Tailwind CSS v4

**Reason:** CSS-first configuration (no `tailwind.config.js`) aligns better with Vite's philosophy. Built-in Vite plugin improves performance. The project had no legacy Tailwind investment to preserve.

**Consequences:**
- Theme defined in `index.css` using CSS variables and `@theme` directive
- No `tailwind.config.js` file
- Upgrade path: v4 is the current version; v3 plugins may not be compatible
- Migration from v3 would require updating `@theme` directives

**Date:** 2025

---

## ADR-005: Express 5 for API Server

**Decision:** Use Express 5 for the API server.

**Context:** Need a proven, well-documented HTTP framework for the Express-based API server.

**Options:**
1. Express 5 -- familiar, extensive middleware ecosystem, sufficient for this scale
2. Fastify -- faster, built-in TypeScript support, smaller ecosystem
3. Hono -- lightweight, edge-ready, minimal

**Chosen:** Option 1 -- Express 5

**Reason:** Express has the largest middleware ecosystem and is familiar to the developer. Performance at Teora's scale is not a bottleneck. Express 5 adds native async route handler improvements while maintaining backward compatibility.

**Consequences:**
- Async route handlers need explicit try-catch (Express 5 does not auto-catch promise rejections)
- Error handling via Express error middleware
- Middleware from Express ecosystem compatible with Express 5

**Date:** 2025

---

## ADR-006: Drizzle ORM over Prisma

**Decision:** Use Drizzle ORM instead of Prisma.

**Context:** Need type-safe database queries with PostgreSQL (Supabase).

**Options:**
1. Drizzle ORM -- lightweight, TypeScript-native schema, no separate schema language
2. Prisma -- mature, GUI, separate schema language (Prisma Schema Language)
3. Kysely -- lightweight SQL builder, less ORM abstraction
4. Raw SQL -- no type safety, maintenance burden

**Chosen:** Option 1 -- Drizzle ORM

**Reason:** Drizzle schema is defined in plain TypeScript, which fits naturally into this project's TypeScript-first approach. It works well with Zod via `drizzle-zod`. The generated Zod schemas from the OpenAPI pipeline complement Drizzle's type safety. No separate DSL to learn.

**Consequences:**
- Schema defined in `lib/db/src/schema/` as TypeScript files
- Migrations generated via `drizzle-kit generate`, applied via `drizzle-kit migrate`
- In development, `drizzle-kit push` applies schema directly (dev-only, not for production)
- Type safety from Drizzle queries complements Zod validation of external input

**Date:** 2025
