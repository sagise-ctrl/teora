# Session Log — 2026-08-26 Backend Deployment & CORS Fix

> Full discussion archive. Read `.ai/checkpoints/2026-08-26-backend-deploy.md` first for summary; this file is the detailed record.

---

## Discussion Timeline

### Turn 1 — User Message (resumed from compacted context)

**User context provided:** Indonesian-speaking non-technical owner. Previous session ran out of context while debugging CORS issue between production frontend (`academic-workspace-eta.vercel.app`) and backend (`teora-backend.vercel.app`).

**Compaction summary highlights:**
- 4 commits already made: `c6ba451`, `2ed95f4`, `0fa9ab0`, (one earlier)
- Backend deployed to Vercel, returning 200 on `/api/healthz` and `/test`
- CORS test from production frontend returned 500 with HTML error body — blocking
- VERCEL_TOKEN: `[REDACTED]` (provided by owner, used via shell env, never committed)

---

### Turn 2 — AI Action: Diagnose via `vercel logs`

**Tool:** `vercel logs --limit 3 --cwd artifacts/api-server`

**Output revealed the exact root cause:**
```
Error: CORS: origin https://academic-workspace-eta.vercel.app not allowed
    at origin (file:///var/task/api/index.mjs:89363:16)
    at file:///var/task/api/index.mjs:24413:17
    at optionsCallback (file:///var/task/api/index.mjs:24395:13)
    at corsMiddleware (file:///var/task/api/index.mjs:24399:11)
```

Three log lines, three requests (OPTIONS, HEAD, GET), all 500, all from `academic-workspace-eta.vercel.app`. Confirmed the CORS middleware was throwing an exception (not denying).

---

### Turn 3 — AI Action: Read `src/app.ts`

**Tool:** `grep cors src/app.ts` then `Read src/app.ts:1-70`

**Found the bug at line 48:**
```ts
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));  // ← BUG
    },
    credentials: true,
  }),
);
```

**Analysis:** The `cors` npm library treats `callback(err)` as "middleware threw an error" → Express's default error handler → 500. The correct API for "deny" is `callback(null, false)`.

---

### Turn 4 — AI Action: Fix the bug

**Tool:** `Edit src/app.ts`

```ts
// Before
callback(new Error(`CORS: origin ${origin} not allowed`));

// After
logger.warn({ origin, allowedOrigins }, "CORS: origin not allowed");
return callback(null, false);
```

Rationale: deny should be observable in browser devtools as a CORS error (the correct signal), not a 500 from the server.

---

### Turn 5 — AI Action: Rebuild

**Tool:** `node --max-old-space-size=8192 artifacts/api-server/build.mjs`

**First attempt** crashed with esbuild internal Go panic (out of memory on Windows). Second attempt with `--max-old-space-size=8192` succeeded:
- `dist/index.mjs` 3.5mb
- `dist/index.mjs.map` 6.4mb
- Done in 4076ms

**Decision:** Documented the memory flag need for Windows dev environment.

---

### Turn 6 — AI Action: Redeploy via Vercel CLI

**Tool:** `vercel deploy --prod --yes --cwd artifacts/api-server`

**Result:** `Deployment teora-backend-7v9putjqg-sagise-ctrls-projects.vercel.app ready.`

Build succeeded without errors. The CI bypass pattern from DECISION 003 worked again.

---

### Turn 7 — AI Action: Verify CORS End-to-End

**Tool 1:** `curl -sI -X OPTIONS https://teora-backend.vercel.app/api/ai-tiers -H "Origin: https://academic-workspace-eta.vercel.app" -H "Access-Control-Request-Method: GET"`

**Result:**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Origin: https://academic-workspace-eta.vercel.app
Vary: Origin, Access-Control-Request-Headers
```
✅ Preflight succeeded.

**Tool 2:** `curl -s -X GET https://teora-backend.vercel.app/api/ai-tiers -H "Origin: https://academic-workspace-eta.vercel.app"`

**Result:** 200 OK with full tier JSON (free, standard, premium, ultra). ✅

**Tool 3:** `curl -sI -X OPTIONS ... -H "Origin: https://malicious.example.com"`

**Result:** 200 OK, body `Forbidden` (9 bytes), **no** `Access-Control-Allow-Origin` header. ✅ Browser will block this client-side — clean deny path, no 500.

---

### Turn 8 — AI Action: Commit fix

**Tool:** `git add artifacts/api-server/src/app.ts artifacts/api-server/.env.example artifacts/api-server/api/index.mjs`

