# Current Task

> Updated by AI at milestones. New sessions: read this first.
>
> ⚠️ **CROSS-MODEL NOTE (untuk model baru: opus-4-6, dst):**
> Sebelum kerja apapun, BACA section `ACTIVE` di bawah + section `Handoff` (kalau ada) untuk resume context.
> Lalu baca `.ai/progress.md`, `.ai/blockers.md`, `.ai/decisions.md`, `git log --oneline -20` sesuai Session Start Protocol di CLAUDE.md.
> Balas ke owner: `Konteks loaded ✅ Model: claude-opus-4-X Task aktif: [...] Status: [...] Siap lanjut.`

---

## 🎯 ACTIVE 2026-09-04 — Production Restore feat/daftar-task + Silent Errors Fix P3

**Status:** ⏳ Cherry-picking `62ef81a` + `5ff4daa` onto `feat/daftar-task`, then redeploy
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task` (after cherry-pick)

### What

Owner directive (2026-09-04): "menu terbaru yg sudah dibuat itu harrus live"

`feat/practice-clean` was deployed earlier today but REGRESSED feat/daftar-task features (Daftar Task, Branding, DECISION 014 Phase 1/2/3, PPTX). Cherry-picking the silent errors fixes (commits `5ff4daa` + `62ef81a`) from feat/practice-clean onto feat/daftar-task to restore production.

### Silent Errors Fixes Applied

| # | Case | File | Fix |
|---|------|------|-----|
| CRITICAL #1 | `handleSetActive` — phantom success | `project.tsx` | `onError` toast added |
| CRITICAL #2 | `handleTierChange` — silent fail | `admin-users.tsx` | `toast` on error |
| CRITICAL #3 | `handleSuspend` — silent fail | `admin-users.tsx` | `toast` on error |
| HIGH #4 | `fetchMe` — silent logout | `use-auth.tsx` | `toast` before logout |
| HIGH #5 | `refresh` — silent logout | `use-auth.tsx` | `toast` before logout |
| P3 #7 | `handleSelectQuiz` fallback — stale data | `project.tsx` | warning toast |
| P3 #9 | Bibliography regeneration — no success | `project.tsx` | success toast "Daftar pustaka berhasil diperbarui." |
| P3 #10 | Clipboard copy — silent fail | `referral.tsx` | error toast "Tidak dapat menyalin" |
| P3 #12 | Admin users list error — generic | `admin-users.tsx` | separate error state, "Gagal memuat data" cell |

### Commits

- `5ff4daa` fix: add missing error toasts for critical silent errors (already on feat/daftar-task after cherry-pick)
- `62ef81a` fix: complete P3 silent error fixes (#7 #9 #10 #12) (cherry-picked from feat/practice-clean)

### Plan

1. ✅ Cherry-pick `62ef81a` + `5ff4daa` onto feat/daftar-task
2. ⏳ Resolve conflicts (admin-users.tsx, .ai/current-task.md) — both DONE
3. ⏳ Build with env vars
4. ⏳ Deploy via Vercel CLI `--prebuilt`
5. ⏳ Verify all 4 toast strings + Daftar Task + PPTX + Pustaka Saya features live
6. ⏳ Report to owner

---

## COMPLETED 2026-09-03 — PPTX Export (Slide/PPT) ✅ DONE

**Status:** ✅ DONE — committed `d3141de`, backend deployed `dpl_D45wtbFEJkD9bNVyQbHpGH25cjTR`, frontend deployed `dpl_9yU9hqKYLe6HatQpSTsD93dN7y6m`
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task` (unmerged — 4 commits ahead of main)

### What Was Built

| Layer | File | Change |
|-------|------|--------|
| Backend lib | `src/lib/pptx-export.ts` (271 lines) | `generatePptx()` — parse outline into slides, theme rendering, bibliography |
| Backend route | `routes/projects.ts` (+102 lines) | `GET /projects/:id/export/pptx` — fetch docs + refs, call generatePptx, stream .pptx |
| Dependency | `package.json` | `pptxgenjs` v4.0.1 added |
| OpenAPI | `openapi.yaml` | `outputFormat` enum extended with `pptx` |
| Codegen | `lib/api-zod`, `lib/api-client-react` | Regenerated |
| Frontend | `new-project.tsx` | Output format toggle (Dokumen/Slide) in creation form |
| Frontend | `project.tsx` | Export dialog (DOCX/PDF/PPTX), Slide tab (`PptTab`) with reveal.js preview |

