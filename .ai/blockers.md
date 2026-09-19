# Blockers
> Items waiting for owner decision. AI removes items when resolved.

## Pending Decisions

| Blocker | Priority | Owner Action | Urgency |
|---------|----------|--------------|---------|
| ~~Merge to main~~ | ✅ **Owner-approved 2026-08-28** | ~~Merge feat/tier-2-complete → main~~ | Trigger pipeline |
| ToS + Privacy Policy | P1 | Write or provide legal documents | Blokir Stripe integration |
| Payment provider | P1 | Decide on Stripe vs Xendit vs Midtrans | Revenue blocker |
| ~~**Referral reward**~~ | ✅ **Owner-approved 2026-09-09** | ~~Fix referral reward — kita pernah diskusi tapi belum fix detail reward-nya~~ | Detail final ada di `docs/ai-team/finance/referral-program-discussion.md` Section "Ringkasan Keputusan" |
| **Maintenance model discussion** | P2 | Owner perlu pastikan AI team berjalan sesuai keinginan sebelum go-live | Discuss SETELAH semua fitur clear/selesai |
| **AUDIT 2026-09-05 — UU PDP Compliance** | P1 | Consent banner, data retention policy, right to deletion | Legal risk |
| **AUDIT 2026-09-05 — Free tier limits** | ⏸️ **DEFERRED 2026-09-15** | Owner 2026-09-15: tidak ada fitur free tier di Teora saat ini. Semua fitur AI berbayar. Free tier mungkin akan ada di masa depan kalau ada provider yang menyediakan gratis (misal Anthropic free credits untuk startup). | Closed untuk sekarang — bukan blocker aktif |
| **AUDIT 2026-09-15 — RLS Security Gap (was P0 → P0 partially resolved)** | **P0 (S5 remaining)** | 10 tables punya RLS enabled tapi **NO policies** — sekarang **14 policies sudah ditulis di 10 tables** via migration. Plus `rls_auto_enable()` SECURITY DEFINER PUBLIC EXECUTE **revoked**. Plus `update_reference_citations_updated_at()` search_path **locked ke public**. Plus leaked password protection **masih OFF (owner action)**. | **Pre-launch blocker partially resolved** — INC-006 4 of 5 fixed. S5 (leaked password protection) butuh owner toggle di Supabase Dashboard → Auth → Security. |
| **AUDIT 2026-09-15 — Autofallback design mismatch** | ❌ **RESOLVED 2026-09-15** | AI salah tafsir "circuit breaker" di audit. Re-reading `pricing-strategy-2026-anthropic.md` Section 12.3: spec SUDAH final per owner 2026-09-08 — cascade ke saldo adalah BY DESIGN (saldo = self-funded user, no owner risk). Owner confirm 2026-09-15: "kalau langganan habis dan user punya saldo ya gpp mereka pakai saldo". | Spec final = Section 12.3. See DECISION 018. |
| **AUDIT 2026-09-15 — Max spend cap per user** | ❌ **REJECTED 2026-09-15** | Owner decision 2026-09-15: max spend cap untuk saldo TIDAK diperlukan. Saldo = duit sendiri user (self-funded), bukan owner risk. Subscription quota cap SUDAH ada dalam bentuk 5h/7d window (Section 10.1). | Closed — no action needed |
| **AUDIT 2026-09-15 — Olagon Gateway (was: P1 not used)** | ✅ **Owner-approved 2026-09-15 (DECISION 020)** | Olagon APPROVED untuk owner-only AI provider. Token tetap di `~/.claude/settings.json` owner — tidak masuk repo Teora. 2 tier baru di DB: `opus-4-8-olagon` + `opus-4-6-olagon` (cascade). `is_owner_only=true` gate via `OWNER_EMAIL`. Non-owner tidak bisa akses. Phase 1 backend ✅ shipped (`c360ab0`). **Owner manual step**: set `OLAGON_API_KEY` env var di Vercel Dashboard. | Closed — DECISION 020. |

## 🚨 Security Incidents (NEW section — Audit 2026-09-15)

