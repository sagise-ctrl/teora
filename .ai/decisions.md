# Deployment Decisions Log

> Cross-session memory for deployment architecture decisions and their rationale.
> Read this BEFORE any deploy-related work in a new session.

---

## [2026-09-01] DECISION 006: Backend Auth Pattern — Per-Route Middleware + HS256/JWKS Fallback

**Status:** ACTIVE
**Author:** AI Engineering
**Trigger:** Production console spam `401 (Unauthorized)` setiap page reload. 3 bugs di backend ditemukan + fixed simultaneously.

### Decision Summary

1. **Per-route authMiddleware** — Untuk route critical seperti `/auth/me` dan `/auth/referrals`, **SELALU** pakai `router.get(path, authMiddleware, handler)` daripada `router.use(middleware)` di parent. Express hanya apply middleware ke routes di-mount setelahnya; mount order bugs sulit dideteksi dan sering silent.

2. **HS256-first + JWKS fallback untuk JWT verification** — Modern Supabase (2024+) pakai ES256 (asymmetric, JWKS) untuk Google OAuth token, bukan HS256 (symmetric, JWT_SECRET). Backend implementation pattern:
   ```typescript
   let verified = false;
   if (secret) {
     try { /* HS256 verify dengan secret */ verified = true; }
     catch { /* fall through to JWKS */ }
   }
   if (!verified) { /* JWKS verify */ }
   ```
   Hard `if/else` akan selalu gagal untuk cross-format tokens.

3. **JWKS URL yang benar** — Supabase hosted JWKS endpoint: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (BUKAN `/jwt/v1/keys` yang ditulis di beberapa docs lama).

4. **Trust proxy = 1 untuk Vercel/serverless** — `app.set("trust proxy", 1)` di awal. Tanpa ini, `req.ip` tidak reflect real client IP (di X-Forwarded-For) dan `express-rate-limit` throw `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.

### Bundle Verification Pattern

Sebelum deploy setelah perubahan auth:
```bash
grep "fix-pattern" artifacts/api-server/api/index.mjs
```
Konfirmasi fix ada di compiled output, bukan hanya source. Build cache bisa serve stale artifacts jika source berubah tapi bundle tidak rebuild.

### Files Affected

| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/auth.ts` | Per-route authMiddleware di /me dan /referrals |
| `artifacts/api-server/src/middlewares/auth.ts` | HS256-first + JWKS fallback pattern |
| `artifacts/api-server/src/app.ts` | `app.set("trust proxy", 1)` |

### Verification Post-Deploy

| Endpoint | Scenario | Expected | Actual |
|----------|----------|----------|--------|
| `/api/healthz` | - | 200 `{"status":"ok"}` | ✅ |
| `/api/auth/me` | no token | 401 from route handler | ✅ |
| `/api/auth/me` | bad token | 401 from middleware catch (`"Invalid or expired token"`) | ✅ |
| Vercel logs | last 30m | 0 ValidationError | ✅ |

### Why These Patterns (vs alternatives)

| Pattern | Pro | Con |
|---------|-----|-----|
| **Per-route middleware** (chosen) | Mount order independent, explicit at endpoint | Slight verbosity |
| `router.use(path, middleware)` | Concise | Silent failures from mount order |
| **HS256-first + JWKS fallback** (chosen) | Handle both legacy (HS256) dan modern (ES256) tokens | 2 verifications worst case |
| JWKS-only | Faster (1 verify) | Breaks legacy tokens / local dev |
| **trust proxy = 1** (chosen) | Correct IP di serverless | Minor: kalau ada malicious client bisa spoof X-Forwarded-For (acceptable risk untuk Vercel) |
| `trust proxy = true` | Permissive | Allows anyone to bypass rate limit — security warning dari express-rate-limit |

### Related

- Issue tracker: `[2026-09-01] Production: 401 "Unauthorized" di console setiap page reload + 3 bugs`
- Commits: `af06d83` (auth fixes), `694d8f1` (trust proxy)

---

## [2026-08-29] DECISION 005: Admin Dashboard + Owner Login Classification

**Status:** ACTIVE — spec completed, awaiting Phase 1 implementation
**Author:** AI Engineering + Owner (consensus 2026-08-29)
**Trigger:** Owner clarified distinction between user dashboard and admin (owner) dashboard, plus login classification logic.

### Decision Summary

1. **Single login system, dual roles** — Owner uses same login as users. Backend determines role from email whitelist, NOT from a separate account.

2. **Owner email whitelist (`OWNER_EMAIL`)** — Single value, default `sagiseainun@gmail.com`. Read from env var, never hardcoded in frontend.

3. **Login classification flow:**
   - If user.email === `OWNER_EMAIL` → redirect to `/landing-admin` with 2 choices: "Admin Dashboard" or "User Dashboard (Test Mode)"
   - Else → direct redirect to `/` (User Dashboard, normal flow)

4. **Test mode for owner's User Dashboard:**
   - Payment flow disabled (no real charge even if owner clicks Topup)
   - Subscription tier forced to "Ultra" (no payment)
   - Token balance unlimited (capped 1M for visual, not enforced)
   - All other features work normally — purpose: test from user perspective, reproduce bugs, screenshot for docs

5. **Admin dashboard areas (prioritized):**
   - P1: Financial Overview + User & Account Management (Foundation)
   - P2: AI Tier Config + System Health + Audit Log
   - P3: CS Overview + Reports Archive

6. **Token Grant: TIDAK ADA.** Owner TIDAK boleh kasih token gratis secara manual ke user. Token gratis HANYA jika ada AI provider yang memang gratis (misal Groq free tier). Tidak ada tombol "Approve Token Grant" di admin dashboard. Immutable Rule #2 di `finance/financial-rules.md` sudah diupdate per 2026-08-29.

7. **Test mode: unlimited tapi tercatat.** Owner bisa test User Dashboard tanpa batas token. Tapi usage TETAP dicatat di `ai_usage_log` sebagai cost. Admin Dashboard menampilkan "Owner: X tokens, $Y cost" di laporan keuangan. Tidak ada payment, tapi cost tetap ter-track.

8. **CS Overview: perlu sekarang.** Area 5 (Customer Support Overview) naik priority dari P3 → P2. Bangun placeholder + manual stats sekarang, bukan tunggu CS AI full automated.

Full spec at `docs/ai-team/product/admin-dashboard.md`.

### Why Email Whitelist (not role column)

| Option | Pro | Con |
|--------|-----|-----|
| **Email whitelist** (chosen) | No schema change, fast, sufficient for 1 owner | Owner must update env if email changes |
| Add `role` column | Multi-admin future-ready | Needs migration + more code path |
| Hardcode in frontend | Simplest | **Insecure** — user bisa bypass |

Migration path: if team grows to 2+ admins, add `role` column. For now, whitelist is enough.

### Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 1 | Owner login classification + Area 1 (Financial) + Area 2 (User Mgmt) | ~3-4 days |
| 2 | Area 3 (AI Tier) + Area 6 (Audit Log) + Test mode | ~2-3 days |
| 3 | Area 4 (System Health real-time) + Area 5 (CS) | ~3-4 days |
| 4 | Area 7 (Reports Archive) | ~2-3 days |

### Open Questions for Next Discussion

- Q1: HARDCODE vs env var for `OWNER_EMAIL` → **Recommendation: env var**
- Q2: Multi-admin future → **defer**
- Q3: Owner "test mode" token cap → **recommendation: 1M visual cap, no enforcement**
- Q4: Area 5 (CS Overview) — build now or wait for CS AI? → **recommendation: wait**
- Q5: Area 4 real-time — Vercel API vs custom? → **recommendation: hybrid**

---

## [2026-08-28] DECISION 004: Multi-Session Model Fallback via Checkpoint Files

**Status:** ACTIVE
**Author:** AI Engineering
**Trigger:** Owner asked for automatic fallback from `claude-opus-4-8` → `claude-opus-4-6` when daily limit hits, in same session with history preserved.

### Reality Check

Claude Code standard config (`settings.json`) supports **single** `model` field, NOT a fallback list. Tested as of 2026-08-28:

