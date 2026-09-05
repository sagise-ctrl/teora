# Current Task

> Updated by AI at milestones. New sessions: read this first.
>
> ⚠️ **CROSS-MODEL NOTE (untuk model baru: opus-4-6, dst):**
> Sebelum kerja apapun, BACA section `ACTIVE` di bawah + section `Handoff` (kalau ada) untuk resume context.
> Lalu baca `.ai/progress.md`, `.ai/blockers.md`, `.ai/decisions.md`, `git log --oneline -20` sesuai Session Start Protocol di CLAUDE.md.
> Balas ke owner: `Konteks loaded ✅ Model: claude-opus-4-X Task aktif: [...] Status: [...] Siap lanjut.`

---

## 🎯 ACTIVE 2026-09-05 — Google OAuth Login Fix

**Status:** ✅ DONE — Deployed
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`
**Commit:** `c54b006`

### What

Owner screenshot `e:\teora\screnshoot\er5.png` menunjukkan Google OAuth callback return 500 dengan HTML Vercel default. Frontend menampilkan "Login gagal" tanpa diagnostic.

### Root cause

Commit `4e00ed0` (username feature, 2026-09-04) pakai `db.sql\`COALESCE(...)\`` di `/api/auth/login` — tapi `db` (Drizzle client) TIDAK mengekspor `sql`. `sql` harus di-import dari `drizzle-orm`:
```typescript
// Wrong (4e00ed0)
import { eq } from "drizzle-orm";
username: db.sql`COALESCE(...)`  // TypeError

// Right (c54b006)
import { eq, sql } from "drizzle-orm";
username: sql`COALESCE(...)`
```

TypeError uncaught → Vercel returns HTML 500 → frontend unparseable → generic error.

### Fix

| Layer | Change |
|-------|--------|
| `artifacts/api-server/src/routes/auth.ts` | Import `sql` from drizzle-orm, replace `db.sql` with `sql` |
| Same file | Tambah try/catch wrapper — future unhandled returns JSON 500 (Indonesian) not HTML |
| Bundle | Rebuilt (6.4MB), deployed |

### Deploy

- **Backend:** `teora-backend-2jiq3nf51-sagise-ctrls-projects.vercel.app` → alias `teora-backend.vercel.app`
- **Verified:** Vercel logs show no 500 errors post-fix. `GET /api/healthz` 200 OK. `POST /api/auth/login` invalid token → 401 (route handler valid).

### Lessons cross-checked

- `.ai/lessons-learned.md` scanned: 4 auth-related entries (cross-origin cookie, mount order + JWT, rate limit, **new: db.sql API misuse**)
- 3 prior entries cover 401/429 — this is a new class (500 unhandled)
- Root cause identified via Vercel runtime logs (per memory `vercel-mcp-blind-spot` — MCP returns 403, used CLI fallback)

### Next

Owner manual test: click Google sign-in, verify login flow completes to dashboard.

### Handoff 2026-09-05 07:10 — model opus-4-8 → next

- **Active task:** Google OAuth login fix deployed
- **Last 3 actions:** (1) Diagnose via Vercel logs → TypeError db.sql, (2) Fix source + add try/catch, (3) Rebuild + redeploy + verify
- **Next 3 actions:** (1) Owner manual Google OAuth login test, (2) If still broken → check `auth-callback.tsx` token format match, (3) If works → continue other open topics from `.ai/current-task.md` section PENDING
- **Open questions:** None for this fix. Other open topics (non-owner admin dashboard access, OCR/practice upload, token UI) still waiting for owner.

---

## 🎯 ACTIVE 2026-09-04 — Username + DisplayName Identity

