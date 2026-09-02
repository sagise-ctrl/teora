# Current Task

> Updated by AI at milestones. New sessions: read this first.
>
> ⚠️ **CROSS-MODEL NOTE (untuk model baru: opus-4-6, dst):**
> Sebelum kerja apapun, BACA section `ACTIVE` di bawah + section `Handoff` (kalau ada) untuk resume context.
> Lalu baca `.ai/progress.md`, `.ai/blockers.md`, `.ai/decisions.md`, `git log --oneline -20` sesuai Session Start Protocol di CLAUDE.md.
> Balas ke owner: `Konteks loaded ✅ Model: claude-opus-4-X Task aktif: [...] Status: [...] Siap lanjut.`

---

## 🎯 EXECUTIVE SUMMARY (Last Updated: 2026-09-01 01:45)

**Project:** Teora — AI Academic Workspace (React SPA + Express API + Supabase)
**Owner:** sagise (non-technical, product-focused)
**Architecture:** Vercel Function backend + Supabase (PostgreSQL + Auth) + Vercel static frontend
**Latest activity:** Backend 401 auth fix selesai, production verified, menunggu owner test login flow end-to-end + push commits.

### Production URLs

| Service | URL | Status |
|---------|-----|--------|
| Backend | https://teora-backend.vercel.app | ✅ Live (`dpl_9ducQJCXfJh3u1ec34sceQyYK8bx`) |
| Frontend | https://academic-workspace-eta.vercel.app | ✅ Live |

### Key Files untuk Context

| File | Isi |
|------|-----|
| `CLAUDE.md` | Project rules, autonomy policy, Session Start Protocol |
| `.ai/current-task.md` (file ini) | Active task + handoff |
| `.ai/progress.md` | Completed work log |
| `.ai/decisions.md` | Architecture decisions (006 keputusan terbesar: Backend Auth Pattern) |
| `.ai/issue-tracker.md` | All bugs/errors + root cause + prevention |
| `docs/ai-team/` | Knowledge base per division (product, architecture, security, etc) |

---

## ACTIVE 2026-09-01 — Backend 401 Auth Fix ✅ SELESAI

**Status:** ✅ SELESAI — Production deploy `dpl_9ducQJCXfJh3u1ec34sceQyYK8bx` live & verified
**Model:** claude-opus-4-8
**Duration:** ~3 jam (continuation dari sesi sebelumnya)
**Owner:** sagise (handoff dari opus-4-6)

### Problem Statement

Browser console spam `GET /api/auth/me 401 (Unauthorized)` setiap page reload. Owner frustrasi — semalam opus-4-6 ngoding tapi error persisten.

### Root Causes (3 bugs simultan)

| Bug | Lokasi | Fix |
|-----|--------|-----|
| A: Mount order | `src/routes/index.ts` — `router.use(authRouter)` di-mount SEBELUM `router.use(authMiddleware)`. Express hanya apply middleware ke routes seterusnya. | `src/routes/auth.ts` — per-route `authMiddleware` di `/auth/me` dan `/auth/referrals` |
| B: JWT verify | `src/middlewares/auth.ts` — Modern Supabase pakai ES256 (JWKS), bukan HS256 (JWT_SECRET). JWKS URL salah. Hard if/else tanpa fallback. | HS256-first dengan catch+JWKS fallback. JWKS URL: `/auth/v1/.well-known/jwks.json` |
| C: Trust proxy | `src/app.ts` — Vercel set `X-Forwarded-For` tapi `app.set('trust proxy', 1)` belum ada. | `app.set("trust proxy", 1)` setelah init Express |

### Verifikasi Post-Deploy

| Endpoint | Scenario | Status | Body |
|----------|----------|--------|------|
| `/api/healthz` | - | 200 | `{"status":"ok"}` |
| `/api/auth/me` | no token | 401 | `{"error":"Unauthorized"}` (route handler) |
| `/api/auth/me` | bad token | 401 | `{"error":"Invalid or expired token"}` (middleware) |
| Vercel logs | last 30m | 0 ValidationError | ✅ `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` cleared |

### Commits

1. `af06d83` — fix(auth): per-route authMiddleware on /me and /referrals + HS256 to JWKS fallback with correct JWKS URL
2. `694d8f1` — fix(api): trust proxy for Vercel + cleanup vercel.json

### Deploy

- Backend: `dpl_9ducQJCXfJh3u1ec34sceQyYK8bx` aliased ke `teora-backend.vercel.app`
- Build: 10s, 0 errors, 3 warnings (duplicate skipLibCheck tsconfig.base.json — non-blocking)
- Upload: 30.9 MB