Hasil `get_advisors` terhadap Supabase project (`pftseqzpzweqnwgtckoj`):

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| **S1** | **10 tables RLS enabled tapi 0 policy**: `account_references`, `ai_tiers`, `document_templates`, `learning_activities`, `reference_citations`, `simulation_messages`, `simulation_reports`, `simulation_sessions`, `token_transactions`, `user_balances` | **CRITICAL** | **Pre-launch blocker — bocor confirmed** |
| **S2** | `rls_auto_enable()` SECURITY DEFINER function executable by `anon` role via `/rest/v1/rpc/rls_auto_enable` | HIGH | Attacker tanpa login bisa invoke |
| **S3** | `rls_auto_enable()` SECURITY DEFINER function executable by `authenticated` role | MEDIUM | Same function, signed-in escalation path |
| **S4** | `update_reference_citations_updated_at()` function has mutable search_path | LOW | Standard Supabase function, fix dengan `SET search_path = public` |
| **S5** | Leaked password protection disabled (HaveIBeenPwned check off) | MEDIUM | Enable di Supabase Auth settings |

**AI stance:** S1+S2+S3+S4 sudah **FIXED 2026-09-15 via migration**. Lihat INC-006 untuk detail. S5 (leaked password protection) **sisa satu-satunya** dan **harus owner yang eksekusi** di Supabase Dashboard (tidak bisa via API).

## ⚠️ Design Mismatch — Autofallback vs Circuit Breaker (Audit 2026-09-15) — RESOLVED

**Owner clarification (2026-09-15):** "kalau langganan habis dan user punya saldo ya gpp mereka pakai saldo"

**Spec yang ada (`docs/ai-team/finance/pricing-strategy-2026-anthropic.md`, APPROVED 2026-09-08):**
- Section 12.3 line 593-608: Hybrid autofallback cascade. Subscription quota habis → cek saldo (kalau autofallback ON) → pakai saldo. Default autofallback = ON.
- Section 10.7 Anti-Gaming #10: "Auto-stop circuit breaker saat cap tercapai" — wording AMBIGUOUS, tapi owner 2026-09-15 konfirmasi spec SUDAH benar (cascade = by design)

**Code aktual (`artifacts/api-server/src/lib/subscription.ts`):**
- Line 407: `// Both windows exhausted → fall through to autofallback check`
- Line 409+: Cek `user_balances.autofallbackEnabled`, kalau true & balance cukup, deduct

**Status: ✅ RESOLVED 2026-09-15.** AI salah tafsir "circuit breaker" = stop total. Re-reading spec + owner clarification:
- Subscription quota cap (5h/7d) = hard ceiling untuk subscription. ✅ Sudah ada.
- Saldo cascade setelah subscription habis = by design, bukan "circuit breaker failure".
- Saldo = self-funded user (duit sendiri), jadi tidak ada owner risk kalau user boros pakai saldo.
- Tidak perlu perubahan kode, spec, atau UI.

**Max spend cap untuk saldo:** ❌ REJECTED 2026-09-15. Saldo = duit sendiri user, tidak perlu di-cap.

**Lesson learned:** Sebelum tulis audit blocker, WAJIB cross-check spec dengan owner via plain language. AI tidak boleh asumsi "circuit breaker" = generic term — cek konteks spec dulu.

## 📝 Documented-Deferred (Owner Decision 2026-09-13)

| Item | Status | Note |
|------|--------|------|
| **`AI_API_KEY` (OpenAI / Anthropic)** | 📝 **DOCUMENTED-DEFERRED** | Owner instruction 2026-09-13: *"saya belum punya AI API, jadi hal ini didokumentasikan dulu saja"*. AI features (generate project, chat, quiz generation, dll) will return 503/error sampai key diset. Bukan blocker aktif — by design sampai owner punya API key. Catat di docs, jangan tagih sebagai urgent. |

## Diskusi Berikutnya — Prioritas Rendah (Cleanup)

Items di bawah bukan urgent. Owner akan discuss saat ready:

