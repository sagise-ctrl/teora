# Current Task

> Updated by AI at milestones. New sessions: read this first.
>
> ⚠️ **CROSS-MODEL NOTE (untuk model baru: opus-4-6, dst):**
> Sebelum kerja apapun, BACA section `ACTIVE` di bawah + section `Handoff` (kalau ada) untuk resume context.
> Lalu baca `.ai/progress.md`, `.ai/blockers.md`, `.ai/decisions.md`, `git log --oneline -20` sesuai Session Start Protocol di CLAUDE.md.
> Balas ke owner: `Konteks loaded ✅ Model: claude-opus-4-X Task aktif: [...] Status: [...] Siap lanjut.`

---

## 🎯 ACTIVE 2026-09-13 — Project-Wide Code Audit (opus-4-8)

**Status:** 🔄 IN PROGRESS — 22/27 fixed
**Pushed to origin/main:** `d80a7ca..37df517` (19 commits) ✅
**In Progress:** M9 (DOCX streaming — library limit), C1, C2 (needs owner)

### Audit Findings — Status Tracker

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| H1 | HIGH | Race condition autofallback balance | ✅ FIXED |
| H2 | HIGH | No context window truncation (ERR-017) | ✅ FIXED |
| H3 | HIGH | `max_tokens: 4096` hardcoded | ✅ FIXED |
| H4 | HIGH | rawBody unreliable for HMAC webhook | ✅ FIXED (commit c946a38) |
| H5 | HIGH | `/api/ai-tiers` publicly accessible | ✅ FIXED (commit c97fa51) |
| H6 | HIGH | Usage page mock data | ✅ FIXED (commit c639e1d) |
| H7 | HIGH | Landing page invisible text flash | ✅ FIXED (commit 0030873) |
| H8 | HIGH | `z.date()` rejects string query params | ✅ FIXED (commit 2a646a5) |
| M1 | MEDIUM | `usage` used before assignment in references.ts | ✅ FIXED |
| M2 | MEDIUM | User can request any tierId via API body (no authorization check) | ✅ FIXED (commit f00d1c5) |
| M3 | MEDIUM | Webhook HMAC verification missing (static header compare) | 🔲 |
| M4 | MEDIUM | No DB transactions in async pipelines | ✅ FIXED (commits 28eea05) |
| M5 | MEDIUM | Credit deducted even when AI parse fails | ✅ FIXED (commit 613ae79) |
| M6 | MEDIUM | No AI endpoint tests | 🔲 (agent) |
| M7 | MEDIUM | CrossRef/DOI no rate limiting | 🔲 (agent) |
| M8 | MEDIUM | Chat history grows indefinitely | 🔲 (agent) |
| M9 | MEDIUM | Export DOCX CPU-intensive on serverless | 🔲 (agent) |
| M10 | MEDIUM | Quiz submission doesn't call logActivity | ✅ FIXED (commit 1697afb) |
| L1 | LOW | `Math.random()` for share tokens (should use crypto.randomBytes) | ✅ FIXED (commit 6aa9ab4) |
| L2 | LOW | Inconsistent error logging (console.error vs req.log.error) | ✅ FIXED (commit 6aa9ab4) |
| L3 | LOW | Duplicate project fetch in runAnalysisPipeline | ✅ ALREADY FIXED (restructured) |
| L4 | LOW | `@supabase/supabase-js` in regular deps (should be devDeps) | ✅ FIXED (commit 6aa9ab4) |
| L5 | LOW | React version mismatch between workspaces | ✅ FIXED (commit 6aa9ab4) |
| L6 | LOW | Email case sensitivity in admin ownership check | ✅ ALREADY FIXED (toLowerCase present) |
| C1 | CRITICAL | `supabase-admin.ts` throws at module level (server crash on missing env) | 🔲 (needs owner) |
| C2 | CRITICAL | No file size limit on uploads (attachments.ts, OOM risk) | 🔲 |

### Next Actions
1. ~~Fix H1-H8~~ ✅ DONE
2. ~~Fix M1-M2, M4-M5, M10~~ ✅ DONE
3. ~~Fix L1-L6~~ ✅ DONE (L3, L6 already fixed)
4. ~~Fix M3~~ ✅ DONE (commit 368eb67, timing-safe)
5. ~~Fix M6-M8~~ ✅ DONE (tests, rate limit, chat cap)
6. Verify live: visit https://academic-workspace-eta.vercel.app (landing dark mode + all fixes)
7. M9: DOCX streaming — investigate library support or skip with limit
8. C1, C2: Configuration issues (needs owner decision)

### Blockers
- **C1 (needs owner):** `supabase-admin.ts` throws at module level. App crashes if `SUPABASE_SERVICE_ROLE_KEY` not set. Owner decision needed: fix with lazy initialization?
- **C2:** No file size limit on uploads. 10MB limit needed to prevent OOM. Owner decision: proceed with fix?

### Deployment SOP (CRITICAL — owner instruction 2026-09-13)
- **WAJIB**: Sebelum klaim "fix live", verifikasi `git log origin/main..main --oneline` kosong ATAU commit fix ada di `origin/main`
- Setelah batch fix selesai, default behavior: Tanya owner apakah push sekarang
- Emergency production fix: push langsung + report, tunda confirmasi
- Detail: `~/.claude/projects/E--teora/memory/deployment-drift-local-vs-live-20260913.md`

---

## 🎯 ACTIVE 2026-09-12 — INC-004: ERR-017 Cherry-Pick + Fix (opus-4-X)

**Status:** ❌ NEEDS UPDATE — INCORRECTLY marked resolved. ERR-017 fix NOT on production.
**Model:** claude-opus-4-8
**Branch:** `fix/err-017-context-window-auto-truncate`
**Resolution Commit:** `e6ef53f` (fix) + `c38cb2c` (.ai/ memory)

### Apa yang terjadi

Owner: kerjakan ERR-017 cherry-pick dulu (dari feat/daftar-task ke main), sambil ingatkan SOP error handling — deploy/commit via GitHub sering bermasalah, owner lebih suka direct Vercel CLI untuk live deploy.

### Investigation (8-step SOP applied per Decision 005)

1. **SEARCH FIRST** — `.ai/error-index.md [ERR-017]` → context window exceeded, di-feat/daftar-task bel
2. **INVESTIGATE** — Cherry-pick `5838f1e` (feat/daftar-task → main); bundle built 6.8MB, grep verified 14 fix patterns + 41 tiktoken hits
3. **ROOT CAUSE (WRONG initially)** — INFERRED "esbuild bundles everything" → turned out NOT bundle WASM
4. **Deploy attempt** — `vercel deploy --prod --yes` → `dpl_3yDGUUTQ4EyFzgBiSrDsE8eMK8w3` READY
5. **VERIFY** — `curl /api/healthz` → **500 FUNCTION_INVOCATION_FAILED**
6. **Vercel logs** — `Error: Missing tiktoken_bg.wasm at tiktoken/tiktoken.cjs`
7. **ROLLBACK** — `vercel rollback` → `dpl_HsMepdHAbi1LUGVw3pujeEdsjyMy` restored (~3 min downtime)
8. **Real root cause (CONFIRMED)** — `tiktoken@1.0.22` uses WASM; esbuild bundles JS only, NOT .wasm; Vercel doesn't auto-include WASM

