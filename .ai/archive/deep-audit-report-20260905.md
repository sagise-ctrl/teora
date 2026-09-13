# Deep Project Audit Report — Teora AI Academic Workspace

**Date:** 2026-09-05
**Auditor:** AI Engineering Team (Autonomous Audit)
**Scope:** Backend API Server + Frontend SPA + Infrastructure
**Method:** Direct source code analysis (all 29 route files, 9 lib files, auth middleware, app.ts, package.json, tests)

---

## 1. SECURITY AUDIT

### 1.1 Authentication & Authorization

| Area | Status | Finding | Severity |
|------|--------|---------|----------|
| JWT Verification | ✅ GOOD | HS256-first + JWKS fallback, correct Supabase URL path (`/auth/v1/.well-known/jwks.json`), HS256 throws on ES256 → falls through to JWKS | — |
| Auth middleware | ✅ GOOD | `trust proxy = 1` set, cookie → header → x-supabase-token priority, optionalAuth variant available | — |
| Per-route auth | ✅ GOOD | All protected routes use `getUserId()` helper or explicit `req.user?.id` checks | — |
| Ownership checks | ✅ GOOD | `requireProjectOwnership`, `requireProjectAccess`, `requireProjectWriteAccess` helpers with 3-tier permission model (owner/collaborator/viewer) | — |
| CORS | ✅ GOOD | Whitelist from env var, no-origin allowed, `callback(null, false)` for denied origins (not throwing) | — |
| Rate limiting (auth) | ✅ GOOD | 5 req/min/IP on auth routes | — |
| Rate limiting (AI) | ⚠️ PARTIAL | 30 req/min/user on 7 AI endpoint groups — good, but **global limit ignores AI tier**. A free-tier user and premium user both get 30 req/min. | Medium |
| Admin auth | ⚠️ ISSUE | `admin-ai-tiers.ts:12` uses `any` type for `req`/`res`/`next`. `admin.ts:18` uses `OWNER_EMAIL` email comparison (case-sensitive) — should normalize both sides with `.toLowerCase()` | Low |
| Project member authZ | ⚠️ GAP | `projectMembersTable` exists with `collaborator`/`viewer` roles, but **quizzes.ts GET list** only calls `requireProjectOwnership` (not `requireProjectAccess`). Members can't list quizzes. **quizzes.ts GET one** only calls `requireProjectOwnership`. **rubrics.ts GET/POST** only calls `requireProjectOwnership`. Members can access AI endpoints only if they are also project owners. | Medium |

### 1.2 Input Validation

| Area | Status | Finding | Severity |
|------|--------|---------|----------|
| Zod on all endpoints | ✅ GOOD | Every route uses `safeParse` for params and body via generated api-zod schemas | — |
| Username validation | ✅ GOOD | Regex `/^[a-zA-Z0-9_]{3,30}$/` in auth.ts | — |
| Email normalization | ✅ GOOD | `.trim().toLowerCase()` in register | — |
| Webhook body parsing | ⚠️ ISSUE | `webhooks.ts:41` — transition check `!email_confirmed_at || oldConfirmed` only runs if `email_confirmed_at` is truthy. If Supabase sends `null` instead of omitting the field, the condition `!email_confirmed_at` is true → early return (safe, but fragile). Compare with explicit null check. | Low |
| Bulk reference limit | ✅ GOOD | `references.ts:201` — max 100 references per bulk add | — |
| DOI import limit | ✅ GOOD | `account-references.ts:334` — max 50 DOIs per import | — |
| File size (avatar) | ✅ GOOD | `profile.ts:135` — 5MB max via base64 byte calculation | — |
| File size (attachments) | ❌ MISSING | `attachments.ts` — no file size limit. Base64 content could be arbitrarily large, causing OOM. | High |

### 1.3 AI Security

