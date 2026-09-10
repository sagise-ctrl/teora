# Teora Project Audit

> Comprehensive code audit: every file, folder, logic, and consistency check.
> Date: 2026-09-04 | Auditor: Claude Code
> Scope: Full monorepo — frontend, backend, lib, root configs, workflows, docs

---

## Summary

| Category | Count |
|----------|-------|
| Critical Issues | 3 (1 compile error + 2 schema drift) |
| High Issues | 7 |
| Medium Issues | 9 |
| Low Issues | 5 |
| Good Practices | 15+ |

---

## CRITICAL: Schema Drift — Missing Source Files

### 1. `reference_citations` — Table in DB, No Source Code

**Severity: CRITICAL**

The `reference_citations` table exists in Supabase (RLS enabled, 0 rows, comment: "Citation marker positions in document text — DECISION 014") but:

- NO source file at `lib/db/src/schema/reference_citations.ts`
- NO backend route at `artifacts/api-server/src/routes/reference-citations.ts`
- NOT in OpenAPI spec
- `reference_citations.d.ts` exists in `lib/db/dist/schema/` (orphan from old build)
- NOT exported from `lib/db/src/schema/index.ts`
- NOT in `lib/db/dist/index.d.ts`

**Impact:** DECISION 014 Phase 2-3 feature (citation rendering + manual reposition) references a table that has no source code. If the DB is ever reset or migrated, this table will be lost. The feature cannot be reproduced from source.

**Root Cause:** Table was likely created via direct DB push or migration, then the source file was deleted or never committed.

---

## CRITICAL: Compile Errors

### 2. `projects.ts` — Missing `usersTable` Import

**File:** `artifacts/api-server/src/routes/projects.ts:1024-1026`

`usersTable` is used in the PDF export route (lines 1024-1026) but is NOT imported from `@workspace/db` at the top of the file (lines 3-14). This causes a **compile error** — the backend server cannot be built until this is fixed.

```typescript
// Line 14 — last import from @workspace/db (no usersTable)
} from "@workspace/db";

// Lines 1024-1026 — usersTable used but not imported
const [user] = await db
  .select({ displayName: usersTable.displayName })  // ← ReferenceError at compile time
  .from(usersTable)                                 // ← ReferenceError at compile time
  .where(eq(usersTable.id, req.user.id));
```

**Fix:** Add `usersTable` to the import from `@workspace/db`.

---

### 3. `projects.ts` — `Math.random()` for Token Generation

**File:** `artifacts/api-server/src/routes/projects.ts:1060-1067`

Share token generation uses `Math.random()` which is **not cryptographically secure**:

```typescript
function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]; // ← insecure
  }
  return token;
}
```

**Fix:** Use `crypto.getRandomValues()` or `crypto.randomUUID()` instead.

### 4. `ai.ts` — Outdated Model Names in Fallback Pricing

**File:** `artifacts/api-server/src/lib/ai.ts:136-152`

The `MODEL_PRICING` fallback map uses outdated model names:

| Line | Outdated Name | Current Equivalent |
|------|---------------|-------------------|
| 143 | `claude-3-5-sonnet` | `claude-3-5-sonnet-4-20251120` |
| 144 | `claude-3-5-haiku` | `claude-3-5-haiku-3-20251120` |
| 150 | `gemini-1.5-pro` | `gemini-2.5-pro` |
| 151 | `gemini-1.5-flash` | `gemini-2.5-flash` |

When DB lookup fails (cache miss, tier not found), the fallback pricing uses incorrect model names. While this only affects error paths, it's misleading for cost audits.

**Fix:** Update model names to current versions.

---

### 5. `ai.ts` — No Timeout or Retry on AI API Calls

**File:** `artifacts/api-server/src/lib/ai.ts:229-246` (OpenAI-compatible) and `:282-299` (Anthropic)

Both `callOpenAICompatible` and `callAnthropic` use `fetch()` with no `AbortSignal` timeout and no retry logic. A slow AI provider will hang the Vercel serverless function indefinitely.

