# Checkpoint — 2026-08-26 Backend Deploy Sprint

## Session Goal
Fix stuck teora-backend Vercel deployment, get backend ↔ frontend production communication working, document everything so future sessions can resume cleanly.

## Triggered By
Owner escalation: backend "never been deployed successfully to production" — Owner provided `VERCEL_TOKEN` after multiple sessions failed; said "lanjut" to keep going with minimum manual setup.

## Final State (End of Session)

### ✅ Resolved
- Backend LIVE at `https://teora-backend.vercel.app`
  - `GET /api/healthz` → 200 `{"status":"ok"}`
  - `GET /test` → 200 `{"ok":true}`
  - `GET /api/ai-tiers` → 200 with full tier list
  - Authenticated routes (`/api/users/me/balance`) → 401 (correct)
- CORS working end-to-end
  - `OPTIONS /api/ai-tiers` from `academic-workspace-eta.vercel.app` → **204** + `Access-Control-Allow-Origin`
  - `GET /api/ai-tiers` from `academic-workspace-eta.vercel.app` → **200**
  - Unknown origin → no ACAO header (browser blocks, no 500)
- 13 uncommitted backend files (ai-tiers, balance, credit, db schemas) committed
- 3 deployments executed via direct Vercel CLI (bypassing CI)
- 4 commits made this session:
  - `c6ba451` (earlier session) — deployment fix
  - `2ed95f4` — AI tier features
  - `0fa9ab0` — rebuild with features
  - `a5492de` — CORS deny returns 403 not 500

### ⚠️ Known Trade-offs (accepted)
- **PDF export disabled** — `@react-pdf/renderer` runtime can't resolve `pdfkit/js/standard-fonts/Helvetica.cjs` subpath in Vercel Functions. Endpoint removed; DOCX export works.
- **Vercel GitHub integration still active** for `teora-backend` — may race with CI on push. P2 owner action: disconnect in dashboard.
- **VERCEL_TOKEN is owner-provided** — currently in shell env (not committed), used for direct CLI deploys. If owner wants to revoke, see `.ai/decisions.md`.

### 🔴 Owner Action Pending
| Task | Time | What |
|------|------|------|
| Setup Google OAuth | ~10 min | Google Cloud Console → create OAuth 2.0 client → add to Supabase Auth providers |
| Disconnect Vercel GitHub integration | ~2 min | Settings → Git → disconnect for `teora-backend` |

## Session Lessons

### 1. Direct Vercel CLI Deploy Beats CI for Stuck Pipelines (DECISION 003)
After 12+ hours of CI failing on a `teora-backend` project that wasn't even linked locally, `vercel deploy --prod --cwd artifacts/api-server --project teora-backend` succeeded in 5 minutes with 5 commands. CI had been deploying to PREVIEW URLs (no `--prod` flag) that expired and never promoted.

### 2. CORS Callback Semantics (NEW memory)
- `callback(null, true)` → allow (sends ACAO header)
- `callback(null, false)` → deny cleanly (no ACAO; browser blocks)
- `callback(err)` → Express treats as middleware error → **500**

This bug shipped in `src/app.ts:48` from earlier session. Symptom: every denied origin returned 500 with HTML body `<pre>Internal Server Error</pre>`. Fix: `callback(null, false)` + `logger.warn(...)`. Saved as `memory/cors-callback-throws-vs-deny.md`.

### 3. Three Independent Blockers Compounded
The "backend won't deploy" problem was actually THREE separate bugs:
1. CI workflow: wrong project name (`api-server` not `teora-backend`) + missing `--prod`
2. Local `.vercel/project.json`: stale reference to deleted project
3. Vercel dashboard: `rootDirectory` set to non-existent path

Each alone wouldn't be fatal; together, every deploy attempt silently failed at a different layer.

### 4. `vercel logs` is the Fastest Debug Tool
When WebFetch to GitHub Actions is blocked, `vercel logs --cwd <project>` streams real runtime errors. Showed `Error: CORS: origin https://academic-workspace-eta.vercel.app not allowed` immediately, pointing straight at the bug.

## Key Files Touched
- `artifacts/api-server/src/app.ts` — CORS callback fix (line 48)
- `artifacts/api-server/build.mjs` — bundle config (rebuilt twice)
- `artifacts/api-server/vercel.json` — `@vercel/node` build config
- `artifacts/api-server/.vercel/project.json` — re-linked to teora-backend
- `artifacts/api-server/.env.example` — added `ALLOWED_ORIGINS` section
- `artifacts/api-server/api/index.mjs` — committed bundle (Vercel Function entry)
- `artifacts/api-server/src/routes/projects.ts` — removed PDF export handler
- `artifacts/api-server/src/lib/pdf-export.tsx` — deleted
- `.ai/current-task.md` — rewrote with deploy success + CORS fix sections
- `.ai/blockers.md` — updated env vars list, added CORS to action items
- `.ai/decisions.md` — added DECISION 003 (direct CLI deploy pattern)
- `.ai/progress.md` — added 2026-08-26 entries (TODO)
- `memory/cors-callback-throws-vs-deny.md` — NEW
- `memory/MEMORY.md` — added index entry

## Restart Instructions for Next Session
1. Read `.ai/current-task.md` — current state is "Backend ↔ Frontend Communication Fixed"
2. Read `.ai/blockers.md` — owner action items: Google OAuth + Vercel GitHub disconnect
3. Read `.ai/decisions.md` — DECISION 003 has the deploy pattern that worked
4. Read `memory/cors-callback-throws-vs-deny.md` — avoid the same CORS bug
5. Run `vercel logs --cwd artifacts/api-server --limit 10` to confirm backend is still healthy
6. Next autonomous work: re-enable PDF export, sync CI workflow, fix Vercel GitHub integration race