| # | Item | Scope | Diskusi Needed? |
|---|------|-------|----------------|
| 1 | **Archive / merge `feat/daftar-task`** | Branch punya 19 commit ahead of main. Semua commit penting sudah di-merge ke main. Branch bisa di-archive atau di-fast-forward merge. Risiko: merge naif akan membawa Practice/Usage API stubs (mock mode). | ⚠️ Perlu diskusi: strategi merge? archive? |
| 2 | **Delete 7 orphan files** (per audit 2026-09-05) | `_upload.js`, `_mcp_params.json` (2.3MB), `NUL`, `lib/api-spec/openapi.yaml.bak`, `screnshoot/` (24 PNGs ~5MB), `scripts/src/hello.ts` | ✅ Owner tinggal bilang "go" — AI execute. Tidak perlu diskusi teknis. |
| 3 | **Set Supabase Site URL** | Fix OAuth URL exposure: set Site URL ke `https://academic-workspace-eta.vercel.app` di Supabase Dashboard → Authentication → URL Configuration. Proper fix: custom domain `teora.com` | ✅ Owner tinggal execute sendiri di Supabase dashboard. |

## Feature Taxonomy Decisions (from feature-taxonomy.md)

| # | Decision | Value | Notes |
|---|----------|-------|-------|
| 1 | Reference Search engine | **CrossRef Search API** | ✅ IMPLEMENTED 2026-08-25 |
| 2 | Auto-reference suggestions | ✅ IMPLEMENTED 2026-08-25 | During project creation, auto-search by title |
| 3 | DOCX export library | **`docx` npm** | MIT, free, well-maintained. |
| 4 | PDF export library | **`pdfkit`** | ✅ CHANGED 2026-08-28. @react-pdf/renderer incompatible with Vercel Function bundling. pdfkit works with custom esbuild plugin for standard-fonts resolution. |
| 5 | Implementation order | Ref Search ✅ → Auto-suggest ✅ → DOCX → PDF → FinOps → UI Alignment | — |

## AI Team Action Items

| Item | Status | Notes |
|------|--------|-------|
| Deploy api-server | ✅ Done 2026-08-26 | Direct Vercel CLI deploy via VERCEL_TOKEN. PDF export temporarily disabled. |
| CORS preflight 204 + GET 200 from production frontend | ✅ Done 2026-08-26 | Fixed `callback(new Error(...))` → `callback(null, false)` in `src/app.ts` |
| Frontend redeploy | On merge | Merging to main triggers frontend redeploy |
| AI_API_KEY | 📝 Documented-Deferred | Owner 2026-09-13: belum punya API, dokumentasikan saja. See section "Documented-Deferred" above. |
| FinOps monitoring UI | ✅ Done 2026-08-28 | Full dashboard with charts (PieChart, BarChart), usage table, stat cards in finops.tsx |
| **Re-enable PDF export (Option 1: bundle font paksa)** | ✅ Done 2026-08-28 | pdfkit + pdfkitFontsPlugin in build.mjs. GET /projects/:id/export/pdf re-enabled in projects.ts. Committed `5d22b3b`. |
| **Wire frontend Google OAuth button** | ✅ Done 2026-08-27 — commit `cb48d5b` on `feat/google-oauth-frontend` | login.tsx button enabled + wired to `signInWithOAuth('google')` via use-auth.tsx. New `pages/auth-callback.tsx` handles OAuth redirect. Needs merge to main → frontend redeploy to be live in production. |
| CI non-deploy jobs fix | ✅ Done 2026-08-28 | Simplified ci.yml (6 jobs → 1 job, Node 22). Fixed citation.test.ts DOI patterns + prompt-injection.test.ts pattern matching. Committed `5d22b3b`. |

## Env Vars untuk Vercel — api-server