**Status:** ✅ DONE — All done, deployed
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task`
**Committed:** `4e00ed0` (username feature), `b763025` (workflow fix), `ed9c6db` (enhanced landing page)

### Landing Page Enhanced — ✅ DONE (2026-09-04, session ini)

Commit `ed9c6db`: Full public landing page with hero section, 5 feature cards, CTA, footer. Font change DM Sans/Fraunces/Space Mono → Inter/Space Grotesk/JetBrains Mono. Google Fonts loaded via CSS @import for reliability.

**Deployed:** `dpl_CyQ9ndXKcX8s7VLbM4f72BmAYtWV` → `academic-workspace-eta.vercel.app`
**Bundle:** `index-DyW80fAi.js` — verified contains "Asisten Akademik", "Belajar Memahami", "Daftar Sekarang", "Mulai Gratis", all 5 feature titles
**Routes:** / /login /register /dashboard → all 200 ✅

### Done

| Component | Status |
|-----------|--------|
| DB: `username` column | ✅ Added via Supabase MCP, existing users backfilled from email |
| OpenAPI spec | ✅ `username` in `RegisterRequest` (required), `AuthUser`, `UserProfile`, `UpdateProfileRequest` |
| Backend `/auth/register` | ✅ Requires username, validates format, checks uniqueness |
| Backend `/auth/login` | ✅ Backfills existing users without username (COALESCE + collision loop) |
| Backend `/auth/check-username` | ✅ Debounced availability check endpoint |
| Backend `/users/me/profile` PATCH | ✅ Username update with uniqueness check |
| Frontend registration form | ✅ Username field with debounced availability check + checkmark/X icon |
| Frontend account page | ✅ Shows `@username` in Account Info card |
| Codegen | ✅ Orval ran, types include `username` in all schemas |
| Build | ✅ `pnpm run build` passes |
| DB migration | ✅ Applied via Supabase MCP (nullable first, backfill, NOT NULL) |
| Backend deploy | ✅ `vercel deploy --prod` → `dpl_76ghKvEFDoN9E9AZMe174cvxgjtC` → `teora-backend.vercel.app` |
| Frontend deploy | ✅ `vercel deploy --prod` → `dpl_Azm3e7Eq9Rw3xKyYxtEoAxULjdSx` → `academic-workspace-eta.vercel.app` |

### Feature Summary

- **username** — unique, required at registration, 3-30 chars, `[a-zA-Z0-9_]`
- **displayName** — already existed (nullable, optional, for greeting)
- Existing users backfilled: `sagiseainun@gmail.com` → `sagiseainun`, `ainunnaim546153@gmail.com` → `ainunnaim546153`
- `/auth/check-username?username=xxx` returns `{ available: boolean, username: string }`
- Registration form shows real-time availability check (debounced 500ms) with check/X icons

### Fixes Applied This Session

1. `register.tsx`: Fixed import `apiClient` → `customFetch` from `@/lib/api-client-react`
2. `deploy-backend.yml`: Added `workflow_dispatch` trigger for non-main branch deploys (commit `b763025`)

### Production URLs

| Service | URL |
|---------|-----|
| Backend | https://teora-backend.vercel.app |
| Frontend | https://academic-workspace-eta.vercel.app |

### Landing Page — ✅ DONE
- `src/pages/landing.tsx` created — hero + 5 feature cards + CTA + footer
- Route `/` registered in App.tsx (line 68), Dashboard nav updated to `/dashboard`
- Auth redirect: logged-in users go to `/dashboard` (via `<Redirect>` from wouter)
- Build: `vite build` ✅
- **Deployed:** `dpl_57hbZ1X9ar9BdKwbBx6CpDaiBFnL` → `academic-workspace-eta.vercel.app` ✅
- **Verified:** bundle contains "mulai", "masuk", "gratis", "Task Mentor", "dashboard" ✅

### AI Usage Audit — ✅ DONE
All AI routes verified with `logAIUsage` + `deductCredit`:

| Route | Status |
|-------|--------|
| Chat (messages.ts) | ✅ |
| Quiz (quizzes.ts) | ✅ |
| Bibliography (references.ts) | ✅ |
| Citations/Auto-Cite (references.ts) | ✅ |
| Analyze (projects.ts) | ✅ |
| Write/Generate (projects.ts) | ✅ |
| Rubric (rubrics.ts) | ✅ |
| Writing style (writing-style.ts) | ✅ |
| Usage stats API | ✅ |
| Balance API | ✅ |
| Export PPTX/DOCX/MD | N/A — pure data transformation, no AI |
| AI provider fallback | ❌ No fallback if Groq/OpenAI down |
| Rate limit UX | ❌ No user-facing message |

### Remaining Modified Files — ✅ COMMITTED + PUSHED
- `4e00ed0` — landing page + username registration + operational updates (21 files)
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task`

### What

