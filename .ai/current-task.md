# Current Task

> Updated by AI at milestones. New sessions: read this first.

---

## ACTIVE 2026-09-03 — Practice (Learning Activity System) — Implementation

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

### Lessons

- Codegen output in `lib/api-client-react/src/generated/` but frontend reads from `artifacts/academic-workspace/src/lib/api-client-react/generated/` — sync manually after codegen
- pnpm install fails due to `@replit/vite-plugin-cartographer` catalog entry missing — use `npm install` locally instead
- `.ai/` is in `.gitignore` — must use `git add -f` to force-add

### Commits (feat/practice-clean)

- `85e6d4a` — feat(practice): Learning Activity schema + backend API routes
- `1619a0b` — feat(practice): frontend Practice page + generated API hooks

---

## ACTIVE 2026-09-01 — SPA Routing Fix ✅ SELESAI

**Status:** ✅ SELESAI — Deploy berhasil, semua route 200 OK
**Model:** claude-opus-4-6

### Bug Fix

| Error | Root Cause (sebenarnya) | Fix | Status |
|-------|----------------------|-----|--------|
| `/auth/callback` 404 | `tsconfig.json` extends `../../tsconfig.base.json` — tidak accessible saat Vercel build di subdirectory → build FAIL → tidak ada dist/ → SPA rewrite tidak punya HTML untuk di-serve | Inline `tsconfig.base.json` compilerOptions ke workspace `tsconfig.json` | ✅ Deploy 2026-09-01 |

### Yang Terjadi

Deploy pipeline terlihat berhasil (CI green) tapi route tetap 404. Setelah dapat Vercel build logs, ketemu: build FAIL karena tsconfig extends path. Vercel SPA routing (vercel.json rewrites) sebenarnya SUDAH BENAR — tapi tidak bisa serve HTML kalau build gagal.

Root cause berlapis:
1. vercel.json rewrites: `/(.*)` → `/index.html` ✅ (already correct)
2. tsconfig.json: extends `../../tsconfig.base.json` → FAIL ❌

Fix: inline tsconfig.base.json jadi self-contained.

### Verifikasi

```
/login         → 200 HTML
/auth/callback → 200 HTML
/callback      → 200 HTML
/              → 200 HTML
/favicon.ico   → 200 SVG
/api/v1/health → 401 (backend proxy works)
```

### Lesson Learned

- vercel.json SPA rewrites SUDAH auto-fallback — tidak perlu manual config.json
- tsconfig yang extend parent config TIDAK portable untuk Vercel build
- Build failure di Vercel = 404 untuk semua route, bukan error message
- Cek Vercel build logs untuk diagnosis — bukan cuma workflow status

### Commits

- `ace7bae` — fix(build): inline tsconfig.base.json into workspace tsconfig.json
- `14c49e6` — fix(deploy): add diagnostic output to find root cause
- `9e321d6` — fix(deploy): use vercel deploy (not --prebuilt) — vercel.json handles SPA routing
- `9d882c5` — fix(deploy): SPA routing — correct asset paths + /api bypass
- `b135ccb` — fix(deploy): SPA fallback route loop (merge)
- `a8e8a87` — fix(ui): add /callback route + redirect favicon.ico