### Resolution

- **Option A applied:** Refactor `tokenizer.ts` → remove tiktoken → use `estimateTokensFromChars` heuristic (CHARS_PER_TOKEN=3)
- **Reverted** `package.json` + `pnpm-lock.yaml` (tiktoken removed)
- **Committed** `e6ef53f` on `fix/err-017-context-window-auto-truncate`
- **Local smoke test** — `node -e "import('./dist/index.mjs')"` → no WASM error
- **Deployed** → `dpl_7TTs2gRwb8jsh5HQPTS5aDosPySk`
- **Production verified** — `curl https://teora-backend.vercel.app/api/healthz` → **200 OK** `{"status":"ok"}` ✅
- **Bundle verified** — 0 tiktoken refs in `dist/index.mjs`, 6 fix-pattern matches

### Owner Reminder (validated)

Owner preferensi: live deploy HARUS via direct Vercel CLI (`vercel deploy --prod --yes`), BUKAN GitHub merge/CI. Workflow ini tetap dipakai.

### New Pattern — ERR-019 (1x tracked, eligible for 3x promotion)

`native_dependency_not_bundleable` — class baru di layer runtime asset (sibling ERR-012 di lockfile layer). Includes:
- `@dqbd/tiktoken` (WASM)
- `onnxruntime-node`, `bcrypt`, `better-sqlite3` (.node binary)
- `sharp` (native image)

### Files Changed

- `artifacts/api-server/src/lib/tokenizer.ts` (NEW — char-based heuristic, no tiktoken)
- `artifacts/api-server/src/lib/ai.ts` (new `truncateToTokenLimit(text, maxTokens)`)
- `artifacts/api-server/src/routes/messages.ts` (token-aware + 413)
- `artifacts/api-server/src/routes/references.ts` (413 for auto-cite)
- `package.json` — tiktoken NOT added (correct final state)
- `pnpm-lock.yaml` — tiktoken NOT in lockfile
- `.ai/incidents/incident-registry.md` — INC-004 status update (committed c38cb2c)
- `.ai/lessons-learned.md` — appended [ERR-019] entry (committed c38cb2c)
- `.ai/incidents/20260912-001.md` — full INC-004 post-mortem (untracked, .ai/ gitignored)
- `.ai/error-index.md` — ERR-017 FIXED→VERIFIED, added ERR-019 (untracked, .ai/ gitignored)

### Prevention Going Forward (SOP Step 7)

- [x] Local smoke test before deploy: `cd artifacts/api-server && node -e "import('./dist/index.mjs')"`
- [x] Vercel logs inspection 5 min post-deploy
- [x] `curl /api/healthz` immediately post-deploy
- [x] Deploy checklist updated in `.ai/lessons-learned.md [ERR-019]`
- [x] Pattern `native_dependency_not_bundleable` tracked in `.ai/error-index.md` (1x → 3x for skill promotion)

### Lessons (FIX ≠ VERIFIED hard rule confirmed)

> **Build succeeded ≠ runtime will work** untuk dep dengan non-JS bindings (WASM, .node, native addons). SELALU runtime smoke test sebelum deploy production.

### Decision on Decision 005 SOP

Step 6 (VERIFY) di-deploy-error-protocol sekarang WAJIB include:
(a) `node -e "import('./dist/index.mjs')"` smoke test OR `vercel dev` start,
(b) `curl /api/healthz` post-deploy,
(c) inspect Vercel runtime logs selama 5 menit.

Untuk deps tanpa native assets — bundle grep cukup (existing behavior).

### Next Tasks (per user: "lanjut ... dan yg lainnya")

1. **#2** — Fix em dash violations di `simulasi-*.tsx` files (3 user-facing violations, P3 per memory `frontend-no-em-dash-preference-20260904`)
2. **#3** — Cherry-pick `51708f9` (dark mode toggle) ke main
3. **#4** — Decision: feat/daftar-task merge strategy (merge penuh vs cherry-pick per-fitur)
4. **#5** — Discussion: feat/tier-2-complete payment gateway stub (`b0b5c8a`) → Midtrans integration foundation?

---

## HANDOVER 2026-09-12 — model opus-4-8 → opus-4-X

**INC-004 RESOLVED ✅ — production verified 200 OK.**

**Last 3 actions:**
1. Cherry-pick `5838f1e` (ERR-017) → main tried first → Vercel 500 → rollback (3 min)
2. Diagnosed real root cause: tiktoken WASM not bundleable (new pattern ERR-019)
3. Refactor `tokenizer.ts` → char-based heuristic → commit `e6ef53f` → deploy `dpl_7TTs2gRwb8jsh5HQPTS5aDosPySk` → curl 200 OK ✅

**Next 3 actions:**
1. Continue with #2 — em dash fix in simulasi-*.tsx (user explicitly authorized "dan yg lainnya")
2. Continue with #3 — cherry-pick dark mode toggle
3. Continue with #4+#5 — feat/daftar-task merge decision + payment gateway discussion

**Open questions:**
1. Merge feat/daftar-task ke main atau per-fitur cherry-pick? 54 commits di feat/daftar-task NOT in main.
2. Midtrans / Xendit / Stripe untuk payment gateway?
3. Tier-2-complete (`b0b5c8a`) payment stub → foundation untuk Midtrans, atau re-design?

**Fix ≠ VERIFIED lesson:** Going forward — untuk deps dengan WASM/.node/native assets, ALWAYS runtime smoke test (`node -e "import('./dist/index.mjs')"`) BEFORE `vercel deploy --prod`. Build success ≠ runtime success untuk deps dengan non-JS bindings.

---

## ACTIVE 2026-09-10 — Landing Page Redesign (Maximal)