User registration needs two identity fields:
1. **displayName** — untuk sapaan (sudah ada, nullable, opsional) → perlu jadi required?
2. **username** — unik, untuk share URL project (`/u/budi`), required saat registrasi

### Scope

| Layer | Change |
|-------|--------|
| DB | `usersTable`: add `username` (unique, not null) |
| OpenAPI | `RegisterRequest`: add `username` required; `AuthUser`/`UserProfile`/`UpdateProfileRequest`: add `username` |
| Backend | Validasi format + uniqueness; endpoint `/auth/check-username` untuk availability check |
| Frontend | Registration form: tambah field username + availability check |
| Frontend | Akun page: tampilkan username |
| Codegen | `lib/api-zod` + `lib/api-client-react` |

### Next

1. DB migration
2. OpenAPI update
3. Backend validation + endpoint
4. Frontend registration form
5. Frontend account page
6. Codegen
7. Build + test
8. Deploy

**Status:** ✅ Discussion report DONE. Pending owner review.
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`

### Why

Owner: "fitur kuis yang menarik dengan parameter penilaian dan hasil yang memperlihatkan beberapa parameter pemahaman, serta riwayat quiz serta ada semacam riwayat progres perkembangan user di suatu materi"

### Done

- ✅ Research Agent 1: Quiz scoring best practices — Bloom's taxonomy (6-level simplified to 3-dimension MVP), Khan Academy mastery levels, FSRS spaced repetition, Recharts for visualization, multi-platform comparison (Quizizz/NotebookLM/Anki/Brilliant)
- ✅ Research Agent 2: OCR tech stack — Google Cloud Vision API (primary), Gemini 2.5 Flash Vision (fallback), unpdf for PDF, Tesseract.js browser-only
- ✅ AI Team discussion report: `.ai/practice-upload-discussion.md` — 10 sections, 28KB

### Report Summary

| Topic | Recommendation |
|-------|---------------|
| Scoring dimensions | 3-dimension simplified Bloom: Pemahaman Konsep / Penerapan / Analisis |
| Upload pipeline | Supabase Storage signed URL → unpdf (PDF) / Google Vision (OCR) → Gemini Flash fallback |
| SRS | FSRS (20-30% more efficient than Anki's SM-2), TypeScript library |
| Mastery levels | Belum Belajar → Sedang Belajar → Terbiasa → Menguasai (Khan-style) |
| Cost per user | ~$0.12/bulan (OCR + AI generation) — negligible margin impact |
| Effort | Fase 1 (Foundation): 20 days, Fase 2 (Progress): 14 days, Fase 3 (Advanced): 16 days |

### Next

Owner review discussion report, answer open questions, give direction.

### Open Questions Owner

1. Skip OCR → feed image directly to multimodal LLM? (A/B test recommendation)
2. Storage retention policy? (default 12 bulan?)
3. Free tier users dapat akses upload? (3 upload/bulan limit?)
4. Mastery challenge UX: pop-up interrupt atau tab pojok?

---

## 🎯 PENDING — 4 Open Discussion Topics (Owner 2026-09-04)

**Status:** ⏳ Saved — awaiting detailed discussion
**Owner input:** "tambah untuk bahan diskusi"
**Saved:** `.ai/open-discussion-topics.md`

### Topics

| # | Topik | Tipe | Prioritas |
|---|-------|------|-----------|
| 1 | Non-owner email dapat opsi Admin Dashboard | Bug | High |
| 2 | Landing page / hero section sebelum login | Missing Feature | Medium |
| 3 | AI API integration verification — semua fitur jalan? | Audit | High |
| 4 | Token limit, sisa token, AI usage per user | Feature | High |

### Status Detail

1. **Bug** — login dengan email non-owner masih lihat opsi Admin Dashboard. Whitelist check perlu dicek.
2. **Missing** — URL langsung redirect ke login, tidak ada landing page publik.
3. **Audit** — semua AI routes (quiz, rubric, PPTX, chat, etc.) perlu diverifikasi jalan di production.
4. **Partial** — `ai_usage_log` + `user_balances` tables sudah ada, perlu UI + logic lengkap.

### Next

Owner signals untuk mulai diskusi salah satu topik.

---

## 🎯 HISTORICAL 2026-09-04 — Deploy Robustness Strategy (DECISION 015)

**Status:** ✅ Documentation + 1 permanent fix applied. Validation pending next deploy.
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`