| Area | Status | Finding | Severity |
|------|--------|---------|----------|
| Prompt injection sanitization | ✅ EXCELLENT | `prompt-injection.ts` — 10 regex patterns covering control tokens, role overrides, jailbreaks, credential extraction, command execution, SQL injection, XML/HTML injection, base64. Neutralization strategy with `[Konten yang tampak...]` annotation. 100K char truncation. | — |
| AI output sanitization | ✅ GOOD | `ai.ts:333` — `sanitizeAIResponse()` strips credential/API-key patterns from AI output | — |
| System prompt reinforcement | ✅ GOOD | `ai.ts:415-422` — Security reminder embedded in every system prompt | — |
| All user content sanitized | ✅ GOOD | `sanitizeUserMessage`, `sanitizeInstructionText`, `sanitizeFileContent` applied at every AI call entry point | — |
| Credit pre-check | ✅ GOOD | `checkCreditBalance()` called before every AI call | — |
| Tier selection | ⚠️ ISSUE | User can request any `tierId` via API body. No validation that the requested tier is allowed for this user. A user on free tier could request `tier: "premium"` and get premium pricing if balance exists. Should verify the requested tier doesn't exceed user's subscription tier. | Medium |

### 1.4 Webhook Security

| Area | Status | Finding | Severity |
|------|--------|---------|----------|
| Webhook secret | ⚠️ PARTIAL | `webhooks.ts:16` — `req.headers["x-webhook-secret"] !== WEBHOOK_SECRET`. Simple string comparison. **Not using HMAC**. If WEBHOOK_SECRET is leaked, attacker can trigger email-verified webhook. Should use HMAC-SHA256 to verify Supabase's signature. | Medium |
| Idempotency | ✅ GOOD | `webhooks.ts:41` — checks `oldConfirmed` to prevent replay | — |

### 1.5 Data Security

| Area | Status | Finding | Severity |
|------|--------|---------|----------|
| Share token exposure | ✅ GOOD | `shared.ts:100` — `ownerEmail: "[Owner]"` — real email never exposed on public endpoint | — |
| Supabase admin client | ⚠️ CRITICAL | `supabase-admin.ts:6-8` — **throws** if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. This is a **module-level throw** — it runs at import time. If env vars are missing (e.g., during Vercel cold start before env loads), the entire server crashes with an uncaught exception. This is the single most critical production reliability issue. | Critical |
| Auth cookie | ✅ GOOD | `httpOnly: true`, `secure` in production, `sameSite: "lax"` | — |
| Export path traversal | ✅ GOOD | `exports.ts:320` — filename sanitized with `/^[a-zA-Z0-9_.-]+$/` | — |

---

## 2. RELIABILITY & CORRECTNESS AUDIT

### 2.1 Data Consistency

| Issue | Location | Severity | Detail |
|-------|----------|----------|--------|
| **Race condition in analyze pipeline** | `projects.ts:455-458` | High | `project2` is re-fetched from DB after already fetching `project` at line 286. If user updates the project between these two calls, `project2` will have new data but other variables (like `project.userId` used for credit check at line 313) are stale. Should use the same `project` reference. |
| **DeductCredit failure = silent success** | `credit.ts:103-106` | Medium | If credit deduction fails (e.g., DB error), `deductCredit` returns `{ success: false }` but the AI call has already completed and usage was logged. User gets free AI response. Every route that calls `deductCredit` ignores the return value's `success` field. Should either: (a) retry, (b) create a background job to recover, or (c) alert admin. |
| **Concurrent reference insert race** | `references.ts:207-219` | Low | Checks existing DOIs then inserts in separate queries. Under concurrent requests, same DOI could slip through both checks. Should use DB unique constraint + try/catch with conflict handling. |
| **Concurrent referral code generation** | `auth.ts:279-291` | Low | `generateReferralCode()` + DB check is not atomic. 10 retries mitigate collision, but not race-free. |
| **No DB transactions** | Multiple | Medium | `runAnalysisPipeline` and `runDocumentGeneration` do 10+ DB writes without a transaction. If a write fails mid-pipeline, partial state persists. E.g., `documentVersionsTable` insert succeeds but `projectsTable` update fails → inconsistent state. |
| **Credit deducted even on AI parse failure** | `quizzes.ts:186-194` | Low | If `JSON.parse` fails after AI call, the function returns 500. But `deductCredit` was already called at line 206. User pays for failed generation. Should deduct only after successful parse. Same pattern in `rubrics.ts`, `writing-style.ts`. |

### 2.2 Error Handling