**Status:** ✅ DEPLOYED — production live, all verification passed
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task`
**Deploy:** `dpl_HThpx4xG5N8YtVffshtp1vr25UNM`
**URL:** https://academic-workspace-eta.vercel.app

### Research Phase
- [x] Analisa existing landing page
- [x] Design assets generated (landing-hero.svg, landing-bg-pattern.svg, design-spec.html)
- [ ] Competitor landing page research (Notion, Duolingo, Canva, Indonesian ed-tech)
- [ ] Define unique Teora positioning for landing

### Design Assets
- [x] `public/landing-hero.svg` — Hero illustration (orang belajar + AI)
- [x] `public/landing-bg-pattern.svg` — Hexagonal background pattern
- [x] `public/design-spec.html` — Design system specification
- [ ] Testimonial avatar SVGs

### Session 2026-09-10 (Morning)
- [x] Landing redesign deployed — production ✅
- [x] Fix defensive language per owner feedback (6 kalimat, commit 6b6a636)
- [x] Teora landasan dasar explanation (synthesized from project-context + Decision 017)
- [x] Build logs analysed — ERR-013 root cause confirmed (pnpm@6 + Node 24 + ERR_INVALID_THIS)
- [x] Backend health check — live ✅ (teora-backend.vercel.app 401 expected)
- [ ] Push authorization pending (owner approval needed)
- [ ] Product mockup/feature screenshots
- [ ] Logo trust strip SVG

### Implementation Plan (Landing Page Sections)
1. [x] Navbar (sticky, transparent → solid on scroll)
2. [x] Hero section (illustration + headline + CTA + badge)
3. [x] Social proof strip (stats: user count, rating, etc.)
4. [x] Problem section (3 pain points)
5. [x] Features showcase (visual cards with icons + descriptions)
6. [x] How it works (3 steps with illustration)
7. [x] Testimonials (3 cards)
8. [x] Pricing overview (2 tiers)
9. [x] Final CTA (email capture atau button)
10. [x] Footer (links, copyright)

### Component Changes
- `src/pages/landing.tsx` — Full redesign
- `src/components/brand/` — Additional SVG assets

### Verification
- [x] Local build (`pnpm run build`) — 41s, 1.5MB gzip 429kB
- [x] Production bundle em dash audit — 0 em dash (verified in production)
- [x] Production routes — / /login /register /dashboard all 200
- [x] API healthz via rewrites — 200
- [x] Screenshot — owner can open https://academic-workspace-eta.vercel.app
- [ ] Push to remote (per Git Rules, owner instruction needed)

### Resume When Needed
1. Start from full landing.tsx implementation
2. Reference design-spec.html for design tokens
3. Use landing-hero.svg in hero section
4. Use landing-bg-pattern.svg as background

### Reference Pages (read-only, inspiration only)
- `src/pages/login.tsx` — Auth UI patterns
- `src/components/layout.tsx` — Component patterns
- `src/components/ui/` — Design system components

### Audit Result

Sistem sudah ada fondasinya (.ai/issue-tracker.md, .ai/lessons-learned.md, .ai/incidents/, .claude/skills/incident-response.md). GAP utama:
- Error index (multi-signal retrieval) — BELUM ADA
- Error handling protocol (behavioral SOP) — BELUM ADA
- Prevention guidelines — BELUM ADA
- FIX ≠ VERIFIED rule — BELUM ADA
- Confidence labeling — BELUM ADA

### Proposed Files (7 items)

| # | File | Action |
|---|------|--------|
| 1 | `.ai/error-index.md` | CREATE |
| 2 | `.ai/guidelines/error-handling-protocol.md` | CREATE |
| 3 | `.ai/guidelines/prevention-guidelines.md` | CREATE |
| 4 | `CLAUDE.md` Session Start Protocol | MODIFY |
| 5 | `.claude/rules/teora-guardrails.md` | MODIFY |
| 6 | `.ai/lessons-learned.md` format | MODIFY |
| 7 | Migrate existing errors → error-index | PROCESS |

### Detail

Full audit report: `.ai/error-learning-system-audit-20260910.md`

### Resume Pagi

1. Baca `.ai/error-learning-system-audit-20260910.md` + `.ai/error-index.md` (jika sudah ada)
2. Buat 3 file baru (.ai/error-index.md, .ai/guidelines/error-handling-protocol.md, .ai/guidelines/prevention-guidelines.md)
3. Modify CLAUDE.md + teora-guardrails.md + lessons-learned.md
4. Migrate existing errors

---

## ACTIVE 2026-09-09 — Username Enhancement: Auto-Suggest + Rate Limit 1×/30 Days

**Status:** ✅ COMPLETE — all files implemented, typecheck + build pass
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`

### Keputusan Owner (FINALIZED 2026-09-09)
- Auto-suggest dari `displayName` saja (register page)
- Rate limit: rolling 30 hari (not calendar month)
- OAuth backfill: dihitung sebagai perubahan pertama (user tunggu 30 hari)

### Files Changed

| File | Change |
|------|--------|
| Supabase DB | `ALTER TABLE users ADD COLUMN username_changed_at TIMESTAMPTZ` |
| `lib/db/src/schema/users.ts` | Tambah `usernameChangedAt` field |
| `artifacts/api-server/src/routes/auth.ts` | Set `usernameChangedAt: new Date()` on register + COALESCE on OAuth login + safety-net loop |
| `artifacts/api-server/src/routes/profile.ts` | Rate limit check (30-day rolling) + set `usernameChangedAt` on update |
| `lib/api-spec/openapi.yaml` | Tambah `usernameChangedAt` ke `AuthUser`, `UserProfile`; 429 response ke `PATCH /users/me/profile` |
| `lib/api-spec/orval.config.ts` | Tambah target `frontend-api-client-react` untuk update artifacts/generated |
| `artifacts/academic-workspace/src/pages/register.tsx` | Auto-suggest dari `displayName` dengan "Gunakan" button |
| `artifacts/academic-workspace/src/pages/profile.tsx` | Username editing dengan countdown badge + Save/Cancel |
| `docs/ai-team/product/business-rules.md` | Tambah section Username Rules |

### ⚠️ Post-Launch Checklist (owner perlu cek manual saat launching)

> Owner: ini baru perlu perhatian saat production launch dengan user nyata. Saat ini belum ada user (kecuali owner untuk test), jadi aman di-skip dulu.

- [ ] **DB column `username_changed_at`** — verify semua user sudah punya nilai (migration applied via Supabase MCP). User lama (OAuth login sebelum fitur ini) sudah di-backfill via COALESCE di login route. Owner test account: login via OAuth → cek apakah usernameChangedAt ter-set.
- [ ] **Backend env vars** — pastikan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_*`, `REFERRAL_WEBHOOK_SECRET` ada di Vercel dashboard `teora-backend` project settings (env vars dari file lokal TIDAK otomatis ikut deployment).
- [ ] **Test flow** — login owner → /akun → cek badge "Boleh ganti" atau countdown → coba ganti username → verify usernameChangedAt ter-update di DB.

### Verification
- ✅ `pnpm run typecheck` — pass
- ✅ `pnpm run build` — pass (dist/index.mjs 6.5mb)
- ✅ Frontend bundle verified (all username strings present)
- ✅ Backend healthz: `{"status":"ok"}`
- ✅ Commit + push: `2d0bbf5`
- ⏸️ Post-launch manual checklist (lihat di atas)

### UX Summary
- **Register:** User isi displayName → suggestion chip muncul → klik "Gunakan" untuk auto-fill username
- **Profile:** Badge hijau "Boleh ganti" jika bisa, badge amber "X hari lagi" jika rate-limited; countdown update setiap detik
- **Profile edit:** Input field + availability check (500ms debounce) + Save/Cancel

---

## HANDOVER 2026-09-09 18:25 — opus-4-6 → opus-4-X

**Referral Program:** DEPLOYED ✅ `7faf379` — committed, NOT pushed.
- Backend `dpl_EwGjBFKydaTcDqz55Mde1vn6hfFv` → teora-backend.vercel.app ✅ READY
- Frontend `dpl_CTPG1JiK2afXW2gkqbimGsBebxmS` → academic-workspace-eta.vercel.app ✅ READY
- `/referral` page live with real API data ✅
- Bundle verified: referral strings in production ✅

**Pending:**
1. Owner: set `REFERRAL_WEBHOOK_SECRET` in Vercel dashboard (placeholder ok, webhook secure default = reject)
2. Owner: push `feat/daftar-task` → origin (`git push origin feat/daftar-task`)
3. Owner: pick payment gateway (Midtrans/Xendit/Stripe/Duitku) → build adapter
4. Pricing fee discussion: blended rate safety for topup (2-8% margin, risky if output-heavy)

**Next task:** Payment gateway integration (adapters ready, just need gateway pick).

---

## ACTIVE 2026-09-09 — Pricing Decision Opsi B + Schema Migration (opus-4-8)

**Status:** ✅ COMPLETE — migration applied, typecheck pass
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`

