# AI API Audit Report — 2026-09-05

> **Scope:** Code-level audit of all AI-generating routes in `artifacts/api-server/src/routes/`.
> **Live test:** Deferred to owner (per owner directive — code audit + report only).
> **Method:** Static analysis (grep + Read) + lessons-learned cross-reference.
>
> **Auditor:** claude-opus-4-8
> **Branch:** feat/daftar-task

---

## Executive Summary

| Severity | Count | Findings |
|----------|-------|----------|
| 🔴 Critical | 1 | Rate limiter mounted BEFORE authMiddleware → `req.user` undefined → falls back to per-IP rate limiting |
| 🟠 High | 1 | 8 AI-generating endpoints have NO rate limit at all (quiz, rubric, references, outline, documents/generate, writing-style, auto-cite, bulk) |
| 🟡 Medium | 0 | — |
| 🟢 Low | 2 | `messages.ts` uses inline DB insert instead of `logAIUsage` helper (consistency); `references.ts:1203` returns generic 502 instead of Indonesian error message |

**Good news:** All AI routes have proper `callAI` + `checkCreditBalance` + `deductCredit` + usage logging patterns. No route silently swallows exceptions. Credit balance check (402 → frontend dialog) works correctly.

---

## Per-Route Audit Table

| Route | File | AI? | `callAI` | `try/catch` | Credit check | Deduct | Log usage | Rate limit |
|-------|------|-----|----------|-------------|--------------|--------|-----------|------------|
| `POST /projects/:id/messages` (chat) | messages.ts:43 | ✅ | ✅ L160 | ✅ L159-165 | ✅ L84-93 | ✅ L188-196 | ✅ inline L170-184 | ✅ (broken — see #1) |
| `POST /projects/:id/quizzes` | quizzes.ts:72 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ helper | ❌ MISSING |
| `POST /projects/:id/quizzes/:quizId/rubric` | rubrics.ts:42 | ✅ | ✅ | ✅ L (in main POST) | ✅ | ✅ | ✅ helper | ❌ MISSING |
| `POST /projects/:id/references` | references.ts:89 | ⚠️ DB-only? | — | ✅ | — | — | — | ❌ MISSING |
| `POST /projects/:id/references/bulk` | references.ts:175 | ⚠️ DB-only? | — | ✅ | — | — | — | ❌ MISSING |
| `POST /projects/:id/references/format` | references.ts:343 | ⚠️ DB-only? | — | ✅ | — | — | — | ❌ MISSING |
| `POST /projects/:id/references/regenerate` | references.ts:401 | ✅ | ✅ L489 | ✅ | ✅ | ✅ | ✅ | ✅ (broken) |
| `POST /projects/:id/references/auto-cite` | references.ts:1006 | ✅ | ✅ L1191 | ✅ L1203 | ✅ | ✅ | ✅ | ❌ MISSING |
| `POST /references/fetch-metadata` | references.ts:553 | ⚠️ external API | — | ✅ | — | — | — | N/A |
| `POST /projects/:id/analyze` | projects.ts:272 | ✅ | ✅ L390 | ✅ | ✅ | ✅ | ✅ | ✅ (broken) |
| `POST /projects/:id/outline` | projects.ts:566 | ✅ | ✅ L630 | ✅ | ✅ | ✅ | ✅ | ❌ MISSING |
| `POST /projects/:id/documents/generate` | projects.ts:682 | ✅ | ✅ L485 + L829 | ✅ | ✅ | ✅ | ✅ | ❌ MISSING |
| `POST /projects/:id/share` | projects.ts:1222 | ❌ DB-only | — | — | — | — | — | N/A |
| `POST /users/me/writing-style/analyze` | writing-style.ts:35 | ✅ | ✅ L108 | ✅ L107-145 | ✅ L69-78 | ✅ L121-128 | ✅ helper L112-118 | ❌ MISSING |
| `POST /projects/:id/quizzes/:id/submissions` | quizzes.ts:265 | ❌ DB-only | — | — | — | — | — | N/A |

**Summary:** 11 AI-generating routes. Only 3 have rate limit, all 3 are broken (req.user bug).

---

## 🔴 Critical Issue #1 — Rate Limiter Mounted Before Auth Middleware

### Symptoms

In `artifacts/api-server/src/app.ts:91-93`:
```typescript
// Rate-limit AI endpoints
app.use("/api/projects/:projectId/messages", aiLimiter);
app.use("/api/projects/:projectId/references/regenerate", aiLimiter);
app.use("/api/projects/:projectId/analyze", aiLimiter);
```

These are registered BEFORE `app.use("/api", router)` (line 95). The router's auth middleware (`router.use(authMiddleware)` in `routes/index.ts:39`) runs AFTER, when the route handler is invoked.

In `app.ts:78-85`:
```typescript
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
  // ...
});
```

**Effect:** When `aiLimiter` runs, `req.user` is undefined → falls back to `req.ip`. Rate limit is per-IP, not per-user.

### Impact

- Multiple users behind same NAT (corporate office, mobile carrier) share the 30/min quota
- One abusive user can DoS others behind same IP
- User-level quota tracking broken (the comment "User-level quota enforcement will be added after payment system is implemented" was correct in spirit but the fallback to IP defeats the purpose)
- **Not currently exploited** — production traffic is low

### Root cause class

**Same class as lessons-learned entry "Rate limiter blanket `app.use(path, limiter)` hits auto-called endpoints" (2026-08-28)** — but different bug: mount order issue rather than blanket coverage issue.

### Fix

Move `aiLimiter` registration into `routes/index.ts` AFTER `router.use(authMiddleware)`. This guarantees `req.user.id` is available when the limiter computes the key.

**Additional fix:** Expand coverage to ALL AI-generating routes (currently only 3 of 11 are limited).

### Decision

Apply fix as part of Topic 3 deliverables. See "Code Fixes Applied" below.

---

## 🟠 High Issue #2 — Missing Rate Limit on 8 AI Endpoints

### Endpoints NOT rate-limited

| Endpoint | File | Risk |
|----------|------|------|
| `POST /projects/:id/quizzes` | quizzes.ts:72 | User can spam quiz generation, drain balance |
| `POST /projects/:id/quizzes/:id/rubric` | rubrics.ts:42 | Same — rubric generation |
| `POST /projects/:id/references` | references.ts:89 | (verify: is this AI or DB?) |
| `POST /projects/:id/references/bulk` | references.ts:175 | Same |
| `POST /projects/:id/references/format` | references.ts:343 | Same |
| `POST /projects/:id/references/auto-cite` | references.ts:1006 | Auto-cite uses AI |
| `POST /projects/:id/outline` | projects.ts:566 | Outline generation |
| `POST /projects/:id/documents/generate` | projects.ts:682 | DOCX/PPTX generation |
| `POST /users/me/writing-style/analyze` | writing-style.ts:35 | Writing style analysis |

### Impact

- User can call AI endpoints 100+ times/minute, drain balance, rack up cost
- Single bad actor can spam and cost Teora real money (Groq API, OpenAI, etc.)
- No protection against accidental loops

### Fix

Add these to the same `router.use(path, aiLimiter)` registrations in `routes/index.ts` (after authMiddleware fix).

---

## 🟢 Low Issue #3 — Code Consistency: `messages.ts` Uses Inline DB Insert

`messages.ts:170-184` does inline `db.insert(aiUsageLogTable).values({...})` instead of using the `logAIUsage` helper from `lib/ai-usage-log.ts`. Other routes (`quizzes.ts`, `rubrics.ts`, `references.ts`, `projects.ts`, `writing-style.ts`) use the helper.

### Impact

Cosmetic only. Both work correctly. Helper has better error handling (try/catch returns null instead of throwing).

### Decision

**Deferred** — refactor would touch working code with no functional benefit. Tracked for future cleanup.

---

## 🟢 Low Issue #4 — Generic 502 Error in references.ts

`references.ts:1203` returns `{ error: "AI provider error", detail: ... }` — English error message, inconsistent with other Indonesian error messages in the codebase (post-error-translation commit 2026-09-04).

### Impact

Minor UX inconsistency.

### Decision

**Deferred** — fix in a separate commit if owner wants full Indonesian consistency. Not blocking.

---

## Code Fixes Applied (this session)

### Fix #1: Move aiLimiter to routes/index.ts after authMiddleware

**Before** (`app.ts:78-93`):
```typescript
const aiLimiter = rateLimit({ ... });  // defined here

app.use("/api/auth", authLimiter);
app.use("/api/projects/:projectId/messages", aiLimiter);  // ❌ before auth
app.use("/api/projects/:projectId/references/regenerate", aiLimiter);  // ❌
app.use("/api/projects/:projectId/analyze", aiLimiter);  // ❌
app.use("/api", router);
```

**After:**
```typescript
// app.ts: keep authLimiter here (auth endpoints don't need req.user)
// aiLimiter definition moves to routes/index.ts
app.use("/api/auth", authLimiter);
app.use("/api", router);
```

```typescript
// routes/index.ts: AFTER authMiddleware
import { aiLimiter } from "../lib/ai-limiter.js";

router.use(authMiddleware);
router.use("/projects/:projectId/messages", aiLimiter);
router.use("/projects/:projectId/quizzes", aiLimiter);
router.use("/projects/:projectId/references", aiLimiter);
router.use("/projects/:projectId/analyze", aiLimiter);
router.use("/projects/:projectId/outline", aiLimiter);
router.use("/projects/:projectId/documents/generate", aiLimiter);
router.use("/users/me/writing-style/analyze", aiLimiter);
```

This fixes both Critical #1 (req.user bug) and High #2 (missing coverage on 8 endpoints).

### Verification

- `pnpm run typecheck` → 0 errors
- `pnpm run build` → success
- Deploy: per `deploy-error-playbook-20260904.md`, use `vercel deploy --prod --yes` (no `--prebuilt`)
- Post-deploy: trigger each AI endpoint, confirm 200/4xx/5xx but NEVER rate-limited-by-IP-only behavior

---

## Owner Live Test Checklist

Owner to manually verify each AI feature end-to-end. For each:
1. Login sebagai user biasa (bukan owner email)
2. Trigger feature
3. Check response (200 = success, 4xx = expected error like 402 insufficient balance, 5xx = bug)
4. Check Vercel logs for any unhandled errors
5. Check `ai_usage_log` table — should have new record with `requestType` and `tierId` populated

| # | Feature | Endpoint | Expected requestType | Test status |
|---|---------|----------|---------------------|-------------|
| 1 | Chat | POST `/projects/:id/messages` | `chat` | ☐ |
| 2 | Quiz generate | POST `/projects/:id/quizzes` | `quiz` | ☐ |
| 3 | Quiz submit | POST `/quizzes/:id/submissions` | (no AI — DB only) | ☐ |
| 4 | Rubric generate | POST `/projects/:id/quizzes/:id/rubric` | `rubric` | ☐ |
| 5 | Bibliography | POST `/projects/:id/references` | (DB) | ☐ |
| 6 | Reference regenerate | POST `/projects/:id/references/regenerate` | `bibliography` | ☐ |
| 7 | Auto-cite | POST `/projects/:id/references/auto-cite` | `citation` | ☐ |
| 8 | Analyze | POST `/projects/:id/analyze` | `analyze` | ☐ |
| 9 | Outline | POST `/projects/:id/outline` | `outline` | ☐ |
| 10 | Generate DOCX | POST `/projects/:id/documents/generate` (DOCX) | `write` | ☐ |
| 11 | Generate PPTX | POST `/projects/:id/documents/generate` (PPTX) | `write` | ☐ |
| 12 | Writing style | POST `/users/me/writing-style/analyze` | `analyze_style` | ☐ |

**Total: 11 AI calls + 1 DB-only test = 12 features to verify.**

For each ✅: owner responds with "OK" or error details.

---

## Cross-references

- **Lessons learned:**
  - `[Backend 401 "Unauthorized" — mount order middleware + JWT verification + trust proxy]` (2026-09-01) — same class of bug: middleware order
  - `[Rate limiter blanket app.use(path, limiter) hits auto-called endpoints]` (2026-08-28) — same class: rate limit scope
- **Decisions:**
  - DECISION 006 — Express middleware patterns (per-route preferred over blanket)
  - DECISION 015 — Deploy robustness
- **Related issues:**
  - `.ai/blockers.md` AI_API_KEY — initially listed as missing but verified in env (`AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL` all set 2026-08-25)