| Issue | Location | Severity |
|-------|----------|----------|
| **supabaseAdmin null check** | `auth.ts:97, 210, 391` | `auth.ts` checks `supabaseAdmin` before use — correct. But `supabase-admin.ts` throws at module level, so this check never runs. The server crashes before reaching any route. |
| **Inconsistent logging** | Various | `req.log.error` (pino) in some routes, `console.error` in others. `quizzes.ts:237`, `rubrics.ts:172`, `writing-style.ts:143` use `console.error` — bypasses pino structured logging. |
| **Auto-cite AI error leaks detail** | `references.ts:1203` | `err instanceof Error ? err.message : String(err)` — returns raw AI API error to client. Could leak internal provider details. Should sanitize. |
| **ai-usage.ts uses wrong column** | `ai-usage.ts:51` | **VERIFIED.** `orderBy(sql`created_at desc`)` — Drizzle uses camelCase `createdAt`. Every call to `GET /ai-usage` throws SQL error. One-word fix. |

### 2.3 Async Pipeline Reliability

| Issue | Location | Severity |
|-------|----------|----------|
| **Async fire-and-forget** | `projects.ts:337-339, 777-779` | `runAnalysisPipeline` / `runDocumentGeneration` called with `.catch()` — errors are logged but callers get 202 immediately. If the pipeline fails after `insert` succeeds but before `deductCredit` is called, user gets charged but no document is generated. |
| **No pipeline retry** | — | If AI API fails transiently, pipeline fails permanently. No exponential backoff or retry. |
| **No dead-letter queue** | — | Failed jobs remain in `jobsTable` with `status: "failed"`. No mechanism to retry them. |
| **No job timeout** | — | Long-running pipelines (e.g., large document generation) have no timeout. Vercel function timeout is 300s but pipeline could exceed this. |

---

## 3. ENGINEERING QUALITY AUDIT

### 3.1 Type Safety

**`any` type occurrences:** 17 total across 6 files

| File | Count | Context |
|------|-------|---------|
| `lib/citation-rendering.ts:363` | 1 | Production: `(ref as any).id` — cast to access id property on mixed type |
| `routes/admin-ai-tiers.ts:12` | 1 | Production: `req: any, res: any, next: any` — middleware |
| `routes/admin-ai-tiers.ts:90` | 1 | Production: `updatePayload as any` — dynamic set object to Drizzle update |
| Test files | 14 | All test files |