Sudah di-set via Vercel CLI:
- `DATABASE_URL` ✅
- `DATABASE_POOLER_URL` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_JWT_SECRET` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `ALLOWED_ORIGINS` ✅ (added 2026-08-26)
- **`AI_API_KEY`** 📝 **DOCUMENTED-DEFERRED** — Owner 2026-09-13: belum punya API, didokumentasikan saja. AI features (generate, chat, quiz) akan return 503/error sampai key diset. Bukan urgent — akan di-add saat owner punya key.
- **`OWNER_EMAIL`** ❌ **CONFIRMED MISSING** — Owner bypass doesn't fire in `checkAIAccess`. **Root cause of "Saldo Tidak Cukup" error in dashboard chat.** Default per DECISION 014 = `sagiseainun@gmail.com`. Set in Vercel: https://vercel.com/dashboard → teora-backend → Settings → Environment Variables.
- **`OLAGON_API_KEY`** ❌ **CONFIRMED MISSING** — **Root cause of "AI belum dikonfigurasi" error in dashboard chat.** Olagon tiers need this key. Set in Vercel env vars.
- **`ANTHROPIC_API_KEY`** ❌ **CONFIRMED MISSING** — Haiku 4.5 / Sonnet 5 tiers need this key (or `AI_API_KEY` as fallback). Set in Vercel env vars.

## Pending Cleanup Tasks (awaiting owner go-ahead)

| # | Task | Scope | Owner Approval Needed |
|---|------|-------|----------------------|
| 1 | **Delete sensitive traces in project** (no prod impact) | See scope below | ⚠️ Awaiting "go" from owner |

### Cleanup Task — Scope & Safety Analysis

**Trigger:** Owner provided two tokens in chat that are now in conversation transcript:
- `[REDACTED]` (Vercel)
- `[REDACTED]` (GitHub)

**Required pre-cleanup action (owner):**
1. Revoke both tokens at their respective platforms (Vercel + GitHub)
2. Confirm rotation done

**In-project sensitive traces to clean (per initial scan):**

| Path | Type | Risk if leaked | Prod impact if deleted |
|------|------|----------------|------------------------|
| `artifacts/academic-workspace/.env.production` | Untracked, 329B | Supabase URL + anon key | ❌ None — production uses Vercel env vars, not this file |
| `check-workflow.js` | Untracked, 813B, root | Unknown content (need to read first) | ❌ None — untracked, not deployed |
| `artifacts/academic-workspace/scripts/setup-workspace.mjs` | Untracked, 825B | Unknown content (need to read first) | ❌ None — untracked, build script only |

**Git history:** Need `git log -p --all -- .env.production` and grep for any historical commit that included real secret values. If found, requires `git filter-repo` (destructive, IRREVERSIBLE) — owner MUST approve before execution.

**Safety net for production:**
- Production URL `academic-workspace-eta.vercel.app` runs from Vercel-deployed bundle. Bundle was built from committed files only — untracked files were NEVER in any deployment.
- Vercel env vars are stored at Vercel (not in repo). Deleting local `.env.production` won't touch them.
- Backend `teora-backend.vercel.app` similarly independent.
- All deletes are local file ops (untracked files) or non-force-push commits (no Vercel auto-deploy trigger since GitHub integration already disconnected per Resolved table).

**Action when owner says "go":**
1. Read content of `check-workflow.js` + `scripts/setup-workspace.mjs` first to confirm no secrets
2. Delete all 3 untracked files locally (no commit needed for untracked)
3. Grep git history for any past committed secrets → report findings
4. If history clean: done. If secrets in history: propose `git filter-repo` plan, get explicit owner OK before running.

## Post-Launch Reminders (owner explicitly deferred to after launching)

| # | Item | Owner Action | Trigger |
|---|------|--------------|---------|
| 1 | **Revoke all tokens that ever appeared in chat history** | (a) Vercel token `[REDACTED]` → revoke at https://vercel.com/account/tokens. (b) GitHub PAT `[REDACTED]` → revoke at https://github.com/settings/tokens. (c) Olagon Gateway token `[REDACTED]` in `~/.claude/settings.json` → rotate at Olagon dashboard. | After web launches / goes live |
| 2 | **Re-integrate new tokens between GitHub ↔ Vercel ↔ Supabase ↔ Olagon** | Generate fresh tokens on each platform, re-add to (a) GitHub repo secrets (FRONTEND_VITE_SUPABASE_*, VERCEL_TOKEN), (b) Vercel project env vars (DATABASE_*, SUPABASE_*, AI_API_KEY, ALLOWED_ORIGINS, etc.), (c) `~/.claude/settings.json` (ANTHROPIC_AUTH_TOKEN), (d) Claude Code settings.local.json permissions if needed. Verify production still 200 OK after rotation. | After #1 above |
| 4 | **Supabase URL exposure in Google OAuth login page** | Quick fix: set Site URL ke `https://academic-workspace-eta.vercel.app` di Supabase Dashboard → Authentication → URL Configuration. Proper fix: custom domain `teora.com` + setup di Supabase Auth. Screenshot showing exposed URL: `e:\teora\screnshoot\brn.png` | Before launch |
| 5 | **AI maintenance agent setup** | Build autonomous maintenance layer (monitoring + alert pipeline + AI agent + auto-deploy) | Post-launch, P1 |

