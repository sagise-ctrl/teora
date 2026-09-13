# Blockers
> Items waiting for owner decision. AI removes items when resolved.

## Pending Decisions

| Blocker | Priority | Owner Action | Urgency |
|---------|----------|--------------|---------|
| ~~Merge to main~~ | ✅ **Owner-approved 2026-08-28** | ~~Merge feat/tier-2-complete → main~~ | Trigger pipeline |
| ToS + Privacy Policy | P1 | Write or provide legal documents | Blokir Stripe integration |
| Payment provider | P1 | Decide on Stripe vs Xendit vs Midtrans | Revenue blocker |
| **Referral reward** | P1 | Fix referral reward — kita pernah diskusi tapi belum fix detail reward-nya | Perlu owner decision — discuss soon |
| **Maintenance model discussion** | P2 | Owner perlu pastikan AI team berjalan sesuai keinginan sebelum go-live | Discuss SETELAH semua fitur clear/selesai |
| **AUDIT 2026-09-05 — UU PDP Compliance** | P1 | Consent banner, data retention policy, right to deletion | Legal risk |
| **AUDIT 2026-09-05 — Free tier limits** | P1 | Definisi free tier: max projects, max tokens/day, max references | Token economy |

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
- `OWNER_EMAIL` ❓ NOT IN LIST — **needs verification 2026-09-08**. If unset, `requireOwner` middleware returns 403 for everyone (including owner). Default value per DECISION 014 = `sagiseainun@gmail.com`. Verify at https://vercel.com/dashboard → teora-backend → Settings → Environment Variables.

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