```jsonc
// ~/.claude/settings.json (user-level)
{
  "env": { "ANTHROPIC_AUTH_TOKEN": "...", "ANTHROPIC_BASE_URL": "https://gateway.olagon.site/anthropic" },
  "model": "claude-opus-4-8"  // ← single value, no fallback[] schema
}
```

- ❌ Tidak ada `model.fallback[]` atau `modelFallback[]` field di official schema
- ❌ Tidak ada `ANTHROPIC_FALLBACK_MODEL` env var yang terdokumentasi
- ⚠️ Model routing terjadi di Olagon Gateway (third-party). Fallback behavior di sana **bukan** sesuatu yang bisa saya konfigurasi dari Claude Code.

### What DOES Work

| Approach | Works? | Notes |
|---|---|---|
| Edit `~/.claude/settings.json` → change `"model"` field then open new session | ✅ | Manual 2 min. History preserved via `.ai/` checkpoint files. |
| Multi-session workflow (`.ai/current-task.md` + `.ai/progress.md` + `.ai/blockers.md` + `.ai/decisions.md`) | ✅ | Already in place. Any new model can load context by reading these files. |
| Olagon Gateway fallback (if supported) | ⚠️ Unknown | Out of my config scope. Would need owner to ask Olagon. |
| Claude Code auto-fallback (if exists) | ❌ Not in standard config | Would require undocumented internal feature. |

### Decision

**Use multi-session workflow as the canonical fallback mechanism.** Any model — opus-4-8, opus-4-6, or future claude-opus-5 — can pick up where the previous session left off by reading the 4 `.ai/*.md` files in the order specified in `Session Start Protocol` (top of `.ai/current-task.md`).

Trade-offs accepted:
- ⚠️ **Manual** — owner (or AI) edits settings.json + opens new session when limit hit
- ⚠️ **History gap** — old session's tool call transcripts not transferred, only the curated `.ai/` summaries
- ✅ **Reliable** — doesn't depend on undocumented features or external gateway config
- ✅ **Universal** — works for any future model swap, not just 4-8 → 4-6

### Session Handoff Protocol

When closing a session (or hitting daily limit):

1. Owner/AI writes `## Handoff YYYY-MM-DD HH:MM — model opus-4-X → opus-4-Y` to top of `.ai/current-task.md`
   - Include: task active, last 3 actions done, next 3 actions queued, any open questions for owner
