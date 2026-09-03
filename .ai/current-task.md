# Current Task

> Updated by AI at milestones. New sessions: read this first.

---

## COMPLETED 2026-09-04 — Full Project Audit

**Status:** ✅ DONE — Audit report at `E:/teora/audit.md` (680 lines, 24 issues)
**Model:** claude-opus-4-6

### Scope

All source files across frontend, backend, lib, root configs, workflows, docs.

### Key Findings

| Severity | Count | Examples |
|----------|-------|---------|
| Critical | 3 | `reference_citations` (DB only), `usersTable` import missing (compile error), `Math.random()` for tokens |
| High | 7 | outdated AI model names, no API timeout, duplicate queries, topics JSONB/text, NULL collision, upsert NULL, citation endpoints missing |
| Medium | 9 | double JSON ops, type shadowing, raw SQL ordering, stale dist/, monolith OpenAPI, unused prop, no migrations, unused import, duplicate generated files |
| Low | 5 | outdated branding, duplicate tsconfig, orphan files, committed MSW bundle, deprecated workflow |

### Audit File

`E:/teora/audit.md`

---

## COMPLETED 2026-09-03 — Practice (Learning Activity System)

**Status:** ✅ DONE — Branch pushed, awaiting PR merge
**Model:** claude-opus-4-6

### Summary

DECISION 013 — Practice menu: quiz/recommendation system that auto-extracts topics from Task Mentor projects.

### Components Done

| Component | Status | Notes |
|-----------|--------|-------|
| DB Schema | ✅ | `learning_activities` table in `lib/db/src/schema/learning-activities.ts` |
| OpenAPI spec | ✅ | 3 endpoints: GET/POST `/learning-activities`, GET `/learning-activities/recommendations` |
| Backend routes | ✅ | `artifacts/api-server/src/routes/learning-activities.ts` with upsert logic |
| Codegen | ✅ | `useListLearningActivities`, `useCreateLearningActivity`, `useGetPracticeRecommendations` |
| Frontend route | ✅ | `/practice` in App.tsx |
| Sidebar nav | ✅ | Brain icon between Pustaka Saya and Task Mentor |
| Practice page | ✅ | Recommendations + activity history |
| Build | ✅ | `npm run build` passed |
| Typecheck | ✅ | No errors in practice.tsx |

### Pending

- Merge PR `feat/practice-clean` → `main` (frontend auto-deploys after merge)
- Auto-extract trigger: extract topics when project is created (General Task on submit, Academic Work on create) — TBD

---

## COMPLETED 2026-09-01 — SPA Routing Fix

**Status:** ✅ SELESAI — Deploy berhasil, semua route 200 OK
**Model:** claude-opus-4-6

### Bug Fix

| Error | Root Cause (sebenarnya) | Fix | Status |
|-------|----------------------|-----|--------|
| `/auth/callback` 404 | `tsconfig.json` extends `../../tsconfig.base.json` — tidak accessible saat Vercel build di subdirectory → build FAIL → tidak ada dist/ → SPA rewrite tidak punya HTML untuk di-serve | Inline `tsconfig.base.json` compilerOptions ke workspace `tsconfig.json` | ✅ Deploy 2026-09-01 |