### Why

Owner directive: "issue case deploy selalu error ini sering banget, harus punya catatan khusus agar case tidak terulang dan bisa cepat cari penyebabnya kalau bisa hilangkan sebab error agar kedepannya selalu lancar, tolong catat"

7 distinct deploy error patterns observed 2026-08-22 to 2026-09-04. No single source of truth for diagnosis.

### Done

- ✅ DECISION 015 logged: 7 patterns analyzed, 4 root cause classes identified, strategy = Fix + Document
- ✅ Permanent fix applied: `artifacts/academic-workspace/vercel.json` installCommand `--omit=dev` + `NPM_CONFIG_PRODUCTION=true` (commit `93b29d0`)
- ✅ Master playbook: `memory/deploy-error-playbook-20260904.md` — symptom-first diagnosis table untuk 4 phases
- ✅ Lessons-learned entry with format WAJIB (Gejala/Root cause/Opsi/Kenapa pilih/Cek masa depan)
- ✅ Issue-tracker entry with 7-pattern historical + cumulative impact

### Pending Permanent Fixes (Tracked, Not Applied Yet)

- [ ] Pin `@vercel/node` version in api-server (prevent Vercel auto-inject vulnerable)
- [ ] Schedule `npm audit --audit-level=critical` as separate weekly CI job
- [ ] Add `build.sourcemap: false` to vite.config.ts (suppress sourcemap warnings)
- [ ] Add `.npmrc` `engine-strict=false` at root (suppress EBADENGINE warnings)

### Next Deploy

Validate DECISION 015 applied config. If `vercel build --prod` or `vercel deploy --prod --yes` succeeds with new installCommand → permanent fix confirmed. If fails → rollback vercel.json (`npm install --legacy-peer-deps` only) + rely on `vercel deploy --prod --yes` no `--prebuilt` workaround (already proven working).

---

## COMPLETED 2026-09-04 — Font Replacement (Inter + Space Grotesk + JetBrains Mono)

**Status:** ✅ DONE — Production deployed
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task`

### What

Font replacement across entire web:

| Role | Before | After |
|------|--------|-------|
| Headings (h1-h6) | Fraunces (serif) | Space Grotesk |
| UI / body text | DM Sans | Inter |
| AI / technical | Space Mono | JetBrains Mono |

### Changes Applied

| File | Change |
|------|--------|
| `artifacts/academic-workspace/src/index.css` | Google Fonts @import: DM Sans + Fraunces + Space Mono → Inter + Space Grotesk + JetBrains Mono; CSS vars `--app-font-sans/serif/mono` updated; prose-academic + .prose typography updated |
| `artifacts/academic-workspace/index.html` | Removed duplicate Google Fonts link (consolidated to CSS @import) |

### Deploy

- **Production:** `dpl_2uUCX4bMLfUWmwQvHJ3SjnjXa7Ug` → `academic-workspace-eoylah87i-sagise-ctrls-projects.vercel.app`
- **Alias:** `https://academic-workspace-eta.vercel.app`
- **Verified:** CSS bundle contains Inter, JetBrains Mono, Space Grotesk — old fonts (DM Sans, Fraunces, Space Mono) completely removed

---

## COMPLETED 2026-09-04 — Em Dash Cleanup