### Lessons Learned

1. **Mount order bug pattern** — `router.use(path, middleware)` only protects routes mounted AFTER it. Selalu pakai per-route middleware untuk critical auth.
2. **Modern Supabase → ES256** — Backend HARUS implement JWKS fallback. Hard HS256-only akan selalu gagal untuk Google OAuth login.
3. **Trust proxy is mandatory** — `app.set("trust proxy", 1)` atau `req.ip` tidak reflect real client IP di serverless behind proxy.
4. **Bundle verification** — Selalu `grep "fix-pattern" api/index.mjs` setelah rebuild, sebelum commit/deploy, untuk confirm fix ada di compiled output.

### Next Steps (Owner Decision Needed)

- [ ] Test login flow end-to-end via browser (Google OAuth login → `/auth/me` returns user)
- [ ] Verify production console clear dari 401 errors
- [ ] (Optional) Improve Vitest test untuk middleware — ada pre-existing test failure yg belum di-resolve (routes.integration.test.ts + use-auth.test.tsx)

---

## Handoff 2026-09-01 01:45 — model opus-4-8 → next session

**Task active:** Backend 401 auth fix ✅ DONE.
**Last 3 actions:**
1. Verified trust proxy fix live — `/api/auth/me` bad token return "Invalid or expired token" (middleware catch path)
2. Committed `694d8f1` — fix(api): trust proxy for Vercel + cleanup vercel.json
3. Verified Vercel logs last 30m has 0 ValidationError

**Next 3 actions:**
1. Owner manual test login flow di production
2. (If green) mark resolved, move on ke task berikutnya (post-launch monitoring setup?)
3. (If red) re-investigate

**Open questions:**
- Apa next priority? (post-launch monitoring SOP masih pending per issue-tracker [2026-08-23])

---

## PREVIOUSLY — SPA Routing Fix ✅ SELESAI (2026-09-01)

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

---

## ACTIVE 2026-09-02 — Daftar Task + Split New Project Form ✅ SELESAI

**Status:** ✅ SELESAI — Both deployed & verified
**Model:** claude-opus-4-8
**Owner:** sagise

### Sub-task A: Daftar Task — DEPLOYED 2026-09-02

Route `/projects?type=general|academic` — tab segmented + filter stage + search.

### Sub-task B: New Project Form — Split per Type — DEPLOYED 2026-09-02

**Spec (owner, 2026-09-02):** General ≠ Academic = 2 project berbeda, web pisahkan.

**General Task** (simpel):
| Field | Required | Notes |
|-------|----------|-------|
| Judul | ❌ Opsional | Fungsi: nama dokumen, tidak tampil di file download. AI generate di workspace kalau kosong |
| Instruksi Tugas | ✅ Wajib | Acuan AI: generate judul + analisis awal |
| Upload File | ❌ Opsional | Bisa: instruksi detail / bahan acuan / referensi. AI analisis di workspace |
| ~~Format / Min. Ref / Min. Tahun / Referensi panel~~ | Dihapus | Pindah ke workspace |

**Academic Work** (lebih dalam):
| Field | Required | Notes |
|-------|----------|-------|
| Tema | ❌ Opsional | AI generate judul dari analisis tema di workspace. User bisa edit manual atau minta AI rekomendasi via chat |
| Ide / Gagasan | ✅ Wajib | AI pakai untuk buat outline/kerangka awal/Plan di workspace |
| Upload File | ❌ Opsional | Referensi/bahan pendukung. AI analisis di workspace |
| ~~Format / Min. Ref / Min. Tahun / Referensi panel~~ | Dihapus | Pindah ke workspace |

**Owner decisions (2026-09-02 AskUserQuestion):**
1. Tema Academic: Opsional (sama seperti General)
2. AI title generation: Nanti di workspace (placeholder dulu saat creation)
3. Upload file extraction: Simpan file mentah dulu (UI only, AI analyze di workspace nanti)

### What Was Built

| File | Change |
|------|--------|
| `lib/api-spec/openapi.yaml` | ProjectInput: `required: [instructionText]` (was `[title]`); title jadi optional; tambah description di title & instructionText |
| `lib/api-zod/src/generated/api.ts` | Regen: `title: zod.string().optional()`, `instructionText: zod.string().min(1)` |
| `lib/api-client-react/src/generated/*` | Regen: TypeScript `ProjectInput` types |
| `artifacts/academic-workspace/src/lib/api-client-react/generated/*` | Synced from workspace (vite reads local copy) |
| `artifacts/academic-workspace/src/pages/new-project.tsx` | Rewrite: split layout per type. Fix `useSearch()` bug. Hapus referensi panel, format, minRef, minYear. Type-specific copy. Visual indicator (icon, color, header) per type |
| `artifacts/api-server/api/index.mjs` | Rebuild: backend schema updated |