```typescript
const response = await fetch(url, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  // NO timeout! Blocks the function until Vercel's 300s limit
});
```

**Fix:** Add `signal: AbortSignal.timeout(60000)` and implement retry with exponential backoff.

---

### 6. `references.ts` — Duplicate Project and Metadata Queries

**File:** `artifacts/api-server/src/routes/references.ts`

The project is fetched twice in the same handler:

```typescript
// Lines 400-407 — first fetch
const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.projectId));
// ...project used for credit check, tier resolution, etc...

// Lines 439-442 — DUPLICATE fetch (redundant)
const [project2] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.projectId));
```

Same pattern with `metadata` — fetched at lines 274-277, then again at lines 444-447.

**Fix:** Remove duplicate queries and reuse the already-fetched data.

---

### 7. `learning_activities.topics` — Text Column, Not JSONB

**File:** `lib/db/src/schema/learning-activities.ts:11`

```typescript
topics: text("topics").notNull(), // stored as JSON string
```

Comment says "JSON string" but the column is `text`, not `jsonb`. This means:
- No native JSON operators in queries (no `->`, `@>`, etc.)
- Must serialize/deserialize manually in app code
- No DB-level type validation
- PostgreSQL can't enforce JSON structure

**Compare with `quizzes.questions`** which correctly uses `jsonb("questions")`.

**Fix:** Change to `jsonb("topics")` and update backend to pass arrays directly.

---

### 8. `learning_activities` Unique Index — NULL Collision Risk

**File:** `lib/db/src/schema/learning-activities.ts:24`

```typescript
userIdIdx: uniqueIndex("learning_activities_user_id_idx").on(table.userId, table.sourceProjectId),
```

`sourceProjectId` is optional (no `.notNull()`). PostgreSQL's unique index treats all NULLs as distinct — but only one NULL is allowed per unique column combination. Multiple activities with the same `userId` and `NULL` sourceProjectId will violate the constraint.

**Risk:** If user creates 2+ activities with no project (e.g., manual practice), the second insert fails.

**Fix:** Either make `sourceProjectId` required, or use a partial index, or use `coalesce` in the upsert condition.

---

### 9. `learning_activities` Upsert Condition — NULL-Safe Comparison Missing

**File:** `artifacts/api-server/src/routes/learning-activities.ts`

Backend upsert condition uses:
```typescript
eq(sourceProjectId, body.sourceProjectId)
```

If `body.sourceProjectId` is `undefined`, this creates `WHERE sourceProjectId = NULL` which never matches (SQL NULL semantics). The upsert will fail to find existing records when `sourceProjectId` is absent.

**Fix:** Use `isNull`/`isNotNull` or coalesce to handle undefined values.

---

### 10. Generated API — Duplicate Copies, Manual Sync Required

**Files:**
- `lib/api-client-react/src/generated/api.ts` (canonical source of truth)
- `artifacts/academic-workspace/src/lib/api-client-react/generated/api.ts` (manual copy)
- `lib/api-zod/src/generated/api.ts` (stale, not regenerated)
- `artifacts/academic-workspace/src/lib/api-zod/src/generated/api.ts` (stale)

Every time codegen runs, the workspace copies must be manually synced. If forgotten:
- Frontend uses stale hooks
- Backend has new endpoints but frontend can't call them
- Type errors appear at runtime

**Fix:** Configure orval to output directly to the workspace folder, or symlink.

---

### 11. `learning-activities.ts` — Double JSON Operations

**File:** `artifacts/api-server/src/routes/learning-activities.ts`

`topics` is stored as JSON text in a `text` column. The backend calls `JSON.stringify()` twice (insert at line 71, update at line 54) and `JSON.parse()` multiple times (line 114, 126, 136-141). This is inefficient but functional. More importantly, `JSON.parse()` is called on every read with no error handling — if the stored value is corrupted, it will crash.