## Audit Findings (2026-09-05) — NEW

Full report: `E:\teora\audit-product-ux-ai.md` (18 sections)

### AI Team Action Items ( dari audit)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | Mobile drawer navigation | P0 | Tidak ada sidebar di mobile — gap kritis |
| 2 | Wire Midtrans backend | P0 | /topup UI ada, endpoint tidak ada |
| 3 | Rate limit user-facing message | P1 | User tidak tahu saat kena limit |
| 4 | AI citation grounding | P1 | Fictitious reference risk tinggi |
| 5 | Spend cap + usage alerts | P2 | Tidak ada max spend per user |
| 6 | Analytics integration | P3 | PostHog/GA tidak ada |
| 7 | Onboarding flow | P2 | User baru tidak tahu harus mulai dari mana |
| 8 | Delete 7 orphan files | P3 | _upload.js, _mcp_params.json, NUL, dll. |

### Orphan Files to Delete

| File | Action |
|------|--------|
| `_upload.js` | DELETE |
| `_mcp_params.json` (2.3MB) | DELETE |
| `NUL` | DELETE |
| `lib/api-spec/openapi.yaml.bak` | DELETE |
| `screnshoot/` (24 PNGs, ~5MB) | DELETE |
| `scripts/src/hello.ts` | DELETE |

### Task #3 Scope — Autonomous AI Maintenance Layer

**Owner instruction (2026-08-31):**
> "pada awal pembentukan web ini saya desain agar nanti web di maintance oleh AI team, jadi bukan hanya saat pembangunan web ... harapan saya AI team akan handle itu sampai error hilang, tanpa sentuhan saya"

**Owner decision (same session):** DEFERRED to post-launch. Continue ESLint cleanup first.

**What needs to be built:**

| Component | Function | Tool Options |
|-----------|----------|--------------|
| 1. Monitoring | Detect errors 24/7 | Sentry (free tier) / Vercel Runtime Logs / Datadog |
| 2. Alert pipeline | Trigger AI agent when error detected | Webhook → Slack/Discord → trigger AI process |
| 3. AI agent | Diagnose log → propose fix | Claude API + Node script (reads logs, calls API, writes patch) |
| 4. Auto-deploy | Push fix to production | GitHub Action / Vercel CLI / webhook deploy |

**Infrastructure options (when building):**

| Option | Cost | Trade-off |
|--------|------|-----------|
| A. VPS + Node agent ($5-20/mo) | Fixed | Full control, manual maintenance |
| B. Vercel Cron + AI Gateway ($0-5/mo) | Cheap | Cron-only, less flexible |
| C. Sentry + serverless AI agent (~$10/mo) | Cheap | Vendor lock-in but easiest |

**Recommendation when ready to build:** Option B + C hybrid (Vercel Cron + Sentry free tier).

**Reference:** See [[ai-team-autonomous-production-maintenance]] memory for full owner rationale.

**Owner's reasoning (verbatim from 2026-08-28 chat):**
> "semua hal sensitif seperti token yg sudah terlanjur masuk ke chat anda biarkan saja dulu, itu untuk otomatis anda selama pembangunan web ini, setelah selesai pembangunan dan siap untuk launching nanti saya akan revoke token, lalu akan integrasi ulang token baru"