### Commit

`d3141de` — feat(ppt): Full PPTX export — backend + frontend + reveal.js preview (12 files, +1453/-1198)

### Production URLs

| Service | URL | Deploy ID |
|---------|-----|-----------|
| Backend | https://teora-backend.vercel.app | `dpl_D45wtbFEJkD9bNVyQbHpGH25cjTR` |
| Frontend | https://academic-workspace-eta.vercel.app | `dpl_9yU9hqKYLe6HatQpSTsD93dN7y6m` (pending redeploy) |

---

## 🎯 COMPLETED 2026-09-03 — Referensi Tool + Auto-Cite + Pustaka Saya (DECISION 014) ✅ ALL PHASES COMPLETE

**Status:** ✅ Phase 1+2+3 DONE 2026-09-03 PM — committed `6d082a4`, deployed
**Model:** claude-opus-4-8
**Owner:** sagise
**Reference:** DECISION 014 di `.ai/decisions.md` — full spec approved

### Surprise Discovery (2026-09-03)

Backend Pustaka Saya **SUDAH FULL IMPLEMENTED** (`artifacts/api-server/src/routes/account-references.ts`, 435 baris) — Phase 3 effort turun dari 5-6 → 2-3 hari (tinggal frontend UI).

---

## COMPLETED 2026-09-04 — Error Messages → Bahasa Indonesia

**Status:** ✅ DONE — Backend + Frontend deployed

~120 error messages di backend di-translate ke Bahasa Indonesia. Frontend custom-fetch di-fix untuk tidak tampilkan HTTP status code.

---

## COMPLETED 2026-09-04 — Full Project Audit

**Status:** ✅ DONE — Audit report at `E:/teora/audit.md` (680 lines, 24 issues)
**Model:** claude-opus-4-6

### Key Findings

| Severity | Count | Examples |
|----------|-------|---------|
| Critical | 3 | `reference_citations` (DB only), `usersTable` import missing, `Math.random()` for tokens |
| High | 7 | outdated AI model names, no API timeout, duplicate queries, topics JSONB/text |
| Medium | 9 | double JSON ops, type shadowing, raw SQL ordering, stale dist/ |
| Low | 5 | outdated branding, duplicate tsconfig, orphan files |

---

## COMPLETED 2026-09-03 — Practice (Learning Activity System)

**Status:** ✅ DONE — Branch pushed, awaiting PR merge
**Model:** claude-opus-4-6

DECISION 013 — Practice menu: quiz/recommendation system that auto-extracts topics from Task Mentor projects.

### Components Done

| Component | Status | Notes |
|-----------|--------|-------|
| DB Schema | ✅ | `learning_activities` table |
| OpenAPI spec | ✅ | 3 endpoints: GET/POST `/learning-activities`, GET `/learning-activities/recommendations` |
| Backend routes | ✅ | `artifacts/api-server/src/routes/learning-activities.ts` with upsert logic |
| Frontend route | ✅ | `/practice` in App.tsx |
| Sidebar nav | ✅ | Brain icon between Pustaka Saya and Task Mentor |
| Practice page | ✅ | Recommendations + activity history |
| Build | ✅ | `npm run build` passed |

### Pending

- Merge PR `feat/practice-clean` → `main`
- Auto-extract trigger: extract topics when project is created

---

## COMPLETED 2026-09-01 — SPA Routing Fix

**Status:** ✅ SELESAI — Deploy berhasil, semua route 200 OK

| Error | Root Cause | Fix | Status |
|-------|-----------|-----|--------|
| `/auth/callback` 404 | `tsconfig.json` extends `../../tsconfig.base.json` — not accessible at Vercel build in subdirectory → build FAIL | Inline `tsconfig.base.json` compilerOptions into workspace `tsconfig.json` | ✅ Deploy 2026-09-01 |