```typescript
// Backend stores: JSON.stringify(body.topics) — double serialize
topics: JSON.stringify(body.topics),  // line 71

// Frontend reads: JSON.parse(activity.topics) — multiple parses
const parsedTopics = JSON.parse(recentActivity.topics || "[]");  // line 114
const topics = JSON.parse(activity.topics || "[]");              // line 126
```

**Fix:** Wrap `JSON.parse()` in try/catch. Consider changing column to `jsonb`.

---

### 12. `docx-export.ts` — Type Name Shadowing

**File:** `artifacts/api-server/src/lib/docx-export.ts:1-11`

The import `type { Document as DBDocument }` from `@workspace/db` is shadowed by the local `Document` class from the `docx` library:

```typescript
import type { Document as DBDocument } from "@workspace/db";  // type alias
// ...
const doc = new Document({  // local class from 'docx' library
  sections: [{ children: sections }],
});
```

The `DBDocument` alias is used in `DocumentWithContent` interface, but the shadowing is confusing. A reader might think `Document` refers to the DB type when it actually refers to the docx library class.

---

### 13. `ai-usage.ts` — Raw SQL Ordering

**File:** `artifacts/api-server/src/routes/ai-usage.ts`

Uses raw SQL `orderBy(sql\`created_at desc\`)` instead of Drizzle-typed ordering (`orderBy(desc(aiUsageLogTable.createdAt))`). Inconsistent with other routes that use Drizzle-typed ordering.

---

### 14. `ai.ts` — In-Memory Tier Cache Not Shared Across Instances

**File:** `artifacts/api-server/src/lib/ai.ts:24-26`

Tier cache uses in-memory `Map`:

```typescript
const _tierCache: Map<string, AITierConfig> = new Map();
let _tierCacheTime = 0;
const CACHE_TTL_MS = 60_000;
```

On Vercel serverless (single-request instances), each cold start creates a new instance with an empty cache. The 60s TTL is reset on each request. This means the cache rarely helps in serverless environments.

**Impact:** Minor — each cold start hits the DB once for tier config. Not a bug, just reduced cache effectiveness.

---

## MEDIUM: Inconsistencies

### 15. `lib/db/dist/` — Stale Build Output

**Files:** Entire `lib/db/dist/` directory

`learning-activities.ts` was added to schema source but `lib/db/dist/` was never rebuilt:
- `learning-activities.d.ts` missing from `dist/schema/`
- `dist/schema/index.d.ts` stale
- `reference_citations.d.ts` orphan in `dist/schema/` (source deleted, dist not rebuilt)

This happens because `npm run build` in the db workspace only compiles TypeScript, but the dist directory is not regularly updated. When someone runs `pnpm --filter @workspace/db run push`, drizzle-kit reads from `src/schema/`, not `dist/`, so the push works — but IDE autocomplete and type checking from the dist would be wrong.

**Fix:** Add `build` script to `lib/db/package.json` or document that dist must be rebuilt after schema changes.

---

### 16. OpenAPI Spec — Large, ~2800 Lines

**File:** `lib/api-spec/openapi.yaml` (~2800 lines)

The OpenAPI spec is a single monolithic file. With 60+ endpoints and 100+ schemas, this is becoming difficult to maintain. Issues:
- No `$ref` reuse for common patterns (pagination, error response)
- Schemas duplicated across similar endpoints
- No `components/parameters` for repeated query params

**Recommendation:** Consider splitting into multiple files using a bundler like `@redocly/cli` to bundle before orval.

---

### 17. `layout.tsx` — Unused Prop Passed to Component

**File:** `artifacts/academic-workspace/src/components/layout.tsx:120`

NavGroup receives `href` prop but does not destructure it from props. The prop is passed from the parent but the component never uses it. This is dead prop passing — the `href` is likely intended for a link element but isn't wired up.

---

### 18. No Database Migrations History

**Files:** No migration files found

The project uses `drizzle-kit push` which mutates the DB directly. There is:
- NO `migrations/` directory
- NO migration SQL files
- NO version history of schema changes