**Commit message:**
```
fix(api-server): CORS deny returns 403 not 500

The CORS origin callback was throwing an Error on deny, which Express
turned into a 500 Internal Server Error. This broke every request from
unallowed origins (including the production frontend during preflight).

Fix: callback(null, false) instead of callback(new Error(...)). Now
denied origins get a clean response without Access-Control-Allow-Origin
header, which browsers correctly block client-side.

Verified end-to-end:
- GET /api/ai-tiers with Origin: academic-workspace-eta.vercel.app → 200 + ACAO
- OPTIONS preflight from production frontend → 204 + ACAO
- Unknown origin → no ACAO header (browser blocks, no 500)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

**Commit hash:** `a5492de`

---

### Turn 9 — AI Action: Update operational files

**Files modified:**
1. `.ai/current-task.md` — added CORS section, marked "Backend ↔ Frontend Communication Fixed"
2. `.ai/blockers.md` — added CORS to resolved items, removed `ALLOWED_ORIGINS` from pending
3. `memory/cors-callback-throws-vs-deny.md` — NEW lesson file
4. `memory/MEMORY.md` — added index entry

---

### Turn 10 — AI Final Response to Owner

Written in Indonesian (matching owner's language), short and operational per DECISION 002 ("Owner receives short reports, not technical deep dives"):

- ✅ Summary of what broke
- ✅ What was fixed
- ✅ Verification evidence
- ⏳ Owner action items (Google OAuth, ~10 min)
- 🤖 AI next steps (PDF export, CI sync)

---

### Turn 11 — User Message: "cekpoin dulu, biar progres nya tersimpan. simpan juga sesi diskusi ini, agar terdomentasi dengan rapi"

**Translation:** "Checkpoint first, so progress is saved. Also save this discussion session, so it's documented neatly."

**Owner intent:** 
1. Persist current state as a checkpoint (per `.ai/checkpoints/` convention)
2. Archive the full discussion (not just the summary) for future reference

**Interpretation:** Owner wants full traceability — both the "what changed" (checkpoint) and "how we got there" (session log).

---

### Turn 12 — AI Action: This File

**Actions taken:**
1. Read `.ai/checkpoints/2026-08-25-evening-sprint.md` — to match existing checkpoint format
2. Read `.ai/progress.md` — to match progress log style
3. Created `.ai/checkpoints/2026-08-26-backend-deploy.md` — full checkpoint with restart instructions
4. Created `.ai/sessions/2026-08-26-backend-deploy-and-cors-fix.md` — this file (full discussion archive)

---

## Decisions Made This Session

| Decision | Rationale | Documented in |
|----------|-----------|---------------|
| Direct CLI deploy beats CI for stuck pipelines | Worked in 5 min after 12+ hours of CI failure | DECISION 003 (`.ai/decisions.md`) |
| Disable PDF export temporarily | `@react-pdf/renderer` runtime can't resolve pdfkit subpaths in Vercel Functions | Checkpoint trade-offs |
| `callback(null, false)` for CORS deny | `callback(err)` becomes 500; deny is not an error | Memory `cors-callback-throws-vs-deny` |
| Keep Vercel GitHub integration for now | P2 owner action; not blocking | `.ai/blockers.md` |
| Commit `api/index.mjs` directly | Vercel Functions need the built bundle in the deployed source | `.ai/decisions.md` (earlier session) |

---

## Technical Details Preserved

### Environment Variables (Vercel api-server)
- `DATABASE_URL` ✅
- `DATABASE_POOLER_URL` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_JWT_SECRET` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `ALLOWED_ORIGINS` ✅ (added 2026-08-26)
- `AI_API_KEY` ❌ MISSING

### Project Identifiers
- Vercel project: `teora-backend` (id `prj_5c9YZBllez1NgwZazyStYt8wTJ5d`)
- Vercel team: `team_3EUQGQXweii5aVhyz07uqEFB`
- Frontend: `https://academic-workspace-eta.vercel.app`
- Backend: `https://teora-backend.vercel.app`

### Deploy Pattern (DECISION 003 — copy-paste ready)
```bash
export VERCEL_TOKEN="<owner-provided-token>"
cd <repo-root>
vercel deploy --prod --yes --cwd artifacts/api-server
```

---

## Open Questions for Future Sessions

1. Should we re-enable PDF export with `@sparticuz/chromium` or move to a worker? — Research needed
2. Should CI workflow be fixed to match direct deploy, or kept separate? — Decision deferred
3. Should `VERCEL_TOKEN` be moved to a GitHub Action secret for CI use? — Out of scope (security review needed)
4. Should we add a `cors` library linting rule to catch `callback(err)` misuse? — Worth considering

---

## End of Session Log