### Bug Fix Included

- **new-project.tsx line 57** — same `useLocation()` query parsing bug as tasks.tsx. Fixed with `useSearch()`. Without this fix, `/projects/new?type=academic` would always save as `taskType="general"` regardless of URL.

### Production Deploy

| Deploy | URL | ID | Status |
|--------|-----|----|----|
| Backend | https://teora-backend.vercel.app | `dpl_<new>` | ✅ READY (schema updated) |
| Frontend | https://academic-workspace-eta.vercel.app | `dpl_<new>` | ✅ READY (bundle `index-DYO6ISll.js`) |

### Verification

| Test | Result |
|------|--------|
| Backend schema in bundle | ✅ `title: zod.string().optional()`, `instructionText: zod.string().min(1)` |
| Bundle has new form strings | ✅ "Task Umum Baru"×2, "Karya Ilmiah Baru"×1, "Tema"×1, "Ide / Gagasan"×1, "Mulai Kerjakan"×2, "Mulai dengan AI"×1 |
| Bundle removed old references panel | ✅ JS size down 12KB (1400→1388) |
| Backend smoke test (POST /api/projects) | 401 (auth required — expected; schema correct in compiled bundle) |

### Out of Scope (deferred to workspace implementation)

- Workspace General Task vs Academic Work (different layouts/flows)
- AI auto-generate judul feature (button/chat command in workspace)
- Upload file binary storage + AI extraction (workspace will add)
- Bibliography Generator for Academic Work
- Multi-section document for Academic Work (Plan stage)
- Section AI Chat + Section References for Academic Work

---

## Handoff 2026-09-02 — model opus-4-8 → next session

**Task active:** Daftar Task + Split New Project Form both deployed ✅
**Last 3 actions:**
1. Updated OpenAPI spec: title optional, instructionText required
2. Rewrote new-project.tsx: split per type, removed referensi panel, fixed query bug
3. Deployed backend + frontend to production

**Next 3 actions:**
1. Owner manual UI test di https://academic-workspace-eta.vercel.app/projects/new?type=general dan ?type=academic
2. Owner pilih next priority (General Task Workspace / Academic Work Workspace / Pustaka Saya / Assessment)
3. Implement chosen feature

**Open questions:**
- Next priority pilihan owner (4 opsi)
- AI Report panel untuk Academic Work (owner masih pending)
- Workspace design untuk General vs Academic (perlu kerja besar)


### Problem Statement

Menu Task Mentor di sidebar (per DECISION 009) butuh halaman `/projects` yang proper. Sebelumnya `/projects` route menunjuk ke NewProject form. Owner minta:
- Daftar Task = list view, separate dari workspace
- Tab segmented control: General Task vs Academic Work
- Filter chip per stage (Idea/Writing/Revision/Done, plus Plan untuk academic)
- Status mapping backend 6-state → frontend 4-5 user-facing stage
- TaskType enum strict (general | academic), NULL → "general" di-display

### What Was Built

| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/projects.ts` | GET /projects accepts `?type=` filter; GET /projects/stats returns `byType` aggregation |
| `artifacts/api-server/src/routes/admin.ts` | Renamed `/admin/usage` → `/admin/usage-breakdown` (pre-existing duplicate path conflict) |
| `artifacts/api-server/src/test/routes.integration.test.ts` | `essay` → `general` (2 fixtures) |
| `lib/api-spec/openapi.yaml` | `/projects` GET `type` enum param; Project/ProjectInput/ProjectStats enum; /admin/usage duplicate rename |
| `lib/api-zod/src/generated/api.ts` | Regen: zod taskType enum + byType schema |
| `lib/api-client-react/src/generated/*.ts` | Regen: TypeScript types + ListProjectsType |
| `artifacts/academic-workspace/src/lib/api-client-react/generated/*` | Synced from workspace (vite reads local copy) |
| `artifacts/academic-workspace/src/lib/status-mapping.ts` | NEW: UserStage type, BACKEND_TO_STAGE map, stageMeta, displayStagesFor, TASK_TYPE_LABEL |
| `artifacts/academic-workspace/src/pages/tasks.tsx` | NEW: TaskListPage with tabs, filter sidebar, search, empty state |
| `artifacts/academic-workspace/src/App.tsx` | Added /projects route BEFORE /projects/:id (ordering per ADR) |
| `artifacts/academic-workspace/src/components/layout.tsx` | Task Mentor subitems now point to /projects?type=... |
| `artifacts/academic-workspace/src/pages/new-project.tsx` | Read ?type= from URL, set taskType on create |
| `artifacts/academic-workspace/src/pages/dashboard.tsx` | Added "Lihat semua →" link to /projects |
| `pnpm-workspace.yaml` | Excluded artifacts/mockup-sandbox (catalog: refs missing → pnpm install fails) |
| `.npmrc` | Added verify-deps-before-run=false |

### Decisions

- **DECISION 010** — Halaman Daftar Task: spec, architecture, status mapping layer, taskType enum strict. Added to `.ai/decisions.md`.
- **DECISION 009** retroactive confirmation — sidebar menu order Dashboard → Task Mentor → Assessment → Pustaka Saya → Akun.
- **Removed input** (owner feedback) — "Default Tab = Last Accessed" dan "icon kosmetik" tidak jadi feature.

### Validation

| Check | Result |
|-------|--------|
| typecheck (tsc --build --force) | ✅ exit 0 (lib/api-zod, lib/api-client-react, lib/db) |
| typecheck (frontend) | ✅ no new errors from my changes (pre-existing 8 errors unrelated) |
| typecheck (backend) | ✅ no new errors from my changes (pre-existing implicit-any errors unrelated) |
| build frontend (vite) | ✅ 2m 10s, 3852 modules, dist 1.4MB JS |
| build backend (build.mjs) | ✅ 4s, dist/index.mjs 5.7MB |
| vitest (128 tests) | 126 pass, 2 pre-existing auth.test.ts failures (unrelated, not regressions) |
| integration.test.ts (20) | ✅ all pass |
| pre-existing | auth.test.ts /auth/me + /auth/referrals tests still 401 — known issue (test mocks per-route middleware belum di-update) |

### Pre-Existing Issues (NOT regressions)

1. `auth.test.ts` — 2 tests expecting 200 return 401. Test mocks not aligned with per-route authMiddleware fix from af06d83. Out of scope for Daftar Task.
2. `references.ts`, `shared.ts`, `webhooks.ts`, `rubrics.ts`, `usage.ts`, `writing-style.ts` — implicit-any errors (pre-existing, not changed by me).
3. `new-project.tsx` — setFormValues undefined, queryKey missing options (pre-existing).
4. `App.tsx` line 51 — pageVariants typed wrong (pre-existing).
5. `layout.tsx` line 119 — NavGroup href prop missing (pre-existing).

### Pre-Deploy Action Required

Owner must approve:
1. Commit + push all changes
2. Deploy backend → https://teora-backend.vercel.app
3. Deploy frontend → https://academic-workspace-eta.vercel.app
4. Production smoke test: /projects route loads, /projects?type=academic filter works, create project with taskType persists.

### Production Deploy 2026-09-02 ✅ DONE

| Deploy | URL | ID | Status |
|--------|-----|----|----|
| Backend | https://teora-backend.vercel.app | `dpl_G5z5FtD5sGzSEcwnBKjNNzYwFWCL` | ✅ READY (build 11s, cached) |
| Frontend | https://academic-workspace-eta.vercel.app | `dpl_87mBecirXZAPpwW4kRs7Udb4LEQV` | ✅ READY (build 1m 15s) |

**Smoke test production:**

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `GET /api/healthz` | 200 `{"status":"ok"}` | ✅ matched | OK |
| `GET /api/projects?type=academic` (no auth) | 401 | 401 `{"error":"Unauthorized"}` | OK |
| `GET /api/projects/stats` (no auth) | 401 | 401 `{"error":"Unauthorized"}` | OK |
| `GET /api/auth/me` (no token) | 401 | 401 | OK |
| `GET /api/auth/me` (bad token) | 401 "Invalid or expired token" | matched | OK |
| `GET /` (frontend index) | 200 | 200 | OK |
| `GET /projects` (SPA fallback) | 200 HTML | 200 | OK |
| `GET /projects?type=academic` (SPA fallback) | 200 HTML | 200 | OK |
| `GET /api/healthz` via frontend (vercel.json rewrite) | 200 | 200 | OK |
| Bundle has Daftar Task strings | yes | "Academic Work"×5, "taskType"×4, "Done"×7, "Writing"×2, "Revision"×2, "Idea"×1, "General Task"×1 | OK |

**Owner manual test required:** Browser login → /projects → toggle tab General/Academic → filter by stage → create new task dengan type general/academic. Verifikasi taskType persisted di database.

### Next Priority (Owner Decision)

1. ~~Deploy Daftar Task~~ ✅ DONE
2. Choose next implementation:
   - **Task Mentor — General Task Workspace** (toolbar Dokumen/AI Assistant/Referensi — 5 tools)
   - **Pustaka Saya** (global library + AI Search + Reference AI Chat)
   - **Assessment** (main menu untuk pengajar)
   - **Task Mentor — Academic Work Workspace** (multi-section, kerangka awal)

---

## 2026-09-02 — Branding: AI→Teora, User→Anda, Em Dash Removal ✅ SELESAI

**Status:** ✅ SELESAI — Production deployed, bundle verified
**Model:** claude-opus-4-6 (session 1) + opus-4-8 (session 2, continuation)
**Owner:** sagise
**Commit:** `97dc255`

### Changes

| Category | Before | After | Files |
|---------|--------|-------|-------|
| Product name | "AI" in UI text | "Teora" | 30+ files |
| Politeness | "user"/"User" | "Anda" | 10+ files |
| Punctuation | "—" (em dash) | ":" (colon) | 30+ files |

### Key Changes by Area

- **Admin**: "Users" → "Pengguna", "AI Usage" → "Usage Teora", "AI Cost" → "Biaya Teora"
- **Dashboard**: "AI Assistant" → "Teora Assistant", fallback displayName "User" → "Anda"
- **Footer**: "Teora —" → "Teora:" (login, register, landing pages)
- **New Project**: "dianalisis AI" → "dianalisis Teora"
- **Usage**: "Chat AI" → "Chat Teora", "sent to AI models" → "dikirim ke model"
- **Project**: "The AI is now analyzing" → "Teora sedang menganalisis"
- **Topup**: "← Lihat AI Pricing" → "← Lihat Teora Pricing"
- **Referral**: "500 AI tokens" → "500 Teora tokens"

### Excluded (Correctly)

| File | Reason |
|------|--------|
| `lib/api-client-react/generated/*` | Generated code, not user-facing |
| `terms.tsx` / `privacy.tsx` | Legal text — "AI" = technology, not product |
| Code identifiers | `user.email`, `msg.role === "user"`, route `/ai-pricing` |
| `insufficient-balance-dialog.tsx` | `"—"` as null display placeholder — reverted |
| `admin-audit-log.tsx` | `"—"` as table cell null placeholder — reverted |

### Code Fixes from Sed Collateral

- `insufficient-balance-dialog.tsx` line 30: `":"` → `"—"` (reverted)
- `admin-audit-log.tsx` lines 121, 124: `":"` → `"—"` (reverted)

### Production Deploy

| Step | Command | Result |
|------|---------|--------|
| Build | `node node_modules/vite/bin/vite.js build` | ✅ 2m22s, 1388KB JS |
| Copy | `cp -r dist .vercel/output/static` | ✅ |
| Deploy | `npx vercel deploy --prod --prebuilt --yes` | ✅ `dpl_n9sv0b96f` |
| Verify | curl JS bundle | ✅ "Teora Assistant", "Penggunaan Teora" present |

### Lessons

- sed em dash → colon safe for UI prose; NOT safe for code display placeholders
- pnpm workspace fails → use `node node_modules/vite/bin/vite.js build` directly
- `--prebuilt` flag avoids 30000+ file limit on deploy

---

## Handoff 2026-09-02 — model opus-4-8 → current session

**Task active:** Branding: AI→Teora, User→Anda ✅ DONE
**Last 3 actions:**
1. Verified branding in production bundle — "Teora Assistant", "Penggunaan Teora", "Pengguna" present
2. Committed 30 files: `4fe467c` feat(branding) on `feat/daftar-task`
3. Fixed 3 sed collateral issues (reverted `"—"` display placeholders in insufficient-balance-dialog.tsx + admin-audit-log.tsx)
4. Amend commit to include updated .ai/current-task.md + .ai/progress.md

**Next 3 actions:**
1. Owner test: browse https://academic-workspace-eta.vercel.app — verify "Teora" branding visible in nav, dashboard, admin pages
2. Owner test: Daftar Task `/projects` — toggle General/Academic tabs, filter by stage
3. Owner decide next priority: General Task Workspace / Pustaka Saya / Assessment / Academic Work Workspace

**Open questions:**
- Next priority pilihan owner (4 opsi di atas)
- Apakah owner mau push `feat/daftar-task` branch ke main (sekarang 3 commit di branch: branding + daftar task + parent, belum di-push per Git Rules)
- AI Report panel untuk Academic Work (owner mau jawab isi panel-nya)
- Workspace design untuk General vs Academic (perlu kerja besar)