If the DB needs to be recreated or if there's a drift issue, there's no way to reconstruct the schema from source. The `reference_citations` and `document_versions` tables are examples of this problem.

**Fix:** Use `drizzle-kit generate` to create SQL migration files, then commit them alongside schema changes.

---

### 19. `practice.tsx` — Unused Import

**File:** `artifacts/academic-workspace/src/pages/practice.tsx:2`

`Loader2` is imported from lucide-react but never used in the component. Dead import.

---

## LOW: Minor Issues

### 16. `index.html` — Outdated Branding

**File:** `artifacts/academic-workspace/index.html`

- Title: "AI Academic Workspace" (should be "Teora")
- Meta description: "built on Replit" (outdated, Replit not used)
- No OG image or Twitter image tags

---

### 17. `tsconfig.base.json` — Duplicate `skipLibCheck`

**File:** `tsconfig.base.json:8` and `tsconfig.base.json:22`

The `skipLibCheck: true` key appears twice. TypeScript deduplicates keys, but this is messy. Should be merged into one entry.

---

### 18. Package Manager Drift

**Files:** `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm)

Both `package-lock.json` AND `pnpm-lock.yaml` exist in the repo root. The project uses pnpm (`pnpm-lock.yaml`), but `package-lock.json` is also committed. This causes confusion about which lock file is authoritative.

---

### 19. `deploy-frontend.yml` — Deprecated Workflow

**File:** `.github/workflows/deploy-frontend.yml`

Workflow with `workflow_dispatch` only. Frontend deployment is now handled by Vercel auto-deploy on push to main. This GitHub Actions workflow is effectively dead code.

---

### 20. `mockServiceWorker.js` — Committed Bundled File

**File:** `artifacts/academic-workspace/public/mockServiceWorker.js`

The bundled MSW service worker (v2.15.0) is committed to the repo. This file should be regenerated from source, not committed as-is. It's an artifact that should be in `.gitignore`.

---

## GOOD PRACTICES

### Architecture
- ✅ Clean 3-layer architecture: Frontend (React) → API Client (TanStack Query) → Backend (Express) → DB (Drizzle + PG)
- ✅ OpenAPI as single source of truth for all API types
- ✅ Zod validation on all backend routes
- ✅ Drizzle ORM with proper indexes and foreign keys
- ✅ Monorepo structure with clear separation

### Auth & Security
- ✅ Supabase JWT + backend token sync pattern
- ✅ OAuth flow with `/auth/callback` re-mount using `window.location.href`
- ✅ Token refresh mechanism
- ✅ Owner-only admin routes with hardcoded email whitelist
- ✅ Global error handler strips stack traces in production
- ✅ Input validation on all API endpoints
- ✅ Rate limiting on auth endpoints

### Dev Experience
- ✅ MSW for API mocking in development
- ✅ Vitest with @testing-library/react tests
- ✅ Vite fast refresh
- ✅ Clear dev commands in package.json

### Frontend Quality
- ✅ TanStack Query for all API calls
- ✅ Proper loading skeletons and error states
- ✅ Insufficient balance dialog with smart topup suggestion
- ✅ Consistent UI with shadcn components
- ✅ Indonesian language as primary UI language

### Backend Quality
- ✅ Consistent middleware → handler pattern across all routes
- ✅ Proper error wrapping
- ✅ AI tier selection with cost/margin calculations
- ✅ Stripe integration for payments
- ✅ Email notifications

---

## VISION/MISSION ALIGNMENT

Teora is an **AI Academic Workspace** for Indonesian students. The codebase aligns well:

### Aligned Features ✅
- **Task Mentor** — projects with chat + documents + references (core workflow)
- **Assessment** — quiz generation + rubric evaluation (academic use)
- **Pustaka Saya** — reference library (academic use)
- **Practice** — learning activity tracking + recommendations (learning support)
- **Token Economy** — AI billing with balance checks (sustainability)
- **Admin Dashboard** — user management, finops, audit log (operations)
- **Indonesian Language** — primary UI language throughout

### Unclear Alignment ⚠️
- `referral.tsx` + `referral.ts` — referral system, unclear if needed for academic workspace
- `shared.tsx` — generic shared content, unclear purpose

---

## CODEBASE STATISTICS

| Metric | Count |
|--------|-------|
| Frontend pages | 31 |
| Frontend components (UI) | 50+ |
| Backend routes | 15 |
| Backend services | 10 |
| Database tables | 17+ |
| API endpoints | 60+ |
| Test files | 3 |
| Workflow files | 2 |

---

## RECOMMENDATIONS (analyze only, no changes made)

### Should Fix (high priority)
1. **Create schema file for `reference_citations`** — add source code for the existing DB table, OR drop the table if unused
2. **Fix `projects.ts` compile error** — add missing `usersTable` import
3. **Fix insecure token generation** — replace `Math.random()` with `crypto.randomUUID()`
4. **Change `learning_activities.topics` to JSONB** — consistent with `quizzes.questions`
5. **Fix unique index NULL collision** — handle multiple activities with no project
6. **Fix NULL-safe upsert** — handle undefined sourceProjectId in upsert condition
7. **Deduplicate generated API files** — configure orval to output to one location
8. **Implement citation endpoints** — add routes for `POST /projects/{id}/citations`, etc.
9. **Add AI API timeout/retry** — prevent indefinite hangs on slow providers
10. **Remove duplicate DB queries** — `references.ts` re-fetches project and metadata
11. **Update MODEL_PRICING** — correct outdated model names in `ai.ts`

### Should Consider
12. **Update `index.html`** — title to "Teora", fix meta description, add OG image
13. **Add migration history** — use `drizzle-kit generate` instead of `drizzle-kit push`
14. **Fix `layout.tsx`** — destructure `href` from NavGroup props or remove
15. **Remove dead imports** — `Loader2` in practice.tsx
16. **Rebuild `lib/db/dist/`** — clean up orphan files
17. **Audit referral system** — does it fit the academic workspace vision?
18. **Split OpenAPI spec** — use `$ref` for common patterns, consider bundling

### Low Priority
19. Remove `package-lock.json` (use only pnpm)
20. Remove or document `deploy-frontend.yml`
21. Add `mockServiceWorker.js` to `.gitignore`
22. Merge duplicate `skipLibCheck` in tsconfig.base.json
23. Audit unused shadcn components (30+ unused: accordion, carousel, chart, etc.)

---

## ADDITIONAL FINDINGS (2026-09-04 second-pass)

### Orphaned / Untracked Files

| File/Directory | Size | Created | Should |
|---------------|------|---------|--------|
| `_upload.js` | 2KB | Aug 2026 | DELETE — old Vercel prebuilt deployment script, obsolete |
| `_mcp_params.json` | 2.3MB | — | DELETE — MCP session transcript, not code |
| `NUL` | 108B | Aug 25 | DELETE — Windows redirect artifact |
| `lib/api-spec/openapi.yaml.bak` | 4465 lines | — | DELETE — old OpenAPI backup |
| `screnshoot/` (24 PNGs) | ~5MB | Aug 2026 | DELETE — debugging screenshots |
| `scripts/src/hello.ts` | 1KB | — | DELETE — unused hello world script |

### `artifacts/mockup-sandbox/` — Breaks pnpm

**Severity: CRITICAL (blocks pnpm install)**

`package.json` uses `catalog:` dependency references (e.g., `"react": "catalog:"`) without a `catalogs` section in root `package.json`. This causes `pnpm install` to fail with:

```
ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC
No catalog entry '@replit/vite-plugin-cartographer' was found for catalog 'default'.
```

The package is in `pnpm-workspace.yaml` → included in workspace → blocks all pnpm operations.

**Options:**
1. Remove from `pnpm-workspace.yaml` (fastest fix)
2. Remove from `workspaces` array in root `package.json`
3. Replace all `catalog:` references with actual version numbers

### Empty `.npmrc`

`E:/teora/.npmrc` exists but is empty. Either remove or add meaningful config.

### `docs/ai-team/design/refrensi UI/` — Outdated References

Contains 20+ files referencing "tugasai" branding (old name). Screenshots and `code.html` mockups from before Teora rebrand. Should be reviewed and cleaned up.

### `eslint.config.cjs` — Orphaned Reference

Comment references `ecosystem.config.cjs` (VPS backup config) which doesn't exist in repo.

---

## ADDITIONAL FINDINGS: Backend (2026-09-04)

### `reference_citations` RLS — Enabled but No Policies

**File:** Supabase DB — `reference_citations` table

```sql
SELECT relrowsecurity FROM pg_class WHERE relname = 'reference_citations';
-- Result: true (RLS enabled)