**Status:** ✅ DONE — Deployed `dpl_CPMaNRUgRYfrbLFFrTjeyBhaauqv` to production
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`

### Round 3 — Em Dash (—, U+2014) Audit & Removal

Owner directive (2026-09-04): "saya menghindari ' — ' muncul di fronted. bisa cek ada dimana saja, jangan setup apapun dulu"

Audit found **21 files** with em dash:
- **15 user-facing** (HTML/JSX strings/dialogs/toasts/mock content) → fixed
- **6 non-user-facing** (code comments, generated OpenAPI files, tests) → left per owner decision (B)

### Fixes Applied (commit `3f3dcd9`)

| # | File | Replacement |
|---|------|-------------|
| 1-3 | `index.html` (title, og:title, twitter:title) | `Teora: AI Academic Workspace` |
| 4 | `insufficient-balance-dialog.tsx` (line 30) | `"-"` (ASCII hyphen) |
| 5 | `custom-fetch.ts` (line 175) | `${prefix}: ${title} - ${detail}` |
| 6-7 | `admin-audit-log.tsx` (lines 121, 124) | `"-"` (ASCII hyphen) |
| 8 | `new-project.tsx` (line 57) | `ICMJE: populer untuk jurnal medis` |
| 9 | `project.tsx` (line 182) | `ICMJE: populer untuk jurnal medis` |
| 10 | `project.tsx` (line 2220) | `- {ref.title}` (ASCII hyphen) |
| 11 | `project.tsx` (line 2260) | `untuk review, klik` (comma) |
| 12 | `project.tsx` (line 2277) | `dari Teora. Review lalu klik` (period) |
| 13 | `pustaka-saya.tsx` (line 676) | `Pilih proyek` |
| 14 | `referral.tsx` (line 128) | `Join Teora: AI Academic Workspace` |

### Non-Fixed (per owner choice B for both)

- `lib/api-zod/src/generated/api.ts` (OpenAPI Zod `.describe()` — auto-regenerated from `openapi.yaml`)
- `lib/api-client-react/generated/api.ts` + `api.schemas.ts` (Orval-generated JSDoc headers)
- `mocks/data.ts` (line 150 — visible only in MSW dev mode)
- All code comments in `App.tsx`, `project.tsx`, `supabase.ts`, `status-mapping.ts`, `index.css`, `use-auth.test.tsx`, `setup.ts`

### Verification

- `tsc --noEmit` — 0 NEW errors (admin-audit-log line 40 `searchParams.page` is pre-existing on main)
- `vite build` — successful, `dist/index.html` + bundle contain no user-facing em dash
- Bundle filename: `index-CpsFdlsq.js` (local) — Vercel will produce different filename, but content matches

### Next

✅ DEPLOYED — production URL `https://academic-workspace-eta.vercel.app`

**Deploy details:**
- Method: `vercel deploy --prod --yes` (no `--prebuilt` due to local `vercel build` failure on `drizzle-zod/link:../` npm strict mode)
- Build: `npm run build` with inline env vars from `.env.production`
- Vercel buildCommand `npm run build` ran remotely (clean node_modules, no pnpm leftover)
- Deployment ID: `dpl_CPMaNRUgRYfrbLFFrTjeyBhaauqv`
- Bundle filename: `index-DAsXU2mi.js` (production) — different from local `index-DwfueVLp.js`, matches memory warning
- Ready in <3 min

**Verification done:**
- `dist/index.html` no em dash in title/og/twitter meta ✅
- Bundle grep: `Teora\xe2\x80\x94` count = 0 ✅
- Bundle contains: `/practice`, `Daftar Task`, `Pustaka Saya`, `Teora: AI`, `ICMJE:`, `Pilih proyek`, `Join Teora: AI` ✅
- All 7 routes (/ /practice /pustaka-saya /projects /assessment /referral /admin/users) HTTP 200 ✅

### Issue encountered

`vercel build --prod` (and `vercel deploy --prebuilt`) failed with `EUNSUPPORTEDPROTOCOL: link:../drizzle-orm/dist` — root cause: `node_modules/drizzle-zod/package.json` has `link:` in devDependencies, npm 11 strict mode rejects it when re-installing.

**Workaround used:** `vercel deploy --prod --yes` (no `--prebuilt`) — Vercel runs `npm run build` per `vercel.json` buildCommand, which uses clean remote node_modules (no pnpm leftover).

**Pattern sumber:** Deploy via `vercel deploy --prod --yes` (without `--prebuilt`) WORKS even when local `vercel build` fails, because Vercel's remote install environment doesn't have the cached `drizzle-zod` with `link:` devDeps.

### Original Round 3 Plan

### Practice (DECISION 013) Implementation

| Component | Status | Notes |
|-----------|--------|-------|
| DB Schema | ✅ | `learning_activities` table |
| Backend routes | ✅ | `artifacts/api-server/src/routes/learning-activities.ts` with upsert logic |
| Frontend route | ✅ | `/practice` in App.tsx |
| Sidebar nav | ✅ | Brain icon between Assessment and Pustaka Saya |
| Practice page | ✅ | Recommendations + activity history (247 lines) |
| Codegen | ✅ | `useListLearningActivities`, `useCreateLearningActivity`, `useGetPracticeRecommendations` |

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