### Keputusan Owner

1. **Opsi B (pisah in/out di backend)** — APPROVED
   - Backend sudah support (`artifacts/api-server/src/lib/ai.ts:156-171` `estimateCost` pakai `pricePer1MInputCents/OutputCents`)
   - User-facing tetap blended ("X token"), backend tagih real cost + markup

2. **Markup topup 40%** — APPROVED
   - `tagih_per_1K = cost_real_per_1K × 1.40`
   - Margin neto = 27.9% (konstan untuk semua skenario)

### Dampak per Metode

| Metode | Opsi B Impact | Margin Worst Case |
|--------|---------------|-------------------|
| Langganan | Visibility only (FinOps dari `ai_usage_log`) | 8.9-32.1% (dilindungi buffer harga jual) |
| Topup | Full protection (tagih = cost × 1.40) | 27.9% flat |

### Schema Migration Applied

**Migration:** `add_markup_multiplier_to_ai_tiers`

```sql
ALTER TABLE public.ai_tiers
ADD COLUMN markup_multiplier NUMERIC(5, 3) NOT NULL DEFAULT 1.400;

ALTER TABLE public.ai_tiers
ADD CONSTRAINT chk_markup_multiplier_range
CHECK (markup_multiplier >= 1.000 AND markup_multiplier <= 9.999);
```

**Files changed:**
- `lib/db/src/schema/ai_tiers.ts` — tambah `markupMultiplier` field
- `docs/ai-team/finance/pricing-strategy-2026-anthropic.md` — section 14 + 15 + 16 (Opsi B decision, simulasi fee minimum, open decisions)

**Status:**
- ✅ Migration applied ke Supabase
- ✅ 4 existing rows backfilled dengan 1.400
- ✅ Typecheck pass
- ⏸️ Schema diff needs commit
- ⏸️ Existing rows masih pakai model lama (Llama/Claude 3.5 Sonnet/GPT-4o) — perlu di-update ke Haiku 4.5 + Sonnet 5 saat spec final (separate inisiatif)

---

## ACTIVE 2026-09-09 — Fee Calculation Discussion (opus-4-6)

**Status:** ⏸️ PAUSED — owner mau diskusi lanjut dengan opus-4-8
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task`

### Ringkasan Diskusi

Owner mau lihat skenario fee untuk subscription packages. Koreksi penting ditemukan:

1. **Midtrans fee** yang saya pakai (2.6% + Rp 5.500) SALAH. Fee resmi dari midtrans.com:
   - QRIS: **0.7% flat**
   - VA: **Rp 4.000 flat**
   - Credit Card: 2.9% + Rp 2.000
   - Sumber: https://midtrans.com/id/biaya

2. **AI cost calculation** — saya salah hitung (per window vs max total). Aturan quota:
   - 15 hari = 2× window 7 hari
   - 30 hari = 4× window 7 hari
   - AI cost = per7d quota × jumlah windows × blended rate

3. **Model cost** (dari pricing-strategy-2026-anthropic.md):
   - lama = Haiku 4.5 (Anthropic), bukan Groq
   - baru = Sonnet 5 (Anthropic)
   - campuran = Haiku + Sonnet mix
   - USD/IDR = Rp 16.000, rasio 65:35
   - Haiku blended: Rp 38.4/1K | Sonnet blended: Rp 76.8/1K

### OPEN QUESTION (untuk opus-4-8 lanjutkan)

**Topup fee + blended rate safety:**
- Subscription margin: 22-32% (QRIS 0.7%) ✅
- Topup margin: 2-8% (sangat tipis karena blended rate)
- **Risiko:** rasio input:output 65:35 — kalau user behavior output-heavy, margin bisa negatif
- Owner mau diskusi: apakah blended rate sudah aman? Apakah tracking per-token in/out sudah cukup?

### File Scratch

- `_calc_fees.js` — script Node.js untuk kalkulasi fee scenarios

---

## ACTIVE 2026-09-08 — Subscription Backend + Frontend Complete (opus-4-6)

**Status:** ✅ COMPLETE — Backend deployed + committed + pushed
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task` — committed `58b3082` (pushed)

### Summary (Session Resume dari opus-4-8)

Laptop mati saat setup backend subscription. Session ini dilanjutkan:

| # | Task | Status |
|---|------|--------|
| 1 | Fix TypeScript errors (boolean not imported) | ✅ Fixed in subscriptions.ts, usage_windows.ts |
| 2 | Typecheck + build | ✅ Pass (6.4MB bundle) |
| 3 | Verify DB tables (subscription_packages, subscriptions, usage_windows) | ✅ All exist + RLS added |
| 4 | Seed correct pricing (owner-approved: Starter Rp29k, Standar Rp59k, dst.) | ✅ Applied via Supabase MCP |
| 5 | Add RLS policies (auth.uid()::text = user_id pattern) | ✅ 7 policies created |
| 6 | Deploy backend | ✅ `teora-backend.vercel.app` |
| 7 | Verify /api/packages endpoint | ✅ Returns 30 SKUs with correct prices |
| 8 | Commit + push | ✅ `58b3082` |

### Production URLs

- `/subscribe` → https://academic-workspace-eta.vercel.app/subscribe
- `/usage` → https://academic-workspace-eta.vercel.app/usage
- `/api/packages` → https://teora-backend.vercel.app/api/packages (200, all 30 SKUs)
- `/api/healthz` → https://teora-backend.vercel.app/api/healthz (200)

### What's Done

**Backend subscription system:**
- `GET /api/packages` — 30 SKUs with owner-approved pricing ✅
- `GET /api/users/me/subscription` — active sub + usage windows
- `POST /api/users/me/subscription` — payment stub (402)
- `PUT /api/autofallback` — toggle autofallback
- `src/lib/subscription.ts` — rolling window quota logic (anchored T0, 5h/7d)
- DB: 3 tables + 7 RLS policies + correct pricing seeded

**Frontend cleanup:**
- `/ai-pricing` → DELETED
- `/langganan` → `/subscribe` (renamed)
- LowBalanceBanner → DELETED (no nag UX per owner)
- `/usage` → redesigned (subscription-centric)

### Remaining (Deferred)

1. **Payment gateway** — Midtrans or Stripe integration (waiting owner decision)
2. **Withdrawal/pencairan saldo** — 🗑️ Tidak ada fitur withdraw (owner 2026-09-08)
3. **OpenAPI codegen** — subscription endpoints not yet in openapi.yaml (routes exist but no spec)
4. **Frontend /subscribe page** — still uses hardcoded TIER data, should fetch from /api/packages
5. **Quota enforcement in AI routes** — checkQuotaAndAccumulate() not yet wired into actual AI endpoints (chat, quiz, etc.)