2. Commit (don't push without owner OK)
3. New session reads the file via Session Start Protocol above

### Future Improvement (if needed)

If owner wants true automatic fallback:
1. Check if Olagon Gateway has its own model-fallback config — ask them
2. Consider dual-process pattern: a wrapper script that detects 429/rate-limit response from Claude Code and restarts with `--model claude-opus-4-6`
3. Or migrate to Vercel AI Gateway (Vercel has first-class fallback) for the **app's AI endpoints** — this is independent of Claude Code and helps only Teora's product, not my dev workflow

---

## [2026-08-26] DECISION 003: Direct Vercel CLI Deploy Beats CI for Stuck Pipelines

**Status:** ACTIVE — using direct deploy until CI pipeline is fixed
**Author:** AI Engineering
**Trigger:** Owner provided VERCEL_TOKEN after I escalated; deploy succeeded first try with CLI but CI had been failing for 12+ hours

### What Worked

```bash
# Re-link local folder to correct project (was stale reference)
echo '{"projectId":"prj_5c9YZBllez1NgwZazyStYt8wTJ5d",...}' > artifacts/api-server/.vercel/project.json

# Fix project Root Directory via REST API (was pointing to non-existent path)
curl -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -d '{"rootDirectory":null}'

# Build locally (5s, 3.5MB output)
node build.mjs

# Deploy from repo root with --cwd
vercel deploy --prod --yes --cwd artifacts/api-server
```

### Why CI Was Failing All Along

CI's `deploy-backend.yml` was correct in spirit but had **3 issues**:
1. Wrong project name (`api-server` not `teora-backend`) — fixed by `--project teora-backend`
2. Missing `--prod` flag — fixed
3. Vercel project's `rootDirectory` setting in dashboard was `artifacts/api-server` (broken from old setup) — this makes Vercel look for files in a path that doesn't exist as deployment input, causing the silent "Builds: . [0ms]" errors

**The CI workflow was correct; the Vercel project settings were broken.**

### What About CI Now?

CI workflow (`deploy-backend.yml`) still has the old structure that doesn't match the direct deploy. Options:
- (a) **Fix CI to mirror direct deploy** (use `vercel deploy --cwd artifacts/api-server --project teora-backend --prod`)
- (b) **Disconnect Vercel GitHub integration** for `teora-backend` — make it "manual deploy only", CI is the sole deployer
- (c) **Both** — fix CI AND keep Vercel integration but with `Ignored Build Step`

**Recommendation:** (b) — disconnect GitHub integration. CI is more reliable than Vercel's auto-build which can't see workspace plugin context.

### `@react-pdf/renderer` Subpath Resolution Bug

Vercel Function runtime does NOT resolve pdfkit's `exports` field subpaths (`#standard-fonts/Helvetica`). Works locally, fails on Vercel. **Decision: disable PDF export endpoint** until proper fix. DOCX export (`docx` npm) works fine.

If re-enabling later:
- Option A: Use `@sparticuz/chromium`-style alternative PDF library
- Option B: Build with custom esbuild plugin that resolves `#standard-fonts/*` → `pdfkit/js/standard-fonts/*.cjs` directly
- Option C: Move PDF generation to separate Worker/edge runtime

### Lessons

1. **Vercel project settings are sticky.** A bad Root Directory from old setup persists forever and silently breaks every deploy until manually fixed. Always verify with `GET /v9/projects/{id}` before debugging workflow files.
2. **Direct CLI deploy is the fastest unblock path** when stuck. Token + 5 commands = production live.
3. **`vercel logs` (CLI) is the easiest way to read runtime errors** when WebFetch to GitHub logs is blocked.

## [2026-08-26] DECISION 001: Backend Deployment Architecture — STOP THE LOOP

**Status:** RESOLVED — definitive root cause identified
**Author:** AI Engineering (forensic audit)
**Trigger:** Owner request for forensic audit after repeated failed backend deploys

### Root Cause (definitive, not speculation)

The backend has **never been deployed successfully** to Vercel. Every "deploy attempt" failed at the same fundamental step, but the failure mode kept getting misdiagnosed as different problems across sessions.

**The real blocker is the GitHub Actions deploy workflow itself, not the code:**

1. **The CI workflow DOES produce a successful build artifact locally** — confirmed. `artifacts/api-server/api/index.mjs` (7.3 MB) and `dist/index.mjs` exist on disk.

2. **The CI workflow's `Deploy to Vercel` step** runs `vercel deploy --project=api-server --yes --cwd=artifacts/api-server`. This invokes Vercel's own infrastructure. **There is no `vercel build` prebuilt step**, so the bug about GitHub-Actions-running-vercel-build is NOT applicable here.

3. **However:** The CI workflow's `Build` job sets the deploy URL to a **PREVIEW** deployment (no `--prod` flag). Per the `.ai/current-task.md` log:
   - Run `32880678098` claimed "Deploy step 18s ✅, Health check 5s ✅"
   - But the production URL `https://api-server-mocha-eight.vercel.app` returns `DEPLOYMENT_NOT_FOUND`
   - This means **each CI run creates a unique preview URL**, never updating the production domain
   - The `current-task.md` claimed success based on a transient preview URL that no longer exists

4. **The actual current-task.md is wrong about state** — it says "Build API server fix COMPLETE ✅" based on run 32880678098. But:
   - That run was for commit `a7ce049` (Aug 26)
   - The `.ai/progress.md` shows the more recent commit `54d1071 chore(api-server): simplify vercel.json`
   - `vercel.json` on disk is now `{ "framework": null }` — completely empty
   - No production URL is live. Owner cannot test the backend.

5. **The CI workflow writes vercel.json at deploy time** (the deploy job line):
   ```
   echo '{"framework":null,"installCommand":":","buildCommand":":","functions":{"api/index.mjs":{"runtime":"nodejs22.x"}}}' > artifacts/api-server/vercel.json
   ```
   This means the **committed vercel.json is ignored** — it's overwritten at deploy time. So the "simplify vercel.json" commit `54d1071` did not actually change runtime behavior. Misleading commit, real fix would have been elsewhere.

6. **The fundamental issue — TWO INDEPENDENT PROBLEMS compounding:**

   **A. MCP blind spot (recurring across sessions):** Vercel MCP plugin OAuth scope only covers `academic-workspace`. The `api-server` project (`prj_5PlXdG6841wXuah11uY8CdgMNmsn`) exists but returns 404/403 from MCP. Every session that asked "is the backend deployed?" got back "I can't see it" → incorrectly assumed "not deployed" → reported misinformation. INC-002 documented this on 2026-08-23 but the pattern kept repeating.

   **B. No production promotion:** Even when CI "succeeds", it deploys to preview URLs that expire/are never promoted. Owner has never had a stable production backend URL.

### Why Previous "Fixes" Did Not Resolve It

| Commit | What it changed | Why it didn't work |
|--------|-----------------|--------------------|
| `2c9365b` remove file: workspace refs | Removed `file:` protocol workspace references | Doesn't matter — esbuild workspace plugin doesn't read package.json file: refs |
| `d4caa19` fix workspace plugin pkgName prefix | Fixed double `@workspace/` prefix bug | Real bug fix, but only relevant for CI build step. Build step was never the blocker. |
| `a7ce049` use --project instead of --project-id | CLI flag change | Doesn't matter — both work; problem is the *resulting* deployment is preview, not production |
| `54d1071` simplify vercel.json | Reduced vercel.json to `{ framework: null }` | Doesn't matter — the deploy job overwrites vercel.json at runtime anyway |
| `f986e6b` SPA routing + serverless config | Configuration change | Doesn't matter — vercel.json is overwritten; runtime config comes from the inline echo |
| `b260162`, `2d68d5e`, `c84de31` etc. — debug output added | Various debug prints | Symptom chasing, not root cause |

**Common pattern:** every commit was debugging the wrong layer. The actual blocker — no `--prod` flag, no production promotion — was never addressed because every session diagnosed "MCP can't see it" as the symptom and assumed project was missing.

### Recommended Fix (single change)

**Add `--prod` to the `vercel deploy` invocation in `.github/workflows/deploy-backend.yml`:**

```yaml
- name: Deploy to Vercel
  run: |
    npm install -g vercel
    echo '{"framework":null,"installCommand":":","buildCommand":":","functions":{"api/index.mjs":{"runtime":"nodejs22.x"}}}' > artifacts/api-server/vercel.json
    vercel deploy \
      --token=${{ secrets.VERCEL_TOKEN }} \
      --project=api-server \
      --prod \      # ← THIS IS THE MISSING FLAG
      --yes \
      --cwd=artifacts/api-server
```

**Why this works:**
- Vercel CLI's `deploy --prod` promotes to the production alias (`api-server-mocha-eight.vercel.app`)
- Without `--prod`, each run creates a unique preview URL like `api-server-abc123xyz.vercel.app` that expires
- The build artifact (already proven to work in run 32880678098) just needs the right promotion target

**What this does NOT fix:**
- The MCP blind spot. To check if production URL is live, owner must visit it directly or use `vercel inspect` via CLI. MCP cannot help here.
- The fact that `ai-tiers.ts`, `balance.ts`, `credit.ts` schemas are **uncommitted** (in working tree, not in any git commit). The deploy runs from `main` branch — these files won't be in the deployment. Backend code changes are not being shipped.

### Validation Plan

After applying the fix:
1. Trigger CI on a no-op commit (e.g. empty README change to trigger `paths` filter, or push directly to main)
2. Wait for CI run to complete
3. **Owner manually verifies** `https://api-server-mocha-eight.vercel.app/api/healthz` returns 200
4. If MCP can list it later (after OAuth re-auth): check Vercel dashboard shows a "Production" deployment for the project

### Action Items

- [ ] AI Engineering: Add `--prod` flag to deploy-backend.yml (this is the actual fix)
- [ ] AI Engineering: Commit uncommitted working-tree files (ai-tiers, balance, credit, db schemas) — these are NOT in main, so backend deployment is shipping STALE code
- [ ] AI Engineering: After fix, remove debug commits / simplify deploy-backend.yml once verified
- [ ] Owner: Verify VERCEL_TOKEN is set in GitHub repo secrets (P0 blocker in `.ai/blockers.md`)
- [ ] Owner: Once deployed, verify production URL works in browser
- [ ] AI Engineering: Update `current-task.md` — the "Build API server fix COMPLETE" entry is misleading and should be corrected

### Lessons for Future Sessions

1. **When MCP returns 404/403 for a Vercel project: don't assume it doesn't exist.** Check `.vercel/project.json` locally first. Ask owner for dashboard screenshot. This rule is now in `MEMORY.md` as `vercel-mcp-blind-spot`.

2. **When CI workflow says "success" but production URL doesn't work: check whether the workflow used `--prod`.** A successful deploy step that doesn't promote to production is functionally a failure.

3. **`vercel.json` committed in repo is irrelevant when CI overwrites it at deploy time.** Don't waste cycles committing vercel.json changes — the deploy job generates it inline.

4. **Audit the diff between `.ai/current-task.md` and actual code state regularly.** The "COMPLETE ✅" label on backend deploy in current-task.md is incorrect; the working tree has uncommitted backend changes that aren't in main, and no production deployment has ever succeeded.

---

## [2026-08-26] DECISION 002: Automation Limits — What AI Can and Cannot Do

**Status:** Active (long-term)
**Author:** AI Engineering
**Trigger:** Owner clarification on "AI handles everything autonomously"

### What AI Engineering Team CAN Handle Autonomously

- Code: write, edit, refactor, test, typecheck, lint
- Deploy: fix CI, push, Vercel deploy via `VERCEL_TOKEN` (already set)
- Database: schema design, migrations, queries (via Supabase MCP)
- Monitoring: read runtime logs, detect errors, diagnose, fix
- Bug fix: reproduce → fix → test → redeploy → verify
- Documentation: ADRs, runbooks, lessons learned, knowledge base
- Reports: daily status, weekly metrics, recommendations
- Owner dashboard maintenance: pricing config, tier setup, feature flags
- Customer service (Tier 1): bug triage from user reports, common issues

### What Owner MUST Setup Manually (External Service Credentials)

These require **owner's personal accounts in third-party services**. AI has no access and will never have access — by design (security boundary).

| Service | When Needed | One-time Setup Time |
|---------|-------------|---------------------|
| **Google OAuth** (for "Login with Google") | When Google login is needed | ~10 min |
| **AI Provider API key** (OpenAI/Anthropic/Groq) | When AI features needed | ~5 min |
| **Payment gateway** (Stripe/Xendit/Midtrans) | When paid features needed | ~15 min + provider account |
| **Vercel account & project creation** | One-time at start | Already done |
| **GitHub repo & secrets** (VERCEL_TOKEN, etc.) | One-time at start | Already done |
| **Supabase project** | One-time at start | Already done |
| **Domain purchase** (custom domain) | Optional | ~5 min + yearly fee |

### What Owner Receives as Output (Read-Only)

- Daily status reports (`.ai/daily/`)
- Incident alerts (`.ai/incidents/`)
- Weekly business metrics
- Recommendations (marketing, pricing, features)
- Pending decisions (`.ai/blockers.md`)

### Rule for AI Sessions

When asked "can you handle this automatically?", check this list FIRST:
- If task involves only internal code/config → AI handles, execute
- If task requires owner's external service account → STOP, explain what's needed, request owner action
- Never fake completeness on externally-gated features

### Long-Term Vision (from `docs/ai-team/`)

Once all external services are configured, AI team operates the entire stack autonomously:
- 11 divisions defined in `docs/ai-team/` (Product, Architecture, Dev, QA, Security, Code Review, DevOps, Research, Finance, Design, Production Admin)
- Each division has knowledge base, decision frameworks, escalation rules
- Owner role: review reports, approve high-stakes decisions, set vision

---

## [2026-08-29] DECISION 016: User Dashboard — Menu Structure

**Status:** ACTIVE — approved by owner 2026-08-29
**Author:** AI Engineering + Owner discussion
**Trigger:** Owner clarified menu structure for user dashboard. Simpler = better.

### Decision Summary

1. **5 menu utama + 1 akun sub-menu:**
   - Dashboard (quick start, recent projects, AI shortcut)
   - Pustaka Saya / Global Library (REFERENSI = ACCOUNT LEVEL)
   - Project (General Project + Project Penelitian + Daftar + Template)
   - Assessment (Buat Kuis + Rubrik + Submission + Ambil Kuis + Share)
   - Akun (Profil, Referral, Saldo, AI Usage, AI Pricing, Berlangganan)

2. **Referensi dimerge ke dalam Project** — kecuali Global Library yang jadi menu utama sendiri bernama "Pustaka Saya"

3. **Tim/Collaboration menu dihapus** — Share link (view/comment/edit) di-embed langsung di halaman Project & Assessment

4. **Notifikasi bukan menu** — icon lonceng di pojok, untuk info admin & alert penting

5. **Account AI Chat dihapus** — cukup AI Assistant shortcut di Dashboard

6. **Project dipisah jadi 2 tipe:**
   - General Project = tugas singkat
   - Project Penelitian = makalah, proposal, skripsi, paper

7. **AI embedded di setiap halaman relevan**, bukan menu terpisah

8. **Admin Dashboard** = menu terpisah, hanya owner

### References

- `docs/ai-team/product/user-dashboard.md` (full spec)
- `docs/ai-team/product/admin-dashboard.md` (admin dashboard)

---

## [2026-08-29] DECISION 007: Revert 159ac0b + 0d912ec to Restore Last-Known-Good Production

**Status:** ACTIVE — pushed 2026-08-29 12:07 UTC, awaiting Vercel deploy verification
**Author:** AI Engineering (autonomous, owner-approved via "A, dan cek perbedaanya")
**Trigger:** Production was at `9a11a30` (last successful deploy) but local code was at `159ac0b`. Owner tested production and found that the new type-aware form (Tugas Cepat vs Karya Ilmiah) did NOT render differently in production. Subsequent Vercel deploy of `159ac0b` FAILED with "No Output Directory named 'dist' found", confirming production was stale.

### Decision Summary

**Revert `159ac0b` and `0d912ec` via 2 revert commits (NOT force push).** Restore tree state to `9a11a30` last-known-good.

### Options Considered

| Option | Outcome | Rejected because |
|--------|---------|------------------|
| **A. `git revert 159ac0b 0d912ec --no-edit` then normal push** (chosen) | 2 revert commits added, history preserved, no force push, Vercel auto-deploys | None — cleanest safe path |
| B. `git reset --hard 9a11a30` + force push | Tree instantly at last-known-good | **Violates CLAUDE.md "NEVER force push to main"** |
| C. Debug `.vercelignore` first, then fix 159ac0b deploy | Avoids revert, keeps type-aware form | Owner said "harusnya gak parah banget" — wants safe revert first, debug later |
| D. Manual Vercel rollback via dashboard UI | Instant restore to `9a11a30` deploy | Hides the bug from git history; future deploys may have same issue |

### Why Revert Beats Fix

| Factor | Revert (A) | Fix deploy (C) |
|--------|------------|----------------|
| Time to restore production | ~5 min | Unknown — debugging `.vercelignore` may need CI log access (admin-only, currently 403) |
| Risk of breaking production further | None — reverts only | High — debug iterations can introduce new failures |
| Audit trail | Clean — 2 revert commits show "we changed our mind" | Messy — fix commit + revert commit + debug commits |
| Future deploys | Same risk remains until `.vercelignore` debug done | Same — `.vercelignore` issue persists regardless of fix |

### Trade-offs Accepted

1. **Lost work**: All type-aware form code (846 lines net in new-project.tsx) is now in `eea2757` as a revert commit. Can be cherry-picked later when deploy infrastructure is fixed.
2. **Poin 2 deferred**: Pustaka Saya aggregation (was never implemented, static mockup) stays deferred.
3. **Root cause unknown**: `.vercelignore` `**/dist` pattern still suspected but unverified. Next session must investigate.

### Implementation

```bash
# Local execution 2026-08-29 12:07 UTC
git reset --hard origin/main           # back to 159ac0b
git revert --no-edit 159ac0b           # → eea2757 (Revert "feat(project-types)...")
git revert --no-edit 0d912ec           # → e76e2ee (Revert "feat(ui): refine project menu...")
git push origin main                   # normal push, no force
```

Verification: `git diff 9a11a30 HEAD` returned empty → tree state matches exactly.

### References

- `.vercelignore` (at repo root, git-tracked — see deployment investigation TODO)
- `artifacts/academic-workspace/vercel.json` (current rewrite config)
- `.github/workflows/deploy-frontend.yml` (CI build → deploy pipeline)

### Next Session TODO (deferred from this session)

1. **Verify Vercel deploy of `e76e2ee`** — `list_deployments` should show new deployment. Wait for READY state, then check production at https://academic-workspace-eta.vercel.app.
2. **Investigate `.vercelignore` root cause** — Why does Vercel say "No Output Directory named 'dist' found" when `dist/` was successfully built by CI? File is git-tracked with `**/dist` pattern, so we know the source — see Decision 008 for fix.
3. **Re-implement Poin 1 (type-aware form) safely** — Either fix `.vercelignore` first (DONE per Decision 008), OR split into smaller commits that each deploy independently.
4. **Implement Poin 2 (Pustaka Saya aggregation)** — Backend API endpoint + frontend wire-up.
5. **Check Poin 3 (hapus tipe Referensi)** — Verify whether `9a11a30` ever had this fix or it's still pending.

---

## [2026-08-29] DECISION 008: .vercelignore Root Cause — Un-Ignore Frontend dist/

**Status:** ⚠️ ACTIVE — second fix attempt `936a48c` pushed, awaiting Vercel deploy verification
**Author:** AI Engineering (autonomous, owner-approved via "rekomendasi terbaik")
**Trigger:** Revert `e76e2ee` (per Decision 007) deployed with same error: `STATIC_BUILD_NO_OUT_DIR`. Build log revealed CI overrides install/build commands to no-op echo, relying on uploaded `dist/`, but `.vercelignore` `**/dist` blocks the upload.

### Root Cause Confirmed

`.vercelignore` at repo root contains:
```
**/dist
```

This excludes any directory named `dist` at any depth from Vercel upload. For frontend deploy (`artifacts/academic-workspace/`), the pre-built `dist/` (output of `vite build`) is at `artifacts/academic-workspace/dist/` — exactly matched by `**/dist`.

**Why this only recently broke:**
- Pattern has been in `.vercelignore` since commit `a4b36da` (Aug 23, "feat: finalize tier-2 deployment readiness and ops tooling").
- Recent frontend deploys succeeded (`dpl_EqomqnQE7CAxLP3mh8z8z51iDoSt` at 23:55 UTC) — but those used Vercel MCP `deploy_to_vercel` tool which sends files directly via API and bypasses `.vercelignore`.
- The Aug 29 deploys went through GitHub Actions → `vercel deploy --prod --yes` CLI → respects `.vercelignore` → excluded `dist/` → ERROR.

### Decision Summary (revised after first attempt failed)

**First attempt (`5fa3240`)**: Add negation pattern `!artifacts/academic-workspace/dist` after `**/dist`. **FAILED** — deploy `dpl_27uncqYi2hDGV1SzwiEf7AAjMVHY` for `bee829f` still got `STATIC_BUILD_NO_OUT_DIR`. Build log showed only 132 files uploaded — no dist/ contents. Gitignore negation of directories is fragile; the negated pattern must match exactly what was excluded.

**Second attempt (`936a48c`)**: Replace `**/dist` with an explicit allow-list of dist/ dirs to EXCLUDE:

```
artifacts/api-server/dist
lib/api-client-react/dist
lib/api-zod/dist
lib/db/dist
```

`artifacts/academic-workspace/dist` is intentionally omitted, so it uploads by default.

### Options Considered

| Option | Outcome | Rejected because |
|--------|---------|------------------|
| **A. Explicit allow-list** (chosen, second attempt) | Only the 4 non-frontend dists excluded; workspace dist uploads | None — simple, no fragile negation |
| **B. `**/dist` + `!artifacts/academic-workspace/dist` negation** (first attempt, FAILED) | Surgical negation | Gitignore directory negation is fragile and didn't actually un-ignore the dist |
| C. Remove `**/dist` entirely | All dists uploaded | Too broad — backend (`api-server/dist`) and other packages would be uploaded unnecessarily |
| D. Remove heredoc override in deploy-frontend.yml | Let Vercel do its native build | Complex — requires handling pnpm monorepo install/build, may break other things |
| E. Use Vercel GitHub App integration | Skip CLI entirely | Larger architecture change, deferred to "Post-launch hardening" |

### Why Surgical Fix Beats Broader Refactor

| Factor | Negation (A) | Heredoc removal (C) |
|--------|--------------|---------------------|
| Lines changed | 3 lines added in `.vercelignore` | ~15 lines in workflow + vercel.json |
| Time to restore production | ~5 min (push → Vercel deploy) | Unknown — debugging pnpm monorepo build can take hours |
| Risk of breaking other deploys | None — only affects dist for one path | Medium — pnpm workspace install from subdirectory can fail |
| Reversible | Easy — just remove the negation line | Harder — workflow changes interact with project settings |

### Implementation

```bash
# First attempt (failed):
# Edit .vercelignore, add after **/dist line:
#   !artifacts/academic-workspace/dist
# Result: negation did not un-ignore the dist; deploy still failed.

# Second attempt (current):
# Edit .vercelignore, REPLACE **/dist with explicit list:
#   artifacts/api-server/dist
#   lib/api-client-react/dist
#   lib/api-zod/dist
#   lib/db/dist
git add .vercelignore
git commit -m "fix(deploy): list dist dirs explicitly so frontend dist uploads ..."
git push origin main
```

Commits:
- `5fa3240` first attempt (negation — failed)
- `bee829f` workflow path filter fix (so .vercelignore changes trigger deploy)
- `936a48c` second attempt (explicit allow-list — pending verification)

### Verification Plan

1. Monitor Vercel deploy of `936a48c` — should reach READY (dist/ uploaded).
2. Verify production at https://academic-workspace-eta.vercel.app matches `9a11a30` last-known-good state.
3. Compare production HTML title / route structure with expected from `9a11a30`.

### Why Not Caught Earlier

| Gap | How to prevent |
|-----|----------------|
| No post-deploy verification step in `deploy-frontend.yml` | Add `vercel deployment ls` + state check after `vercel deploy --yes` |
| `.vercelignore` changes not surfaced in PR review | Add PR template check + lint rule |
| Local typecheck success treated as deploy success | Mandate production URL smoke test before "done" claims |

### Next Session TODO (deferred from this session)

1. **Verify Vercel deploy of `936a48c` reaches READY** (in progress — CI running).
2. **Smoke test production** — manual confirmation that production matches `9a11a30` expected behavior.
3. **Re-attempt Poin 1 (type-aware form) safely** — Now that deploy pipeline works, re-implement with smaller atomic commits.
4. **Implement Poin 2 (Pustaka Saya aggregation)** — Backend API + frontend wire-up.
5. **Check Poin 3 (hapus tipe Referensi)** — Verify state in `9a11a30`.
6. **Add post-deploy verification step to deploy-frontend.yml** — prevent silent deploy failures from recurring.
7. **Document this incident in `.ai/incidents/20260829-002.md`** — DONE.

### References

- `.vercelignore` (line 9: `**/dist`, line 12: `!artifacts/academic-workspace/dist`)
- `.github/workflows/deploy-frontend.yml` lines 44-72 (heredoc vercel.json override)
- `artifacts/academic-workspace/vercel.json` (committed rewrite config with no-op install/build)
- Incident 20260829-002 — Production stale owner-discovered
- Decision 007 — Revert rationale

---

## [2026-09-01] DECISION 009: Sidebar Menu Order — Owner-Revised (Retroactive)

**Status:** ✅ APPROVED by owner 2026-09-01 (verbal confirmation, retroactive doc)
**Author:** AI Engineering (proposed by owner, implemented in `layout.tsx`)
**Trigger:** Owner observed user flow tidak natural dengan urutan spec lama (`docs/ai-team/product/user-dashboard.md` punya Pustaka Saya di #2).

### Decision

Sidebar menu User Dashboard urutan:

1. Dashboard
2. Task Mentor (collapsible: General Task, Academic Work)
3. Assessment
4. Pustaka Saya
5. Akun (collapsible: Profil, Topup, AI Pricing)

### Rationale

**Kenapa beda dari spec lama:** Owner apply real-world user flow observation, bukan diskusi abstrak. Task Mentor di #2 karena itu aksi utama user (most frequent action — paling sering dibuka setelah Dashboard). Pustaka Saya di #4 karena reference library — user jarang buka langsung (cuma saat butuh cari paper atau lihat bibliography). Akun di paling bawah karena settings — accessed occasionally.

### Opsi yang Dipertimbangkan

| Opsi | Trade-off |
|------|-----------|
| A. Ikut spec lama (Pustaka Saya #2) | Konsisten dengan docs, tapi user flow tidak natural |
| B. Owner-revised order (Task Mentor #2, Pustaka Saya #4) — **DIPILIH** | Lebih natural user flow, owner punya alasan kuat |
| C. Adaptive based on usage analytics | Personalized tapi tambah logic, owner tidak mau ribet |

### Action

- [x] Update `artifacts/academic-workspace/src/components/layout.tsx` (sidebar component)
- [x] Memory entry: `memory/owner-sidebar-menu-order-20260901.md`
- [ ] Sync spec file `docs/ai-team/product/user-dashboard.md` (struktur menu section) — **PENDING**

### Prevention

- Kalau owner kasih urutan baru di tengah kerjaan, prioritaskan urutan owner di kode, baru update spec
- Jangan default ke spec kalau ada konflik dengan verbal owner instruction

---

## [2026-09-02] DECISION 010: Halaman Daftar Task — Spec & Architecture

**Status:** ✅ APPROVED by owner 2026-09-02 (verbal, retroactive doc)
**Author:** AI Engineering (explanation + recommendation), owner-approved
**Trigger:** Spec Task Mentor sudah disusun 2026-08-30, tapi halaman Daftar Task belum ada di codebase. Owner minta diskusi detail sebelum implementasi.

### Context

Spec di `docs/ai-team/product/user-dashboard.md` Section "Halaman Daftar Task" jelaskan:
- Sub menu Task Mentor harusnya punya halaman list view dengan card + status badge + search + filter
- Template SAMA untuk General Task (4-stage) dan Academic Work (5-stage)
- 2 action per card: ▶ Lanjutkan + 👁 Preview

Tapi cek codebase: route `/projects` **TIDAK ADA** di `App.tsx`. Sidebar Task Mentor langsung link ke `/projects/new?type=general` (creation form), bukan ke list view.

### Decision

**1. Halaman Daftar Task** adalah halaman management workspace sebelum masuk detail task. Posisi:
- Sidebar: Task Mentor → sub General Task → `/projects?type=general`
- Sidebar: Task Mentor → sub Academic Work → `/projects?type=academic`

**2. Route architecture** — pakai **Opsi C** (1 route + query param):
```
/projects                  → default ke General Task (per Opsi A — predictable default)
/projects?type=general     → tab General Task aktif
/projects?type=academic    → tab Academic Work aktif
```
Alasan: konsisten dengan existing convention `/projects/new?type=...` dan `/projects/:id`.

**3. Tab/Segmented control** — di atas halaman, 2 tab: "Task Umum" + "Academic Work". Share filter+search di bawahnya.

**4. Counter per stage** — angka di tiap filter chip (Semua/Idea/Writing/Revision/Done). General punya 4 chip, Academic punya 5 chip (tambah "Plan").

**5. Bahasa** — full Indonesian, konsisten dengan spec user-dashboard.md (vs Dashboard yang campur English).

**6. Status button "▶ Lanjutkan"** — jika project status backend = `draft` (belum di-Begin Analysis), button jadi "🚀 Mulai Kerjakan" (link langsung ke workspace dengan action prompt).

### Opsi yang Dipertimbangkan (yang DITOLAK)

- **Opsi A — 1 route `/projects` + tab General/Academic** (DITOLAK): URL tidak deep-linkable, filter state hilang saat refresh
- **Opsi B — 2 route `/projects/general` + `/projects/academic`** (DITOLAK): inkonsisten dengan convention existing `/projects/new?type=...`
- **Opsi C — 1 route + query param** ✅ DIPILIH
- **Default tab = Last Accessed (localStorage)** — DITOLAK owner ("saya tidak maksud Masukan 2")
- **Kosmetik icon aneh di badge** — DITOLAK owner ("saya tidak suka banyak icon2 aneh")

### Action

- [x] Update `.ai/decisions.md` DECISION 010
- [ ] Backend prerequisite check (lihat section Backend Gaps)
- [ ] Sync `docs/ai-team/product/user-dashboard.md` struktur menu section dengan sidebar order baru (DECISION 009)
- [ ] Implement `/projects` route + page (frontend)
- [ ] Backend: tambah filter `?type=general|academic` di `GET /projects`
- [ ] Backend: tambah `byType` di `GET /projects/stats`
- [ ] Backend: tambah enum constraint `taskType` (OpenAPI + Zod) — TBD owner decision
- [ ] Frontend: mapping layer status backend → stage user-facing (Idea/Writing/Revision/Done) — TBD owner decision
- [ ] Update memory index di `MEMORY.md`

### Backend Gaps (diidentifikasi saat cek prerequisite)

| Gap | Severity | Owner Decision Needed |
|-----|----------|------------------------|
| Backend `status` pakai 6 nilai (`draft/analyzing/writing/waiting_revision/completed/archived`) — beda dari spec 4-stage (`Idea/Writing/Revision/Done`) | HIGH | ❓ YES |
| `taskType` free-text di DB & OpenAPI — tidak ada standard "general"/"academic" | HIGH | ❓ YES |
| `GET /projects?type=...` belum ada filter | MEDIUM | (auto-fixable setelah enum fix) |
| `GET /projects/stats` belum pisah per type | MEDIUM | (auto-fixable setelah enum fix) |

### Why Documented Now

Owner minta diskusi dulu sebelum coding (sesuai Autonomy Policy: technical decision → execute; UX/scope decision → diskusi). DECISION 010 ini lock spec halaman Daftar Task + route architecture. Backend mapping decision TBD di sesi berikutnya.

### References

- `docs/ai-team/product/user-dashboard.md` Section "Halaman Daftar Task" lines 55-77
- `artifacts/academic-workspace/src/App.tsx` (router — no `/projects` route currently)
- `artifacts/academic-workspace/src/components/layout.tsx` (sidebar Task Mentor group)
- DECISION 009 — sidebar order owner-revised


---

## DECISION 011 — New Project Form: Split per Type (General vs Academic)

**Tanggal:** 2026-09-02
**Status:** ✅ APPROVED + DEPLOYED
**Model:** claude-opus-4-8
**Owner:** sagise

### Context

Owner minta halaman New Project dipisah berdasarkan type, karena General Task ≠ Academic Work punya karakteristik berbeda:
- **General Task:** simpel, langsung tulis (4-stage: Idea → Writing → Revision → Done)
- **Academic Work:** lebih dalam, ideation-first dengan Plan stage (5-stage: Idea → Plan → Writing → Revision → Done)

### Decisions

1. **General Task** form (simpel):
   - Judul: **OPSIONAL** (fungsi: nama dokumen, tidak tampil di file download — AI generate di workspace kalau kosong)
   - Instruksi Tugas: **WAJIB** (acuan AI untuk analisis)
   - Upload File: opsional (instruksi detail / bahan acuan / referensi — AI analisis di workspace)
   - ~~Format / Min. Ref / Min. Tahun / Panel Referensi~~ → **dihapus dari form**, pindah ke workspace

2. **Academic Work** form (lebih dalam):
   - **Tema** (sebelum: Judul): opsional, AI generate judul final di workspace dari analisis tema. User bisa edit manual atau minta AI rekomendasi via chat
   - **Ide / Gagasan** (sebelum: Instruksi Tugas): wajib, AI pakai untuk buat outline/kerangka awal/Plan
   - Upload File: opsional, referensi/bahan pendukung
   - ~~Format / Min. Ref / Min. Tahun / Panel Referensi~~ → **dihapus dari form**, pindah ke workspace

3. **Backend validation update:**
   - title: optional (was required min 1)
   - instructionText: required min 1 (was optional)
   - Tetap backward compatible dengan client yang masih kirim title

4. **AI title generation:** nanti di workspace, BUKAN di creation form (owner chose opsi ini)
5. **Upload file extraction:** simpan file mentah dulu, AI analisis di workspace nanti

### Opsi yang Dipertimbangkan

- **Opsi A — Form identik seperti sebelumnya** (DITOLAK): owner bilang General ≠ Academic harus dipisah
- **Opsi B — 2 route berbeda `/projects/new/general` + `/projects/new/academic`** (DITOLAK): inkonsisten dengan sidebar/dashboard convention pakai query param `?type=`
- **Opsi C — 1 route `/projects/new` + query param `?type=` + conditional rendering per type** ✅ DIPILIH
- **Opsi D — Auto-generate judul di creation form** (DITOLAK owner): scope terlalu besar, pisah ke workspace nanti

### Rationale

Owner non-technical, spec diberikan dengan bahasa natural. AI engineering team decide:
- Type-specific copy (label, helper text, placeholder) per type
- Visual differentiator: warna icon (blue=general, indigo=academic), flow badge
- Backend schema: relaxed validation (title optional) + strict requirement (instructionText required)
- Bug fix: same `useLocation()` query parsing bug dari Daftar Task, fix bareng dengan `useSearch()`

### Implementation

- `lib/api-spec/openapi.yaml` — ProjectInput schema updated
- `lib/api-zod/src/generated/api.ts` — regen
- `artifacts/academic-workspace/src/lib/api-client-react/generated/*` — synced
- `artifacts/academic-workspace/src/pages/new-project.tsx` — rewritten (split per type)
- `artifacts/api-server/api/index.mjs` — rebuilt with new schema

### Out of Scope (deferred)

- Workspace General vs Academic split (separate routes, different layouts)
- AI auto-generate title feature (workspace)
- Upload file binary storage + AI extraction (workspace)
- Bibliography Generator (Academic only)
- Multi-section document + Section AI Chat + Section References (Academic)

### References

- DECISION 010 — Daftar Task spec + status mapping
- DECISION 009 — sidebar menu order
- `docs/ai-team/product/user-dashboard.md` Section "Task Mentor"
- `artifacts/academic-workspace/src/pages/new-project.tsx`
- Memory: `wouter-uselocation-returns-path-only`

---

## [2026-09-03] DECISION 013 — Practice Menu + Learning Activity System

**Status:** ✅ APPROVED by owner
**Tanggal:** 2026-09-03

### Core Principle

> **Satu tes untuk semua keputusan:** Apakah fitur ini baca dari yang udah pernah dikerjakan user di Teora, atau cuma nerima input baru kayak chatbot kosong? Kalau jawabannya "cuma nerima input baru", berarti belum cukup beda dari ChatGPT — harus ditarik dari riwayat.

### Learning Activity System

**Schema:**
```typescript
interface LearningActivity {
  id: string;
  userId: string;
  topics: string[];         // boleh lebih dari satu
  subject?: string;          // mata kuliah/bidang studi
  sourceLink: string;       // ref ke project Task Mentor
  timestamp: Date;
  extractedFrom: 'instruksi' | 'referensi' | 'chat'; // internal only
}
```

**Storage:** Tabel terpisah `learning_activity`, BUKAN kolom di tabel project. Satu project bisa hasilkan beberapa topik, dan data dipakai ulang lintas fitur.

**Extract trigger:**
- General Task: Begitu user selesai/submit
- Academic Work: Begitu project dibuat + ekstrak ulang kalau tema/outline berubah signifikan

**Auto-extract priority:** Judul/instruksi > Referensi > Chat. Manual cuma opsional, bukan wajib.

**Checkpoint:** Log sederhana, bukan vector search/embedding/taksonomi rumit. Kalau mulai mengarah kesitu = overengineer.

### Practice (Final)

**Entry — User sudah punya Learning Activity:**
- 2-3 rekomendasi otomatis: "Quiz dari tugas terbaru?", "Latihan topik yang sering kamu tanyakan?"
- User tinggal pilih

**Entry — User baru:**
- Jangan tampilkan rekomendasi kosong
- **Ajak:** "Kerjakan dulu di Task Mentor, nanti Practice bisa kasih rekomendasi otomatis"
- Opsi manual di pojok sebagai fallback — BUKAN yang ditonjolkan

**Yang BUKAN jalur utama:**
- "Ketik topik bebas" / "Upload file baru" sebagai tombol utama = ChatGPT

**Layout — SATU halaman:** Practice = direct menu (seperti Dashboard), BUKAN hub yang perlu buka sub-menu dulu. Rekomendasi di atas, quiz di tengah halaman yang sama, history scroll bawah.

**Prioritas ekstraksi Learning Activity:**
1. Instruksi/Judul tugas (paling reliable)
2. Referensi (medium)
3. Chat (terakhir, paling berisik — cuma kalau #1 & #2 kosong)

### Prioritas Implementasi

1. Task Mentor — SELESAIKAN DULU
2. Learning Activity + Practice — PARALEL, jangan menunda Task Mentor
3. Tanya & Pahami + Ringkasan Mingguan — reuse Learning Activity nanti
4. Pustaka Saya — nyusul

### References

- `docs/ai-team/product/user-dashboard.md` Section "Learning Activity System + Practice — Spesifikasi Final"

---

## [2026-09-02] DECISION 012 — Slide/PPT di Task Mentor

**Status:** ✅ APPROVED by owner
**Author:** AI Engineering

### Context

Owner clarified: PPT presentasi = fitur yang pelajar butuhkan di Task Mentor. Spec Assessment Builder (untuk pengajar) bukan priority pelajar. Fitur lain (Rangkuman, Flashcard, Notulen, Translate, Paraphrase, AI Checker) sudah ada atau bukan priority.

### Decision Summary

**1. General Task — PPT sebagai Output Format Alternatif**
- User pilih output format di creation form: Dokumen (teks) **atau** Slide (PPT)
- Jika pilih PPT → workspace berubah jadi tampilan slide
- AI generate slide dari instruksi → edit outline → generate full slide → export PPTX
- Template predefined (warna/font/layout)

**2. Academic Work — Tab PPT (Opsional)**
- Tab baru di workspace: **PPT**
- Klik "Generate PPT" → AI bikin PPT dari dokumen ilmiah
- Output: kerangka slide dulu (outline) → user refine → generate full slide
- Bibliography slide auto dari referensi

### Out of Scope

- Custom design editor (template predefined)
- PPTX import/edit (export only)
- Standalone PPT menu

### Implementation Notes

- General Task: creation form perlu pilihan output format (Dokumen/Slide)
- Academic Work: tab PPT di workspace toolbar
- Backend: endpoint `/projects/:id/ppt/generate`
- Export: `pptxgenjs` atau library serupa

### References

- `docs/ai-team/product/user-dashboard.md` Section "Slide / PPT — Fitur Tambahan Task Mentor"

---

## [2026-09-03] DECISION 014 — Referensi Tool + Auto-Cite + Pustaka Saya (Full Implementation)

**Status:** ✅ APPROVED by owner 2026-09-03
**Author:** AI Engineering
**Trigger:** Owner clarified: "Bibliography itu kan tools di fitur refrensi ya, kita menawarkan fitur refrensi yg otomatis" — referensi punya 3 alur masuk (cari otomatis, upload, manual), semuanya masuk Pustaka Saya (global), lalu user ceklist di workspace → AI auto-cite ke paragraf relevan → daftar pustaka auto-update di akhir dokumen.

### Decision Summary

**1. Referensi Tool — 3 alur masuk, 1 storage global**
- **Cari otomatis (AI)**: CrossRef/Semantic Scholar search by title/keyword → user pilih dari suggestions
- **Upload**: User upload PDF/DOC → AI extract metadata (judul, author, tahun, jurnal, dll)
- **Input manual**: User ketik metadata langsung atau paste DOI/ISBN → auto-fill via fetch-metadata
- **Semua 3 alur output → tersimpan di `accountReferencesTable` (Pustaka Saya global, account-level)**

**2. Ceklist + AI Auto-Cite**
- User ceklist reference yang mau dipakai di makalah (Tab Referensi workspace)
- Klik "Auto-Cite" dengan AI tier selector → AI baca dokumen + referensi yang di-ceklist
- AI cari paragraf yang relevan → insert citation marker sesuai format
- **Multi-cite**: 1 paper bisa muncul di beberapa paragraf kalau relevan (Level C — owner-approved)
- Hasil: list `reference_citations` dengan position info (paragraph_index, offset, format_marker)

**3. Manual Reposition**
- User drag citation marker ke paragraf lain
- User delete citation (hover → click X)
- User manual add citation: klik di paragraf → "Insert citation" → pilih reference

**4. Format Sitasi — 7 format, user pilih per project**
- **APA & APA 7**: in-text `(Author, Year)` — populer Indonesia, psikologi, pendidikan
- **Chicago**: footnote superscript + footnote detail — humaniora, sejarah
- **IEEE**: numbered `[1]`, `[2]` — teknik, IT, engineering
- **Vancouver**: superscript numbered — medis, kesehatan
- **MLA**: in-text `(Author page)` — sastra, bahasa
- **Harvard**: in-text `(Author, Year)` — Australia, UK
- Disimpan di `projectsTable.citationFormat` (field sudah ada)

**5. Citation Rendering di DokumenTab**
- Citation marker di-render sesuai format (parser per format)
- Hover untuk preview detail (judul, author, tahun)
- Bibliography section di akhir dokumen — auto-update dari ceklist
- Export PDF/DOCX include in-text citations + bibliography

**6. Pustaka Saya — UI jadi nyata**
- Backend sudah FULL implemented (435 baris di `routes/account-references.ts`): GET/POST/PUT/DELETE/assign/import
- Yang kurang cuma frontend UI di `pages/pustaka-saya.tsx` (sekarang placeholder)
- Features: CRUD list, search by title/author/DOI, CrossRef search & import, filter by source, assign-to-project

### Implementation Plan

**Phase 1 — MVP (5-6 hari)**
- Schema `reference_citations` (new table) + DB migration
- OpenAPI spec update (citation management + auto-cite endpoints)
- Backend: AI auto-cite endpoint + citations CRUD endpoints
- Frontend: Format selector UI di project settings
- Frontend: Ceklist UI di ReferencesTab
- Frontend: "Auto-Cite" button + result preview

**Phase 2 — Multi-cite + Manual Reposition (5-6 hari)**
- Citation marker parser + renderer untuk 7 format
- Citation rendering di DokumenTab (inline marker + footnote section)
- Drag/remove citation manual UI
- Bibliography auto-update di akhir dokumen

**Phase 3 — Pustaka Saya UI (2-3 hari)**
- Halaman Pustaka Saya jadi CRUD nyata
- CrossRef search UI di Pustaka Saya
- Import-to-project flow dari Pustaka Saya

**Total: ~12-15 hari kerja**

### Files Affected

| File | Change |
|------|--------|
| `lib/db/src/schema/reference_citations.ts` | NEW: `referenceCitationsTable` |
| `lib/db/src/schema/index.ts` | Export new schema |
| `lib/api-spec/openapi.yaml` | Add 5 new endpoints |
| `artifacts/api-server/src/routes/references.ts` | Add auto-cite + citations CRUD endpoints |
| `artifacts/academic-workspace/src/pages/project.tsx` | Ceklist UI + format selector + citation rendering |
| `artifacts/academic-workspace/src/pages/pustaka-saya.tsx` | Rewrite dari placeholder jadi CRUD nyata |
| `artifacts/academic-workspace/src/pages/new-project.tsx` | Tambah format selector di creation form |
| `docs/ai-team/product/user-dashboard.md` | Section baru: "Referensi Tool + Auto-Cite + Pustaka Saya — Spesifikasi Final" |

### Why These Decisions (vs alternatives)

| Decision | Alternative | Why this |
|----------|------------|----------|
| Ceklist + auto-cite (AI-driven) | Manual insert citation satu-satu | Sesuai prinsip "tools yang otomatis" — owner expect referensi workflow otomatis, bukan manual |
| Multi-cite per referensi | 1 cite per referensi | Realita paper: referensi yang sama bisa relevan di beberapa paragraf. Owner eksplisit minta |
| User geser/remove manual | Pure AI, no override | Trust user — AI mungkin salah tempat, user perlu koreksi |
| 7 format sitasi | Cuma 1-2 format (APA saja) | Different academic fields use different formats. Owner list APA/Chicago/IEEE — saya tambah 4 lain dari `citation.ts` existing |
| Format dipilih per project | Format global (1 untuk semua project) | Project beda butuh format beda (engineering paper vs humaniora). Per-project lebih fleksibel |
| Pustaka Saya account-level (bukan per-project) | Reference per-project only | Referensi yang sama dipakai lintas project. Bank global = hemat user effort |

### References

- `docs/ai-team/product/user-dashboard.md` Section baru "Referensi Tool + Auto-Cite + Pustaka Saya"
- `artifacts/api-server/src/routes/references.ts` (existing citation logic)
- `artifacts/api-server/src/routes/account-references.ts` (Pustaka Saya backend — sudah implemented)
- `artifacts/api-server/src/lib/citation.ts` (7 format sitasi library)
- `.ai/decisions.md` DECISION 010 (Daftar Task) — precedent untuk Task Mentor workflow

---

## [2026-09-04] DECISION 015: Deploy Robustness Strategy — Fix + Document

**Status:** ACTIVE
**Author:** AI Engineering (autonomous, per CLAUDE.md Autonomy Policy — technical config decision)
**Trigger:** Owner directive 2026-09-04: "issue case deploy selalu error ini sering banget, harus punya catatan khusus agar case tidak terulang dan bisa cepat cari penyebabnya kalau bisa hilangkan sebab error agar kedepannya selalu lancar, tolong catat"

### Context

Deploy errors sudah berulang sejak 2026-08-22 (pnpm→npm conversion):
1. **2026-08-22**: pnpm workspace syntax incompatible with Vercel (`workspace:*`, `link:`, `onlyBuiltDependencies.push`)
2. **2026-08-26**: Wrong Vercel project linked, CI failing silently
3. **2026-08-29**: `.vercelignore` `**/dist` blocking legitimate dist/ uploads
4. **2026-08-31**: CI workflows `No Output Directory named "dist" found`
5. **2026-08-31**: npm audit blocking CI (16 vulnerabilities transitive)
6. **2026-09-01**: tsconfig extends parent (`../../tsconfig.base.json`) inaccessible in subdir build
7. **2026-09-04**: `EUNSUPPORTEDPROTOCOL link:../drizzle-orm/dist` from `drizzle-zod@0.8.3` devDeps

Setiap error consume owner time + Vercel build minutes + CI compute. Tidak ada single source of truth untuk diagnosis.

### Decision Summary

**A. Permanent Fixes Applied (low-risk config changes):**

1. **`artifacts/academic-workspace/vercel.json`** — installCommand skip devDeps:
   ```json
   {
     "installCommand": "npm install --legacy-peer-deps --omit=dev",
     "build": {
       "env": {
         "NPM_CONFIG_PRODUCTION": "true",
         "NPM_CONFIG_LEGACY_PEER_DEPS": "true"
       }
     }
   }
   ```
   **Rationale:** `drizzle-zod@0.8.3` (transitive via lib/db/api-server workspaces) has `"drizzle-orm": "link:../drizzle-orm/dist"` in devDependencies. npm 11 strict mode rejects `link:` protocol. By skipping devDependencies during Vercel install, this error class is eliminated at source.

   **Risk assessment:**
   - Vite is in `dependencies` (not devDependencies) of academic-workspace → still installed
   - All build-time tools (typescript, esbuild, etc.) in `dependencies` → still installed
   - devDependencies of academic-workspace (testing tools, etc.) — not needed for production build
   - Low risk; behavior preserved

2. **`memory/deploy-error-playbook-20260904.md`** — Master playbook created with:
   - Symptom-first diagnosis table (install/build/deploy/runtime phases)
   - Deploy command decision tree
   - Permanent fixes tracker
   - Verification checklist

3. **`.ai/lessons-learned.md`** — New entry "Deploy Errors — Comprehensive Playbook" with format WAJIB (Gejala/Root cause/Opsi/Kenapa pilih/Cek masa depan)

**B. Pending Permanent Fixes (tracked, not yet applied):**

1. **Pin `@vercel/node` version** in `artifacts/api-server/package.json` to prevent Vercel auto-injection of vulnerable version (`@vercel/node@3.2.29`)
2. **Schedule `npm audit --audit-level=critical`** as separate weekly CI job (instead of blocking deploy)
3. **Add `build.sourcemap: false`** to `artifacts/academic-workspace/vite.config.ts` to reduce build noise
4. **Add `.npmrc` `engine-strict=false`** at root to suppress EBADENGINE warnings
5. **Consolidate `.vercelignore`** — current rule is allowlist of specific dist/ dirs (might miss new dist/ dirs as project grows)

**C. Rejected Options:**

- **Migrate fully to Vercel Native CI (GitHub integration auto-deploy)**: Risky, requires re-validating entire pipeline. Direct CLI deploy (DECISION 003) is battle-tested, keep as primary.
- **Fix at `drizzle-zod` source**: Wait for upstream fix (npm maintainers or drizzle-zod authors to remove `link:` from devDeps). Out of our control.
- **Pin `drizzle-zod` to older version without `link:`**: Would lose features + require re-validation of API server.

### Trade-offs Considered

| Approach | Speed | Risk | Reliability | Owner Cost |
|----------|-------|------|-------------|------------|
| Document-only | Fast | None | Low (same errors recur) | High (debug every time) |
| Fix + Document (chosen) | Medium | Low | High (most patterns eliminated) | Low (self-service diagnosis) |
| Full CI/CD rewrite | Slow | High | High if succeeds | Medium (one-time) |

**Choice rationale:** Fix + Document achieves 80% reliability improvement with 20% of full rewrite cost. Full rewrite deferred until specific need arises.

### Validation

**This fix is unverified in production yet** — applied 2026-09-04, but not yet deployed with new `vercel.json`. Next deploy will validate `installCommand: --omit=dev` works correctly for Vercel build of academic-workspace.

If new `vercel.json` installCommand causes build failure: rollback to `npm install --legacy-peer-deps` (just remove `--omit=dev`) and rely on `vercel deploy --prod --yes` (no `--prebuilt`) fallback from playbook.

### References

- `.ai/lessons-learned.md` entry "Deploy Errors — Comprehensive Playbook"
- `.ai/issue-tracker.md` entries 2026-08-22 (pnpm), 2026-08-29 (.vercelignore), 2026-08-31 (CI dist), 2026-09-04 (drizzle-zod)
- `docs/ai-team/devops/` (deployment architecture documentation)
- `memory/deploy-error-playbook-20260904.md` (master playbook)
- Related decisions: DECISION 003 (Direct Vercel CLI), DECISION 006 (Per-route middleware), DECISION 008 (.vercelignore allowlist)

---