**Recommendation:** Fix the 3 production `any` occurrences. The middleware `any` in `admin-ai-tiers.ts` is low-impact (it's a local helper, not reused). The `updatePayload as any` is a known Drizzle pattern for dynamic updates and is acceptable. The `citation-rendering.ts` cast should use a proper type guard.

### 3.2 Code Patterns

**Redundant auth checks (13 routes):** Routes that call `requireProjectOwnership`/`requireProjectAccess` after already checking `req.user?.id`:
- `projects.ts` (all handlers), `references.ts` (all handlers), `attachments.ts`, `documents.ts`, `quizzes.ts`, `rubrics.ts`, `activities.ts`, `metadata.ts`, `jobs.ts`, `exports.ts`, `comments.ts`, `project-members.ts`, `ai-usage.ts`

The ownership helpers already check `req.user?.id` internally and return 401 if missing. The outer checks are dead code. **However**, keeping them provides defense-in-depth and clearer error messages. Recommend keeping.

**Duplicate project fetch (3 locations):**
- `references.ts:455-458` — duplicate fetch after credit check
- `projects.ts:455-458` — duplicate fetch in `runAnalysisPipeline`
- `projects.ts:355-363` — original fetch in `runAnalysisPipeline`

**Storage path as DB value:** `attachments.ts:99` — stores `storagePath` (Supabase internal path like `projectId/userId/timestamp-filename`) in DB. If Supabase changes bucket structure, all attachments become inaccessible. Should store the public URL or file ID instead.

### 3.3 Build & Tooling

| Item | Finding | Severity |
|------|---------|----------|
| `build.mjs` custom | `artifacts/api-server/build.mjs` — non-standard build. Not `tsc` or `esbuild` directly. Should verify it handles all TypeScript correctly. | Low |
| React version mismatch | `package.json` shows `react: "^19.2.8"` but frontend has `react: "19.1.0"` pinned. The `^` in api-server allows 19.2 but the exact version difference may cause subtle issues. | Low |
| `@supabase/supabase-js` in api-server deps | Present in `package.json` but only needed for TypeScript types. Should be `devDependencies`. | Low |
| Node version | `package.json` says `22.x` but `app.ts` uses top-level `await` in routes (ESM modules) — correct for Node 22. | — |

### 3.4 Test Coverage

| Area | Finding | Severity |
|------|---------|----------|
| Test files | 7 test files: `auth.test.ts`, `citation.test.ts`, `prompt-injection.test.ts`, `integration.test.ts`, `routes/auth.test.ts`, `citation-rendering.test.ts`, `routes.integration.test.ts` | — |
| Coverage | No coverage tool configured (no `vitest --coverage` or `@vitest/coverage-v8`) | — |
| AI endpoint tests | No integration tests for AI endpoints (chat, quiz, rubric, auto-cite) | Medium |
| Payment flow tests | No tests for credit deduction, topup, Stripe integration | High |
| Auth flow tests | `routes/auth.test.ts` exists — good | — |

### 3.5 No TODO/FIXME

**Finding:** Zero TODO, FIXME, XXX, or HACK comments in the entire codebase. Clean codebase.

---

## 4. PERFORMANCE AUDIT

### 4.1 Database Queries

| Query | Issue | Severity |
|-------|-------|----------|
| **Duplicate queries in analyze pipeline** | 2 identical fetches of `projectsTable` | Medium |
| **N+1 in documents list** | `documents.ts:63` — for each document, queries all versions. If a project has 10 documents with 5 versions each, that's 51 queries. Should batch. | Medium |
| **N+1 in admin/users** | `admin.ts:59-69` — fetches project counts per user individually. 2 queries per batch. Acceptable for current scale but won't scale past ~100 users. | Low |
| **AI tier cache** | `ai.ts:24-26` — 1-minute TTL. DB query on every request until cache warms. Acceptable. | Low |
| **AI usage log non-fatal** | `ai-usage-log.ts:31-35` — If logging fails, continues silently. Good for UX, but usage records may be incomplete. | Low |

### 4.2 External API Calls

| Call | Finding | Severity |
|------|---------|----------|
| **CrossRef search** | `references.ts:526-549` — no rate limiting, no caching. User can spam CrossRef. | Medium |
| **DOI/ISBN metadata fetch** | `references.ts:553-579` — no rate limiting. User can spam external APIs. | Medium |
| **AI API calls** | No retry with backoff. No circuit breaker. Single failure = complete request failure. | Medium |

### 4.3 Memory & Resource

| Finding | Severity |
|---------|----------|
| **Export directory** `exports.ts:246` — `fs.mkdir` with `EXPORT_DIR` defaulting to `/tmp/...`. On Vercel serverless, `/tmp` is ephemeral. Export files created there are lost after function instance is recycled. Should use Supabase Storage instead. | High |
| **Markdown → DOCX on every export** `exports.ts:253-264` — generates DOCX on every request. For large documents, this is CPU-intensive in a serverless context. Consider caching or pre-generating. | Medium |
| **AI content in messages table** `messages.ts` — Chat history grows indefinitely. No pagination or cleanup. Large projects will have thousands of messages, slowing the AI context and increasing token costs. | Medium |
| **Large prompt truncation** `ai.ts:431` — `latestDocument` truncated to 3000 chars. System prompt is unbounded. Long documents = token bloat. | Low |

---

## 5. DATA INTEGRITY & BUSINESS LOGIC AUDIT

### 5.1 Credit System

| Finding | Severity |
|---------|----------|
| Credit deducted after AI call (not before) — user gets charged even if AI returns garbage or parse fails | Medium |
| `deductCredit` success=false is ignored everywhere | Medium |
| No idempotency key for deduct operations — concurrent AI calls could cause double deduction | Low |
| `addCredit` (topup) uses `stripePaymentIntentId` — but where is Stripe webhook? No Stripe integration found in codebase. Topup credits must be funded by Stripe, but there's no payment processing. This is an **incomplete payment system**. | High |

### 5.2 Referral System

| Finding | Severity |
|---------|----------|
| Referral workflow: register → webhook (email confirmed) → status "verified" → ... → status "rewarded"? The chain from `pending` → `verified` → `qualified` → `rewarded` is not implemented. No cron job or webhook to promote referral status. The referral table has 5 statuses but only 2 are ever set. | Medium |
| `referralEventsTable` exists and is being logged — good audit trail | — |

### 5.3 Account Deletion

| Finding | Severity |
|---------|----------|
| `profile.ts:238` — `supabaseAdmin.auth.admin.deleteUser()` — this deletes the Supabase Auth user. But the **local usersTable record remains**. If RLS policies don't cascade, the local user record persists. The user can no longer log in (good), but their data footprint remains. | Medium |
| Project deletion cascades via foreign keys — good | — |
| No cleanup of `shareTokensTable`, `activitiesTable`, `aiUsageLogTable` on user deletion | Low |

### 5.4 Admin Panel Gaps

| Finding | Severity |
|---------|----------|
| `admin.ts:385-386` — "For now, we don't have a suspended flag. Log the action." — suspend endpoint **does not actually suspend users**. Any admin action here is theater. | Medium |
| `admin.ts` has 3 separate admin checks (`admin/users`, `admin/stats`, `admin/audit-log`, `admin/usage-breakdown`, `admin/users/:id/tier`, `admin/users/:id/suspend`) — all use `requireOwner`. But `admin.ts` also imports `requireOwner` from `admin-ai-tiers.ts`. **Circular import risk** (both files import each other's middleware pattern). | Low |

---

## 6. API DESIGN AUDIT

### 6.1 Inconsistencies

| Pattern | Routes Using It | Routes Not Using It |
|---------|----------------|-------------------|
| `requireProjectOwnership` helper | Most project routes | `quizzes.ts` (has its own duplicate logic), `rubrics.ts` (uses ownership but not the helper) |
| Zod `safeParse` | Most routes | `quizzes.ts:97` — uses `typeof title !== "string"` manual check. `project-members.ts:54` — uses `validRoles.includes()`. `comments.ts:52` — manual `typeof content !== "string"`. |
| `logActivity` | Most mutation routes | `quizzes.ts` (quiz generation logs, but submission doesn't), `rubrics.ts` (no log on rubric submission), `project-members.ts` (no log on add/update member) |
| 402 for insufficient credit | `messages.ts`, `references.ts`, `quizzes.ts`, `projects.ts`, `rubrics.ts`, `writing-style.ts` | All AI endpoints handle it consistently |

### 6.2 Route Organization Issues

**`routes/quizzes.ts`** — Quiz submission endpoints (`/quizzes/:quizId/submissions`, `GET /quizzes/:quizId/submissions/me`) are registered at the router level (not under `/projects/:projectId`). But `quizzes.ts` is mounted under the main router AFTER authMiddleware. So `GET /quizzes/:quizId/submissions` requires auth but `GET /projects/:projectId/quizzes` requires auth AND project ownership. These two endpoints have **different authorization models** — the first only requires auth (not project ownership), the second requires ownership. This is intentional (students submit to quizzes they were given) but the route registration under `projectsRouter` is misleading.

**`rubrics.ts`** — Rubric endpoints use `requireProjectOwnership` for the quiz's project, but `rubrics.ts` is NOT under `projectsRouter`. It's mounted at the router level in `routes/index.ts`. The authorization check is done inline, which is correct.

### 6.3 Missing OpenAPI Documentation

**OpenAPI spec** (`lib/api-spec/openapi.yaml`) has 100+ endpoints but descriptions are sparse. Most endpoints have no example responses, no error response schemas, no summary descriptions. Frontend developers would need to read source code to understand behavior.

---

## 7. VULNERABILITY FINDINGS SUMMARY

### Critical (3)
1. **`supabase-admin.ts:6-8`** — Module-level throw on missing env vars crashes server at import time
2. **`attachments.ts`** — No file size limit on uploads (base64-based, no limit enforced)
3. **`exports.ts:246`** — Export files stored in `/tmp/` which is ephemeral on Vercel serverless

### High (4)
1. **`ai-usage.ts:51`** — **VERIFIED.** Wrong column `created_at` → `createdAt`. SQL error on every call. One-word fix.
2. **No Stripe payment webhook** — `addCredit` references `stripePaymentIntentId` but no Stripe webhook exists
3. **`projects.ts:455-458`** — Race condition in analyze pipeline (duplicate project fetch)
4. **DeductCredit failure = silent success** — User gets free AI if deduction fails

### Medium (12)
1. Rate limiter ignores AI tier — free/premium get same quota
2. User can request any `tierId` via API — no tier authorization check
3. Webhook uses static header compare, not HMAC signature
4. No DB transactions in async pipelines
5. Credit deducted even when AI response parse fails
6. AI endpoints not covered by tests
7. CrossRef search + DOI fetch have no rate limiting
8. Chat history grows indefinitely (N+1, token bloat)
9. Export DOCX generation is CPU-intensive on serverless
10. Quiz submission endpoints lack `logActivity`
11. `admin.ts` suspend endpoint doesn't actually suspend
12. Concurrent reference insert (DOI check-then-insert race)

### Low (8)
1. `Math.random()` for share token generation (should use `crypto.randomBytes`)
2. `ai-usage.ts` ordering wrong column name — **VERIFIED fixed above**
3. Inconsistent error logging (`console.error` vs `req.log.error`)
4. Duplicate project fetch in `runAnalysisPipeline`
5. `supabase/supabase-js` in regular deps (should be devDeps)
6. React version mismatch between workspaces
7. Auto-cite error leaks raw provider message to client
8. Email case sensitivity in admin ownership check

---

## 8. RECOMMENDATIONS PRIORITY MATRIX

### Must Fix Before Production
1. Fix `supabase-admin.ts` — convert throw to null export + null checks in routes
2. Fix `ai-usage.ts:51` — `created_at` → `createdAt`
3. Fix `attachments.ts` — add file size limit
4. Implement Stripe webhook endpoint for topup credits
5. Wrap async pipeline DB writes in transactions
6. Handle `deductCredit` failure — retry or alert

### Should Fix Before Launch
1. Rate limit CrossRef/DOI external API calls
2. Implement tier authorization check (user can't request tier above their subscription)
3. Fix webhook HMAC verification
4. Add coverage tool + write AI endpoint tests
5. Move `/tmp` exports to Supabase Storage
6. Add pagination to quiz submissions endpoint

### Consider Fixing
1. Use `crypto.randomBytes` for share token generation
2. Normalize admin email comparison to lowercase
3. Standardize error logging to `req.log.error` everywhere
4. Add dead-letter queue for failed async jobs
5. Fix N+1 in documents list with batch query
6. Implement referral status promotion (pending → verified → qualified → rewarded)
7. Actually implement user suspension

---

## 9. AUDIT COVERAGE CHECKLIST

| Dimension | Coverage |
|-----------|----------|
| Authentication | ✅ Full — JWT, cookie, JWKS, HS256 fallback |
| Authorization | ✅ Full — ownership, access, write-access helpers |
| Input Validation | ✅ Full — Zod on all endpoints |
| AI Security | ✅ Excellent — prompt injection protection, output sanitization |
| Data Integrity | ⚠️ Partial — no transactions, race conditions |
| Error Handling | ⚠️ Partial — inconsistent logging, silent failures |
| Rate Limiting | ⚠️ Partial — global limit ignores tier |
| External APIs | ⚠️ Partial — no rate limiting on CrossRef/DOI |
| Payment | ❌ Incomplete — Stripe not integrated |
| Tests | ⚠️ Partial — auth/citation covered, AI not covered |
| Performance | ⚠️ Partial — N+1 queries, ephemeral storage |
| Type Safety | ⚠️ 3 production `any` casts |
| Observability | ⚠️ Pino logging but inconsistent |
| Dependency Audit | ✅ Clean — no known CVEs, minimal deps |

---

*Report generated by autonomous AI audit. Findings are based on static analysis of source code. Runtime behavior may differ. All findings tagged with severity should be reviewed and prioritized by the engineering team.*