### Next

1. Wire /api/packages into frontend `/subscribe` page (fetch from API, not hardcoded)
2. Add subscription endpoints to OpenAPI spec + run codegen
3. Wire checkQuotaAndAccumulate() into AI routes (chat, quiz, rubric, references, etc.)
4. ToS checkbox UI (per owner spec from 2026-09-08)

### What (Owner Instructions 2026-09-08)

1. Hapus `/ai-pricing` (old Teora Pricing menu) — DONE
2. Rename `/langganan` → `/subscribe` — DONE
3. Redesain `/usage` page (subscription-centric):
   - Top: active package name + expiry date
   - Middle: 5h column + 7d column (sisa terpakai + percentage + reset time)
   - Below: actual saldo + daily usage
   - Bottom: daily history expandable — DONE

### Production URLs

- `/subscribe` → https://academic-workspace-eta.vercel.app/subscribe
- `/usage` → https://academic-workspace-eta.vercel.app/usage
- `/dashboard` → https://academic-workspace-eta.vercel.app/dashboard

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ai-pricing.tsx` | DELETED |
| `src/App.tsx` | Removed AIPricing; renamed `/langganan` → `/subscribe` |
| `src/components/layout.tsx` | Removed "Teora Pricing" nav; renamed label; removed `AlertCircle` |
| `src/pages/topup.tsx` | Fixed 2× `/ai-pricing` → `/subscribe` links |
| `src/pages/usage.tsx` | COMPLETELY REDESIGNED (subscription-focused, mock data) |
| `src/pages/low-balance-banner.tsx` | DELETED (prev session) |
| `src/lib/balance-thresholds.ts` | DELETED (prev session) |

### Deploy Pattern (Memorized)

```bash
cd artifacts/academic-workspace
# Temporarily set vercel.json to skip install (proxy issue):
# "installCommand": "echo skip", "buildCommand": "echo skip"
npx vercel build --prod
npx vercel deploy --prod --yes --prebuilt
# Restore vercel.json after
```

### Next

- Owner review on live URL → feedback
- Commit changes to `feat/daftar-task`
- Withdraw saldo mechanism — 🗑️ Tidak ada (owner 2026-09-08)
- Backend subscription logic (deferred)

---

## HISTORICAL 2026-09-08 — Initial Pricing Page Display (opus-4-8)

**Status:** ✅ COMPLETE
**Branch:** `feat/daftar-task`
**URL:** https://academic-workspace-eta.vercel.app/langganan

Owner: tampilkan pricing display untuk verifikasi. Backend deferred.

**Anchored Rolling Window:** 5h cap = 1/10 × 7d cap, window anchored to first-use timestamp. 15-day = 2×7d windows, 30-day = 4×7d windows.

**30 SKU matrix:** 5 tiers × 3 model modes × 2 periods. Pricing: Starter Rp29rb/Rp49rb, Standar Rp59rb/Rp99rb, Premium Rp99rb/Rp165rb, Pro Rp149rb/Rp249rb, Ultra Rp229rb/Rp389rb.

---

## HISTORICAL 2026-09-05 — Initial Project Audit COMPLETE

| File | Focus | Size |
|------|--------|------|
| `.ai/audit/initial-project-audit-20260905.md` | Context, docs, roadmap | ~700 lines |
| `.ai/deep-audit-20260905.md` | Code structure, 52 findings | ~19 sections |
| `.ai/deep-audit-report-20260905.md` | Security + engineering, 27 findings | ~15 sections |
| `E:\teora\audit-product-ux-ai.md` | Product, UX, AI, competitive | 62KB, 18 sections |

### Master Report Summary (`.ai/master-audit-20260905.md`)

**18 sections per MASTER DIRECTIVE format:**

| # | Section | Key Finding |
|---|---------|------------|
| Executive Summary | Score 6/10 — impresif untuk 1 developer, 3 kritis: positioning, mobile, payment |
| 1 | Product Positioning | Landing ≠ App (24 routes tidak dipromokan); 4 options pending |
| 2 | Feature Audit | 9 KEEP, 11 IMPROVE, 7 DELAY, 6 REMOVE, 5 ADD |
| 3 | Security Audit | 3 Critical, 4 High, 12 Medium, 8 Low |
| 4 | Engineering Audit | 30 DB tables, 15+ OpenAPI drift, tech debt manageable |
| 5 | AI Architecture Audit | 6 mode bagus, missing grounding + citation validation + RAG |
| 6 | UX Audit | Mobile nav CRITICAL broken, nav overload, no onboarding |
| 7 | Payment & Business Audit | Midtrans not wired, Stripe webhook missing, spend cap missing |
| 8 | Docs vs Reality | 15+ mismatches found |
| 9 | Risk Register | 10 risks, 2 Critical |
| 10 | MVP Definition | 6 Must Have, 5 Should Have, 5 Nice to Have |
| 11 | Roadmap | 3 phases (Survival → Payment → Polish → Growth) |
| 12 | Open Questions for Owner | 8 questions, 6 require owner decision |
| 13 | Explicitly Not Building | 10 items intentionally excluded |
| 14 | Decision Log | 7 pending decisions (6 require owner) |
| 15 | Acceptance Criteria | Per-feature, 3 major flows |
| 16 | KPI Metrics | 8 metrics, none currently tracked |
| 17 | Testing Strategy | Missing E2E, critical AI hallucination tests |
| 18 | Quality Gates | 11 pre-deploy checks |

### Verified Finding (VERIFIED during audit)

| # | Finding | File | Fix |
|---|---------|------|-----|
| V1 | **VERIFIED.** `orderBy(sql`created_at desc`)` — wrong column name, throws SQL error | `routes/ai-usage.ts:51` | `orderBy(desc(aiUsageLogTable.createdAt))` |

### 8 Owner Decision Points

| # | Decision | Why | Blocking? |
|---|----------|-----|-----------|
| 1 | Positioning option (A/B/C/D) | Landing + go-to-market depend on this | YES |
| 2 | Payment gateway (Midtrans/Stripe) | Indonesia market | YES |
| 3 | AI provider (Groq free/paid) | Free tier shared limits problem | YES |
| 4 | Free tier limits | Revenue protection | YES |
| 5 | UU PDP compliance approach | Legal requirement | YES |
| 6 | Custom domain | Branding | YES |
| 7 | Referral reward amount | Business model | YES |
| 8 | Analytics tool | No analytics today | NO |

### AI-Implementable (No Owner Decision Needed)

| # | Fix | Priority | Files |
|---|-----|---------|-------|
| 1 | Fix SQL error in ai-usage.ts | P0 | `routes/ai-usage.ts` |
| 2 | Mobile drawer navigation | P0 | `layout.tsx`, `App.tsx` |
| 3 | Spend cap enforcement | P0 | `routes/*.ts` |
| 4 | Rate limit user message | P1 | `custom-fetch.ts` + UI |
| 5 | AI citation grounding | P1 | AI routes |
| 6 | AI timeout + fallback | P1 | AI routes |
| 7 | Wrap supabase-admin in try/catch | P1 | `supabase-admin.ts` |
| 8 | File size limit on uploads | P1 | `routes/attachments.ts` |
| 9 | Fix PDF export or disable | P2 | `routes/exports.ts` |
| 10 | DOCX export build or disable | P2 | `routes/exports.ts` |

### Next: Owner Review

Present master audit findings to owner. Await decisions on 8 blocking items before implementation planning.

---

## HISTORICAL 2026-09-05 — Full Feature Audit + Fixes (Non-Payment/AI Provider)

**Status:** ✅ DONE — Committed `ae99552`, pushed, frontend deployed, backend deploying
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`
**Commit:** `ae99552`

### What

Owner directive: "clear all non-payment/non-AI-provider features — audit everything, find gaps, fix ALL, deploy live."

### Fixes Applied

| # | Issue | File | Fix |
|---|-------|------|-----|
| P1 | Compile error (usersTable missing) | `api-server/src/routes/projects.ts` | Add to destructured import |
| P1 | ToS consent missing | `pages/register.tsx` | Add agreeToS Zod schema + Checkbox UI |
| P1 | No support/help channel | `pages/help.tsx` (NEW) | Full FAQ page (7 items, Indonesian) |
| P2 | Legal dates 2025 → 2026 | `pages/terms.tsx`, `pages/privacy.tsx` | Update effectiveDate + copyright |
| P2 | Garbled text in privacy policy | `pages/privacy.tsx` | Fix `行使` → `menggunakan` |
| P3 | Hardcoded brand colors | `pages/landing.tsx` | Replace `bg-[#2D79FF]/10` → `bg-brand/10` |
| P3 | CSS brand token system | `index.css` | Add HSL component vars for `--color-brand` |
| P3 | Footer links wrong | `pages/register.tsx` | `href="#"` → `/privacy`, `Help Center` → `Pusat Bantuan` |
| P3 | Help link missing from sidebar | `components/layout.tsx` | Add `<NavSubItem href="/bantuan" label="Pusat Bantuan" />` |

### Deploy

- **Frontend:** GitHub Actions `deploy-frontend.yml` → ✅ COMPLETED at `ae99552`
  - URL: `https://academic-workspace-sagise-ctrls-projects.vercel.app`
- **Backend:** GitHub Actions `deploy-backend.yml` → 🔄 IN PROGRESS
  - URL: `https://teora-backend.vercel.app` (existing)
  - Build: `node build.mjs` → `api/index.mjs` + `dist/index.mjs`

### Remaining Non-Payment/Non-AI Tasks (Lower Priority)

| # | Task | Notes |
|---|------|-------|
| 1 | Consent tracking DB columns | Need `tos_consented_at`, `privacy_consented_at` columns + backend |
| 2 | Spend-cap middleware | Prevents AI usage when balance = 0 |
| 3 | E2E tests | No Playwright/Cypress setup |
| 4 | CI path filter fixes | lib/api-spec → frontend deploy; lib/ → backend deploy |
| 5 | OpenAPI spec completeness | Check against actual routes |
| 6 | Decisions.md duplicate fix | DECISION 006 duplicate entries |
| 7 | Operational docs cleanup | Stale content in blockers.md, decisions.md |

### Owner Remaining Actions (ONLY these 2)

1. **Payment Gateway**: Setup Midtrans or Stripe
2. **AI API Provider**: Setup Groq or OpenAI API key

---

## HISTORICAL 2026-09-05 — Token Limit, Sisa Token, AI Usage per User

**Status:** ✅ DONE — Committed `d357662`, pushed, frontend CI/CD running
**Model:** claude-opus-4-6
**Branch:** `feat/daftar-task`
**Commit:** `d357662`

### What

Owner Topic #4: halaman "Penggunaan Token" + banner saldo rendah di semua protected pages.

### Root cause findings (defects fixed)

1. **Dead route** — sidebar links to `/usage` but App.tsx never registered the route → 404 on click
2. **Wrong cost semantics** — page displayed `estimatedCostUsd` (AI provider USD cost) instead of `costCents` (IDR deducted from user balance). "$0.000002" to Indonesian students was both wrong and leaked provider pricing.
3. **Broken DailyBarChart** — component rendered with NO props (`<DailyBarChart />`) because `dailyTotals` only exists on admin endpoint, not user endpoint.
4. **Back link bug** — `<Link href="/">` went to public landing page instead of dashboard.
5. **English UI text** — rest of app is Indonesian but usage page was English.

### Changes applied

| Layer | File | Change |
|-------|------|--------|
| Backend | `src/routes/usage.ts` | Aggregate `costCents`/`totalCostCents` in both user endpoints |
| OpenAPI | `openapi.yaml` | Add `costCents` to breakdown objects, `totalCostCents` to both stats schemas |
| Codegen | `api-zod` + `api-client-react` | Regenerated |
| Frontend | `pages/usage.tsx` | Rewrite: IDR (costCents), translate to Indonesian, remove DailyBarChart, fix back link |
| Frontend | `App.tsx` | Register `/usage` route with ProtectedRoute + Layout |
| Frontend | `components/layout.tsx` | Add "Penggunaan" under Akun nav, sidebar orange warning at Rp 20.000 |
| Frontend | `components/low-balance-banner.tsx` | New: dismissible banner at < Rp 10.000, per-user per-day via localStorage |
| Frontend | `lib/balance-thresholds.ts` | New: SALDO_BANNER_CENTS + BANNER_STORAGE_PREFIX constants |

### Deploy

- **Frontend:** Push `d357662` → CI/CD pipeline auto-builds + deploys to Vercel
- **Backend:** Manual Vercel dashboard deploy needed (MCP blind spot — only sees academic-workspace project)
  - Project: `teora-backend` (prj_5c9YZBllez1NgwZazyStYt8wTJ5d)
  - Deploy: `npm run build` then `vercel deploy --prod --yes` from `artifacts/api-server/`
  - Or: Vercel dashboard → select `teora-backend` → Deployments → Deploy from `feat/daftar-task`
- **Frontend bundle check:** Verify `dist/assets/index-*.js` contains "/usage", "Penggunaan", "Biaya per Fitur", "Topup sekarang"
- **Backend check:** `GET /api/users/me/usage` returns `totalCostCents` + `costCents` in breakdown objects

### Non-3eda73f note

Commit `3eda73f` ("fix(api): move aiLimiter after authMiddleware + expand coverage to 7 AI route groups") — committed but deploy status not documented. Owner confirmed working 2026-09-05. This commit is included in the current branch.

### Next

1. Wait CI/CD frontend deploy complete
2. Owner manual deploy backend via Vercel dashboard
3. Verify /usage route works (no 404)
4. Verify cost shown in IDR, not USD
5. Owner test: click sidebar "Penggunaan" under Akun → /usage page loads

### Handoff 2026-09-05 ---

- **Task:** Topic #4 selesai, committed + pushed
- **Last 3 actions:** (1) Edit openapi.yaml + codegen, (2) Rewrite usage.tsx + create LowBalanceBanner, (3) Register route + commit + push
- **Next 3 actions:** (1) Monitor CI/CD frontend deploy, (2) Owner deploys backend manually, (3) Verify /usage works in production
- **Open questions:** Backend deploy needs owner action via Vercel dashboard

---

## HISTORICAL 2026-09-05 — Google OAuth Login Fix

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

## ACTIVE 2026-09-08 — Pricing Strategy `/langganan` Page (Anchored Rolling Window + 30 SKU + Saldo IDR Hybrid)

**Status:** 🟡 IN PROGRESS — Frontend display deployed + Saldo mechanism spec complete, awaiting owner review & next priorities
**Production URL:** https://academic-workspace-eta.vercel.app/langganan
**Model:** claude-opus-4-8
**Branch:** `feat/daftar-task`
**Commits:** `f502c4b` (initial frontend), `00b8174` (banner removal + saldo docs)

### Owner Goal

Owner wants to verify the pricing display and wording on the live web before locking in backend logic. Frontend display-only first, backend logic setup later.

### Pricing Strategy (Anchored Rolling Window)

Owner-defined mechanics (per message 2026-09-08):
- **5h cap** = 1/10 × 7d cap (e.g., 7d=100k → 5h=10k)
- **7d cap** = subscription_days/7 × 7d base (15d = 2× base, 30d = 4× base)
- **Anchor**: rolling window starts from FIRST token use (not calendar date)
- **Reset**: limit returns to FULL after window elapses from anchor time
- **Hard ceiling**: subscription cannot exceed subscription_days/7 × 7d cap (e.g., 15d max = 2× 7d, 30d max = 4× 7d)

### 30 SKU Matrix

5 tiers × 3 model types × 2 periods = 30 SKUs (see Section 10 of pricing-strategy doc)

### Hybrid Mode: Subscription + Topup Saldo (Owner-confirmed 2026-09-08)

| Aturan | Keputusan |
|--------|-----------|
| Topup disimpan sebagai **IDR** (bukan token) | ✅ |
| Minimum topup | Rp 10.000 |
| Saldo expire (no activity) | 12 bulan → **HOLD** + kontak CS untuk reaktivasi |
| Withdraw/pencairan saldo | 🗑️ **Tidak ada** (owner 2026-09-08) |
| Mix subscription + topup | Boleh berbeda transaksi |
| Autofallback | **ON by default** (bisa di-toggle di Settings) |
| Banner saldo rendah | 🗑️ **Dihapus** per owner — "no nag" UX |

### ToS Checkbox Spec (Owner 2026-09-08)

Sebelum payment subscription, user WAJIB centang checkbox ToS:
- ☑ Langganan TIDAK BISA di-pause
- ☑ Tidak ada refund setelah pembayaran berhasil
- ☑ Kuota tidak digunakan akan hangus
- ☑ Saya menyetujui Syarat & Ketentuan Teora

Tombol "Bayar" disabled sampai SEMUA checkbox dicentang.

### Files Changed

| File | Status | Notes |
|------|--------|-------|
| `docs/ai-team/finance/pricing-strategy-2026-anthropic.md` | ✅ UPDATED | Sections 10, 11, 12 (Saldo IDR), 13 (ToS) added |
| `artifacts/academic-workspace/src/pages/langganan.tsx` | ✅ NEW | ~600 lines: TIER data + QuotaBox + TierCard + LanggananPage |
| `artifacts/academic-workspace/src/App.tsx` | ✅ UPDATED | Added `/langganan` protected route |
| `artifacts/academic-workspace/src/components/layout.tsx` | ✅ UPDATED | Added `NavSubItem` "Paket Berlangganan"; **removed LowBalanceBanner** |
| `artifacts/academic-workspace/src/components/low-balance-banner.tsx` | 🗑️ DELETED | Banner eksplisit tidak lagi dipakai |
| `artifacts/academic-workspace/src/lib/balance-thresholds.ts` | ✅ UPDATED | Removed SALDO_BANNER_CENTS, kept SALDO_WARNING_CENTS |

### Verification

| Endpoint | Status | Size |
|----------|--------|------|
| `/langganan` | 200 | 1413 bytes (HTML shell) |
| `/` | 200 | 1413 bytes |
| `/assets/index-*.js` | 200 | 1.5MB (contains all langganan + saldo strings, NO LowBalanceBanner) |
| `/api/v1/ai-pricing/tiers` | 401 (proxied to backend) | OK |

Bundle contains: `Paket Berlangganan`, `Pilihan Terbaik`, `Hemat 15%`, `Cara kerja kuota`, `/langganan`, `langganan`, `Saldo`, `Saldo Anda`.

Bundle does NOT contain: `LowBalanceBanner`, `Saldo hampir habis`.

### Pending Next Steps

1. **Owner verifies** display + wording on production URL
2. **Owner reviews** Sections 12 + 13 of pricing doc (saldo mechanism + ToS spec)
3. ~~Withdraw saldo mechanism~~ — 🗑️ Tidak ada (owner 2026-09-08)
4. **Open question** — sidebar oranye saldo rendah — keep atau hapus? (saya keep untuk sekarang sebagai visual cue)
5. Backend subscription logic — DEFER per owner
6. Payment integration (Midtrans/Stripe) — DEFER
7. ToS checkbox UI implementation — saat payment flow di-setup

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

## Handoff 2026-09-08 — Dashboard Review + DisplayName Fix

**Status:** 🟡 IN PROGRESS — Owner decisions captured, Google OAuth displayName fix deployed (pending backend deploy), Mobile Sidebar pending

**Model:** claude-opus-4-8 (current)
**Branch:** `feat/daftar-task`

### Owner Decisions (this session)

| # | Decision | Status |
|---|----------|--------|
| 1 | Toggle Pelajar/Pengajar | ⏸️ DEFER |
| 2 | Assessment khusus Pengajar | ✅ CONFIRM |
| 3 | Google OAuth displayName auto-fill | ✅ FIXED in `auth.ts` (pending deploy) |
| 4 | Mobile Sidebar fix | 🟡 PENDING implementation |
| 5 | Owner Routing explanation | ✅ Explained with security audit |
| 6 | Onboarding | ⏸️ SKIP post-launch |

### Changes Shipped (this session)

| File | Change | Commit |
|------|--------|--------|
| `artifacts/api-server/src/routes/auth.ts` | `deriveDisplayName()` extracts from `user_metadata.full_name` (Google) → `displayName` field. INSERT only on first login; COALESCE on conflict (preserve user edits). | ⏳ PENDING COMMIT |

### Security Audit Findings (Owner Routing)

| Layer | Status | Detail |
|-------|--------|--------|
| Backend `requireOwner` middleware | ✅ AMAN | `req.user.email === OWNER_EMAIL` exact match |
| Backend `/admin/*` endpoints | ✅ AMAN | All protected by `requireOwner` |
| JWT signature (ES256 JWKS) | ✅ AMAN | Attacker cannot modify email in token |
| `OWNER_EMAIL` env var exposure | ✅ AMAN | Backend-only; no `VITE_OWNER_*` in frontend |
| Frontend `/admin/*` route guards | ⚠️ UX-only | `ProtectedRoute` (auth only), no `RequireOwner` wrapper — non-owners see error page, backend still rejects with 403 |

### Pending Next Steps

1. Commit displayName fix + push (after owner approval)
2. Implement Mobile Sidebar P0 fix (1 day)
3. Owner auto-redirect (5 min, pending confirmation)
4. Dashboard cleanup (30 min, optional)
5. Delete 7 orphan files (`_upload.js`, `_mcp_params.json`, `NUL`, `openapi.yaml.bak`, `screnshoot/`, `hello.ts`)

---

## COMPLETED 2026-09-01 — SPA Routing Fix

**Status:** ✅ SELESAI — Deploy berhasil, semua route 200 OK

| Error | Root Cause | Fix | Status |
|-------|-----------|-----|--------|
| `/auth/callback` 404 | `tsconfig.json` extends `../../tsconfig.base.json` — not accessible at Vercel build in subdirectory → build FAIL | Inline `tsconfig.base.json` compilerOptions into workspace `tsconfig.json` | ✅ Deploy 2026-09-01 |

---

## Error Learning System — Initial Setup COMPLETE 2026-09-10

**Milestone:** Decision 005 — Error learning system based on Hermes Agent pattern
**Status:** ✅ Foundation setup complete
**Model:** claude-opus-4-8

### Files Created (3)
1. `.ai/guidelines/error-handling-protocol.md` — 8-step behavioral SOP (SEARCH → INVESTIGATE → ROOT CAUSE → TRACK ATTEMPTS → FIX → VERIFY → PREVENT → STORE)
2. `.ai/guidelines/prevention-guidelines.md` — Minimum effective prevention decision tree
3. `.ai/error-index.md` — Multi-signal registry dengan normalized schema, tag index, 16 entries

### Files Modified (3)
1. `CLAUDE.md` — Added Error Handling Protocol section + `.ai/error-index.md` ke Session Start Protocol
2. `.claude/rules/teora-guardrails.md` — Added FIX≠VERIFIED rule, Confidence labels, Memory hygiene, Pattern detection trigger
3. `.ai/lessons-learned.md` — Updated format (di CLAUDE.md) dengan CONFIDENCE + ATTEMPTS + VERIFICATION fields, back-link `[ERR-XXX]` ke 10 existing entries

### Procedural Knowledge Promoted (2 skills)
1. `.claude/skills/error-recovery/pnpm-vercel-deploy.md` — promoted from pattern `pnpm_workspace_vercel_incompatibility` (3x confirmed: ERR-003, ERR-012, ERR-013)
2. `.claude/skills/error-recovery/vercel-prebuilt-deploy.md` — promoted from pattern `vercel_prebuilt_cache_or_routing` (4x confirmed: ERR-010, ERR-011, ERR-014, ERR-015)

### Patterns Tracked (untuk promosi masa depan)
- `auth_middleware_order_or_misconfig` (4x — eligible untuk promosi berikutnya)

### Open Action Items (untuk next session)
- [ ] Update `.ai/issue-tracker.md` entries dengan ERR-XXX back-links (19 entries)
- [ ] Validate error-index format dengan pilot 3 entries (code/deploy/behavior)
- [ ] Test session start protocol: apakah agent berikutnya benar-benar search error-index sebelum coding?
- [ ] Review confidence label accuracy setelah 1-2 minggu penggunaan

### Git State
- Local: changes ready to commit
- Remote: NOT pushed (per Git Rules — owner instruction needed)
- Commit pending: "feat(ai-engineering): add error learning system (Decision 005)"

---

## Handoff 2026-09-10 08:14 — model opus-4-8 → opus-4-X (next session)

**Status:** Session closed per owner instruction. Error Learning System (Decision 005) implemented and committed locally.

### Task Aktif
- ✅ Error learning system — Decision 005 COMPLETE (commit `d3820ca`)
- ⏸️ Landing redesign — paused (working tree, not related to error system)

### Last 3 Actions
1. **Phase 1-4 implemented** — 3 foundation files (.ai/error-handling-protocol.md, prevention-guidelines.md, error-index.md) + 3 modified files (CLAUDE.md, guardrails, lessons-learned) + 2 promoted skills (pnpm-vercel, vercel-prebuilt) + 16 ERR-XXX entries seeded
2. **Back-linked 10 lessons-learned entries** dengan `[ERR-XXX]` suffix di header
3. **Committed `d3820ca`** — feat(ai-engineering): add error learning system (Decision 005) — 4 files, 318 insertions, 1 commit lokal

### Next 3 Actions (next session)
1. **Pilot test retrieval** — verify agent berikutnya benar-benar search `.ai/error-index.md` saat dapat error signature yang mirip (ERR-005, ERR-009, ERR-013, dll)
2. **Back-link issue-tracker entries** — 19 entries di `.ai/issue-tracker.md` belum punya `[ERR-XXX]` reference; migrate per memory hygiene (skip trivial, save recurring/production-impact)
3. **Validate format accuracy** — review confidence labels + ATTEMPTS tracking setelah 1-2 minggu penggunaan; adjust jika format terlalu rigid atau terlalu loose

### Open Questions (butuh owner)
1. **Push `d3820ca` ke remote?** — Saat ini lokal saja di `feat/daftar-task`. Per Session Start Protocol push di session-close diizinkan, tapi belum dilakukan karena owner tidak eksplisit request push.
2. **Landing-redesign di branch yang sama** — `feat/daftar-task` sekarang punya 2 unrelated concern (landing redesign + error system). Mau di-split ke branch terpisah, atau di-stash dulu?
3. **Pattern `auth_middleware_order_or_misconfig` (4x)** — eligible untuk promosi ke skill ketiga (`auth-middleware-config.md`). Prioritaskan atau tunggu?
4. **`.ai/` gitignore** — `.ai/error-index.md` + `.ai/guidelines/*.md` tidak masuk git (by design). Owner OK dengan operational state per-machine, atau mau force-track?

### Files Aktif Saat Ini (untuk reference next session)
| File | Status | Purpose |
|------|--------|---------|
| `.ai/guidelines/error-handling-protocol.md` | Active, gitignored | 8-step SOP |
| `.ai/guidelines/prevention-guidelines.md` | Active, gitignored | Prevention decision tree |
| `.ai/error-index.md` | Active, gitignored | 16 ERR-XXX entries |
| `CLAUDE.md` | Active, tracked (d3820ca) | Session Start + Error Handling Protocol |
| `.claude/rules/teora-guardrails.md` | Active, tracked (d3820ca) | Error Handling rules |
| `.claude/skills/error-recovery/pnpm-vercel-deploy.md` | Active, tracked (d3820ca) | 3x promoted skill |
| `.claude/skills/error-recovery/vercel-prebuilt-deploy.md` | Active, tracked (d3820ca) | 4x promoted skill |
| Memory `error-learning-system-decision-005-20260910.md` | Active | Cross-session reference |

### Resume Instructions
Next session: jalankan Session Start Protocol (read .ai/ files) + cek `.ai/error-index.md` early untuk context. Kalau dapat error, follow `.ai/guidelines/error-handling-protocol.md` 8-step SOP.