AI does NOT need to ask about this again until owner says "launching soon" or "ready to launch". When that signal comes, AI should reference this block, confirm with owner before executing rotation, and walk through each platform step-by-step.

## Recently Resolved

| Blocker | Resolved | Notes |
|---------|----------|-------|
| Backend deploy-backend.yml pipefail fix | ✅ Done 2026-08-28 | Added `set -o pipefail` + PIPESTATUS check in deploy step. Commit `972d074`. |
| Vercel GitHub integration race | 2026-08-27 | Owner disconnected GitHub integration in Vercel dashboard. Verified: settings page now shows "Connect" buttons (GitHub/GitLab/Bitbucket) with no connected repo, no Disconnect button. teora-backend is now manual-deploy-only. |
| Google OAuth setup | 2026-08-27 | Owner completed OAuth client setup in Google Cloud Console (Teora project). Client ID + Secret added to Supabase Auth Providers. Verified via `curl https://pftseqzpzweqnwgtckoj.supabase.co/auth/v1/authorize?provider=google` → HTTP 302 redirect to accounts.google.com with correct client_id + redirect_uri. Both "Skip nonce checks" and "Allow users without an email" toggles left OFF (secure defaults). Frontend wiring done in same session — see AI Team Action Items (commit `cb48d5b`). |
| API Server build monorepo path | 2026-08-25 | setup-workspace.mjs + workspace plugin fix |
| CI/CD prebuilt pipeline | 2026-08-25 | deploy-backend.yml with artifact upload |
| UI/UX Design Audit | 2026-08-25 | 12/12 items complete, committed |
| E2E Testing | 2026-08-18 | 31/31 Playwright tests passing |
| CI/CD Pipeline | 2026-08-18 | ci.yml + deploy-backend.yml |
| PM2 ecosystem config | 2026-08-18 | ecosystem.config.cjs |
| useAuth VITE_MOCK bypass bug | 2026-08-18 | fetchMe now called in mock mode |
| Outdated docs | 2026-08-18 | system-design, coding-standards, decisions, lessons-learned |
| Frontend workspace deps (Vercel blocker) | 2026-08-23 | Refactored to standalone |

## Notes

When owner decides, AI updates this file and continues work automatically.

---

## 💬 AI Chat Bot di Dashboard — Konteks untuk Diskusi Mendatang (Deferred 2026-09-17)

**Owner feedback (2026-09-17):**
> "kita pernah diskusi tentang chat bot AI yg di dashboard dengan batasan2 tertentu, coba cek"
> "iya harusnya fitur itu untuk chat bot tapi ada batasan hanya tentang fitur teora saja, ai bisa cek semua data project yg pernah dilakukan user, bisa ngasih tutorial dll, tapi terbatas hanya untuk akun user itu saja, paham gk?"
> "gini aja wes, ini diskusi simpen dulu, kita akan diskusikan khusus untuk ini"

### Spec Existing

**`docs/ai-team/product/user-dashboard.md:610-620` (DECISION 016 — 2026-08-29):**

> ### AI Writing Tools → AI Assistant Shortcut
> - Hapus 4 cards (Thesis Outline, Task Helper, dll.)
> - Ganti 1 shortcut card besar:
>   ```
>   🤖 AI Assistant
>   Tanya apa saja tentang tugas, referensi, atau penulisan akademik
>   [ Mulai Chat ]
>   ```
> - Link: `/projects/new`
> - User pilih AI tier (Gratis / Standar / Premium / Ultra) **di dalam task workspace**, bukan di Dashboard
> - Reason: spec Dashboard poin "AI Assistant shortcut" bukan daftar tools, dan tier selection berada di scope task workspace

**Owner vision (2026-08-21, `diskusicodex.md:251`):**
> "Learning Companion, bukan chatbot biasa" — Agree. Navigation should be **goal-based**, not chat-menu.

**Design spec (`stitch-prmpt.md:365-368`):**
> [Teora Assistant Banner] — full-width gradient card
>   Left: Brain icon + "Teora Assistant" title + description
>   Right: "Mulai Chat" gradient button