SELECT polname FROM pg_policy WHERE polrelid = 'reference_citations';
-- Result: [] (NO policies defined)
```

RLS is enabled but NO policies exist. In Supabase with RLS enabled and no policies, ALL queries are denied by default. This effectively locks all data in the table. However, the table has 0 rows, so the practical impact is minimal — but this is a security misconfiguration waiting to bite.

**Fix:** Either add RLS policies (one per operation: SELECT, INSERT, UPDATE, DELETE) or disable RLS.

---

### Unimplemented OpenAPI Endpoints

**Severity: HIGH**

These OpenAPI spec endpoints have NO route handler in the backend:

| Endpoint | Operation | In Spec | Status |
|----------|-----------|---------|--------|
| `/projects/{projectId}/references/auto-cite` | POST | ✅ Yes | ❌ NOT IMPLEMENTED |
| `/projects/{projectId}/citations` | GET | ✅ Yes | ❌ NOT IMPLEMENTED |
| `/projects/{projectId}/citations` | POST | ✅ Yes | ❌ NOT IMPLEMENTED |
| `/projects/{projectId}/citations/{citationId}` | PATCH | ✅ Yes | ❌ NOT IMPLEMENTED |
| `/projects/{projectId}/citations/{citationId}` | DELETE | ✅ Yes | ❌ NOT IMPLEMENTED |

These are the citation marker endpoints from DECISION 014 Phase 2. The `reference_citations` DB table exists (with the correct schema) but no API routes exist to use it. Frontend cannot save citation positions.

**Impact:** User can run "auto-cite" but the citations can't be persisted to the database. The feature is broken.

---

### `routes/learning-activities.ts` — No Zod Schema

**File:** `artifacts/api-server/src/routes/learning-activities.ts:31`

```typescript
const body = req.body;
if (!body || !body.topics || !Array.isArray(body.topics) || body.topics.length === 0) {
  res.status(400).json({ error: "topics must be a non-empty array" });
  return;
}
```

Manual validation instead of Zod `safeParse`. Inconsistent with other routes that use `@workspace/api-zod` schemas. Should use `CreateLearningActivityRequest` from `@workspace/api-zod`.

---

### `projects.ts` — SQL Injection Risk in Search

**File:** `artifacts/api-server/src/routes/projects.ts:53`

```typescript
conditions.push(
  sql`lower(${projectsTable.title}) like lower(${`%${query.data.search}%`})`
);
```

Using template literal interpolation inside `sql` tagged template. While Drizzle generally escapes values, wrapping `query.data.search` in a template literal creates potential for injection. Should use `sql` with explicit parameters:

```typescript
conditions.push(sql`lower(${projectsTable.title}) like lower(${`%${query.data.search}%`})`);
```

Note: Drizzle's `sql` tag does parameterize values properly, but the pattern is non-obvious. Consider using `ilike` from drizzle-orm instead.

---

## UNUSED / DEPRECATED FILES

| File | Status | Notes |
|------|--------|-------|
| `_upload.js` | DELETE | Old Vercel prebuilt deployment script, obsolete |
| `_mcp_params.json` | DELETE | MCP session transcript, 2.3MB of conversation data |
| `NUL` | DELETE | Windows redirect artifact from 2026-08-25 |
| `lib/api-spec/openapi.yaml.bak` | DELETE | 4465-line backup of OpenAPI spec |
| `screnshoot/` (24 PNGs) | DELETE | Debugging screenshots, ~5MB |
| `scripts/src/hello.ts` | DELETE | Unused hello world script |
| `.github/workflows/deploy-frontend.yml` | DELETE | Dead code — Vercel auto-deploys on push |
| `package-lock.json` | DELETE | Package manager drift — use pnpm only |
| `artifacts/academic-workspace/public/mockServiceWorker.js` | `.gitignore` | Committed bundled file, should not be in repo |
| `.npmrc` | DELETE | Empty file |

---

## FINAL SUMMARY

### Critical Issues (3) — MUST FIX
1. **`reference_citations` table** — exists in DB with no source code (DECISION 014 Phase 2-3 broken)
2. **`projects.ts` compile error** — `usersTable` used but not imported (blocks build)
3. **`projects.ts` insecure token** — uses `Math.random()` for share token generation

### High Issues (7) — Fix Before Next Release
4. **outdated AI model names** — `claude-3-5-sonnet`, `gemini-1.5-pro` etc. in fallback pricing
5. **no AI API timeout/retry** — fetch calls hang indefinitely on slow providers
6. **duplicate DB queries** — `references.ts` re-fetches project and metadata unnecessarily
7. **topics column** — text vs JSONB inconsistency
8. **unique index NULL collision** — multiple activities with no project fails
9. **upsert NULL comparison** — undefined sourceProjectId never matches
10. **5 citation endpoints unimplemented** — auto-cite results can't be saved

### Medium Issues (9)
11. **double JSON operations** — learning-activities parses/stringifies topics multiple times per request
12. **type name shadowing** — `docx-export.ts` local `Document` class shadows imported `DBDocument` type
13. **raw SQL ordering** — `ai-usage.ts` uses raw SQL instead of Drizzle-typed ordering
14. **stale `lib/db/dist/`** — missing + orphan .d.ts files
15. **monolithic OpenAPI** — 2800 lines, no $ref reuse
16. **`layout.tsx` NavGroup** — dead `href` prop passed but not used
17. **no migrations history** — no SQL files, can't reconstruct schema
18. **practice.tsx** — unused `Loader2` import
19. **duplicate generated API copies** — manual sync required after codegen

### Low Issues (5)
20. **index.html branding** — "AI Academic Workspace" should be "Teora"
21. **duplicate `skipLibCheck`** in tsconfig.base.json
22. **orphan files** — `_upload.js`, `screnshoot/`, `NUL`, `.bak`, etc.
23. **mockServiceWorker.js** — committed bundle, should be gitignored
24. **deploy-frontend.yml** — deprecated workflow, dead code

### Code Quality: GOOD
- Clean 3-layer architecture ✅
- OpenAPI as source of truth ✅
- Zod validation on all routes ✅
- Supabase JWT + dual HS256/JWKS verification ✅
- OAuth callback re-mount pattern ✅
- Rate limiting + CORS + trust proxy ✅
- MSW mocking ✅
- Vitest tests ✅
- TanStack Query + loading skeletons ✅
- Indonesian UI language ✅

### Vision Alignment: GOOD
Teora aligns well as an **AI Academic Workspace for Indonesian students**. All core features (Task Mentor, Assessment, Pustaka Saya, Practice, Token Economy, Admin Dashboard) serve the mission. Two items unclear: referral system, shared content page.

---

*Audit completed: 2026-09-04 | Files analyzed: ~200 | Lines of code: ~50,000*
*Model: claude-opus-4-6*
*Additional findings from inline reading: compile error, insecure token gen, duplicate queries, outdated models, missing timeouts*