### Batasan Chat Bot (per Owner 2026-09-17)

| Batasan | Detail |
|---------|--------|
| Topic scope | **Hanya fitur Teora** — cara pakai, tutorial, troubleshooting fitur |
| Data access | AI bisa baca **semua project user** (untuk saran kontekstual berdasarkan history) |
| Tutorial capability | Bisa kasih tutorial step-by-step cara pakai fitur Teora |
| Privacy | **Strict data isolation per akun** — AI hanya boleh akses data akun user itu sendiri, BUKAN data user lain |
| Identity | Personal AI assistant per-user, scoped ke Teora ecosystem |

### Status Code Saat Ini

- ✅ CTA card UI di dashboard: ada (Brain icon, "Teora Assistant", "Mulai Chat")
- ❌ AI Chat Bot standalone: **TIDAK ADA** (cek `artifacts/api-server/src/routes/` — tidak ada `assistant.ts` atau `chat.ts`)
- ❌ Route `/assistant`, `/chat`, `/ai`: **TIDAK ADA** (cek `App.tsx` route map)
- ⚠️ `/projects/new` saat ini adalah **form CREATE task**, BUKAN chat interface (spec DECISION 016 outdated/mismatch)
- ⚠️ `messages.ts` (chat endpoint) ada tapi **per-project scoped** (di dalam workspace task), bukan dashboard-level

### Implikasi Fix 2026-09-17

AI (opus-4-8) pagi ini salah tafsir bug report owner. Menyangka `/projects/new` adalah "leftover page", lalu mengubah CTA card copy dari "Teora Assistant / Mulai Chat / Tanya apa saja..." jadi "Mulai dengan Teora / Mulai Kerjakan / Mulai tugas singkat..." (verbatim dari `new-project.tsx` COPY.general). Production sudah di-deploy dengan copy baru (`dpl_C8ALCi9WyATgzWhcz3QGRfSokygg`).

**Owner feedback korektif:** "anda yg terburu2 untuk setup. apa urgensinya ada 'Mulai dengan Teora / Mulai tugas singkat...' di dashboard?" → Reveal bahwa copy baru salah referensi (harus DECISION 016 spec, bukan `new-project.tsx` COPY).

**Resolution:** Production reverted ke copy DECISION 016 original (`dpl_BDkxzhqw6bsJh5zNVv7HcWdew1da`, bundle `index-BwJHTZ4k.js`). Tidak ada perubahan net di production vs state 2026-09-17 14:21 (commit `4fd434e` SidebarFooter fix).

### Yang Perlu Diputuskan Owner (saat diskusi khusus)

1. **Apakah AI Chat Bot ini akan dibangun sebagai fitur baru?**
   - Jika YA: butuh spec lengkap (UI, backend endpoint, AI tier integration, privacy guardrails, project history context)
   - Jika TIDAK: hapus CTA card dari dashboard (sesuai spec DECISION 016 yang outdated)
2. **Route destination**: `/assistant`, `/chat`, atau tetap `/projects/new` dengan refactor form jadi chat-first?
3. **AI tier**: sama dengan task AI tier (Haiku/Sonnet mix) atau tier terpisah khusus Chat Bot?
4. **Project history context**: apakah AI retrieve semua project user via vector search atau query langsung ke DB?
5. **Privacy enforcement**: layer mana yang enforce data isolation (middleware, RLS, atau AI prompt guard)?

### Related Files untuk Diskusi

- `docs/ai-team/product/user-dashboard.md` Section "AI Assistant Shortcut"
- `diskusicodex.md` Section 6 "Respon terhadap Visi Owner"
- `stitch-prmpt.md:355-376` Section "PAGE 4: /dashboard"
- `.ai/decisions.md` DECISION 016 "User Dashboard — Menu Structure"
- `.ai/current-task.md` section "Dashboard Mislabeled CTA Fix (REVERTED 2026-09-17)"
- `.ai/error-index.md` ERR-024 (lesson on reaktif copy change)
