---
name: deploy-safe
description: Universal deploy gate for Vercel + GitHub monorepo. Enforces 6 mandatory properties (atomic, reversible, observable, idempotent, scoped, auditable) across 3 deployment paths (GitHub Integration auto-deploy, Vercel CLI manual, GitHub PAT API merge). Use BEFORE every deploy to Teora — claim "deployed" only after passing all gates.
metadata:
  type: skill
  version: 1.0
  originSessionId: 13ae85f1-1a79-4630-806f-54b6dcd1b115
  appliesTo: artifacts/api-server, artifacts/academic-workspace, lib/*
  related: error-recovery/pnpm-vercel-deploy.md, error-recovery/vercel-prebuilt-deploy.md
---

# Deploy-Safe SOP — Universal Deploy Gate (SOP-003)

**TL;DR:** 6 properties × 3 paths = 18-cell matrix. Every deploy cell must pass before claiming success. Rollback runbook per cell. Audit log mandatory.

---

## Context: Why This SOP Exists

**Problem.** Teora historically had SOP-001 (4-step gate for GitHub integration path only). It passed in-vitro tests but failed when other paths were used in production (ERR-022: Vercel CLI manual deploy does not auto-promote alias). Root cause: SOP was **path-conditional**, not universal.

**Definition of "safe deploy."** A deploy is safe when it satisfies **all 6 properties**:

| # | Property | Definition |
|---|---|---|
| 1 | **Atomic** | Single source of truth — no half-state visible to user |
| 2 | **Reversible** | Rollback to previous stable state in <5 minutes, no data loss |
| 3 | **Observable** | Status verifiable with one command, deterministic result |
| 4 | **Idempotent** | Re-running same deploy = no-op or explicit warning, not silent duplicate |
| 5 | **Scoped** | Authorization has clear scope + expiry; default deny for out-of-scope |
| 6 | **Auditable** | Single-line entry in `.ai/deploy-log.md` with all required fields |

**Why 3 paths.** Teora can deploy via any of these:
- **Path A** — GitHub Integration (auto-deploy on push to main, or PR preview)
- **Path B** — Vercel CLI manual (`vercel deploy --prod --yes`)
- **Path C** — GitHub PAT API merge (emergency bypass when auto-merge broken)

Each path has different default behavior for each property. SOP must enforce per-cell gate.

---

## The Matrix: 3 Paths × 6 Properties

Legend: ✅ default met | ⚠️ requires explicit action | ❌ blocked by default

### Path A — GitHub Integration (auto-deploy)

| Property | Default | Required Action |
|---|---|---|
| Atomic | ⚠️ | Lock frontend+backend deploys within 30 min; no green-only deploy |
| Reversible | ✅ | Record `previous_production_deployment_id` BEFORE push |
| Observable | ✅ | `vercel inspect <alias>` returns current deployment ID |
| Idempotent | ❌ | Each push = new deployment; dedup by commit SHA before push |
| Scoped | ✅ | Branch protection enforces who can push to main |
| Auditable | ✅ | Deployment meta includes commit SHA, author, branch |

**When to use:** Frontend normal flow, low-risk changes, PR previews.

### Path B — Vercel CLI Manual

| Property | Default | Required Action |
|---|---|---|
| Atomic | ⚠️ | Deploy frontend+backend together in same window |
| Reversible | ✅ | Record previous stable deployment ID before deploying |
| Observable | ✅ | `vercel inspect <alias>` shows new deployment ID |
| Idempotent | ❌ | CLI creates new deployment every run; check deployment ID == existing first |
| Scoped | ⚠️ | Token holder can deploy anything; gate via commit authorization |
| Auditable | ⚠️ | Manual: append to `.ai/deploy-log.md` is MANDATORY |

**When to use:** Backend (no GitHub Action), hotfix, env-only changes, controlled rollout.

### Path C — GitHub PAT API Merge

| Property | Default | Required Action |
|---|---|---|
| Atomic | ⚠️ | Same as Path A — lock frontend+backend window |
| Reversible | ⚠️ | Git revert + new push; cannot directly un-merge via API |
| Observable | ✅ | Vercel deployment meta shows merge source |
| Idempotent | ✅ | Same PR number = same merge call returns existing state |
| Scoped | ❌ | PAT bypasses branch protection entirely; **manual scope check required** |
| Auditable | ⚠️ | GitHub UI may not show API merge as special; log manually |

**When to use:** **EMERGENCY ONLY** — auto-merge action broken AND critical fix needed. Document why in `.ai/error-index.md` before invoking.

---

## Pre-Deploy Gate (Mandatory)

Run this checklist BEFORE any deploy. If any item fails, do not deploy.

```markdown
## Pre-Deploy Checklist — [Path A/B/C]

1. [ ] **Path chosen** — A / B / C. Justify choice in 1 sentence.
2. [ ] **Atomic check** — Will frontend+backend deploy together? If not, accept window.
3. [ ] **Previous stable ID recorded** — `previous_production_deployment_id = <id>`
4. [ ] **Rollback command ready** — Written down, executable, tested mentally.
5. [ ] **Build artifact fresh** — `dist/index.mjs` or `api/index.mjs` mtime >= source mtime.
6. [ ] **CI green** — `gh pr checks <n>` all green OR explicit override documented.
7. [ ] **Authorization scope clear** — Owner approved what, until when, excludes what.
8. [ ] **Idempotency check** — Will this create a duplicate deployment? If yes, suppress.
9. [ ] **Audit log entry drafted** — Will append to `.ai/deploy-log.md` post-deploy.
```

**Hard stop:** If items 1, 3, 4, 9 fail, abort deploy and report.

---

## Deploy Workflow (Per Path)

### Path A — GitHub Integration

```bash
# 1. Pre-deploy gate (above) — all checked
# 2. Commit + push to feature branch
git add .
git commit -m "..."
git push -u origin HEAD

# 3. Create PR
gh pr create --base main --fill

# 4. Wait for CI green
gh pr checks <n> --watch

# 5. Merge (choose method)
gh pr merge <n> --squash  # if auto-merge enabled
# OR via Path C if auto-merge broken

# 6. Wait for Vercel auto-deploy (1-3 min)
vercel inspect <alias-url>  # verify new deployment ID

# 7. Smoke test
curl -sS https://<alias>/api/healthz

# 8. Append audit log entry
```

### Path B — Vercel CLI Manual

```bash
# 1. Pre-deploy gate (above) — all checked
# 2. Build fresh artifact
cd <project-dir>
npm run build

# 3. Verify build artifact timestamp
ls -la dist/index.mjs api/index.mjs  # both should be recent

# 4. Get auth token
TOKEN=$(cat /c/Users/E210MA/AppData/Roaming/xdg.data/com.vercel.cli/auth.json | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

# 5. Record previous stable deployment ID
PREVIOUS_ID=$(vercel inspect <alias> --token $TOKEN 2>/dev/null | grep "^    id" | awk '{print $2}')

# 6. Deploy
DEPLOY_OUTPUT=$(vercel deploy --prod --yes --token $TOKEN 2>&1)
NEW_ID=$(echo "$DEPLOY_OUTPUT" | grep '"id"' | head -1 | grep -oE 'dpl_[A-Za-z0-9]+')

# 7. Promote (mandatory — see ERR-022)
vercel promote $NEW_ID --token $TOKEN

# 8. Verify alias swapped
vercel inspect <alias> --token $TOKEN  # confirm id == NEW_ID

# 9. Smoke test
curl -sS https://<alias>/api/healthz

# 10. Append audit log entry with PREVIOUS_ID + NEW_ID
```

### Path C — GitHub PAT API Merge

```bash
# 1. Pre-deploy gate (above) — all checked
# 2. Document WHY Path C (not Path A)
#    - Auto-merge broken: link ERR-021 in commit message
#    - Critical fix needed: severity HIGH
#    - Owner explicit approval for THIS specific PR

# 3. Get PAT from git config
TOKEN=$(git config --get github.token)

# 4. Verify CI green (manual check)
gh pr checks <n>

# 5. Merge via API
curl -sL -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  --data @<merge-payload.json> \
  "https://api.github.com/repos/<owner>/<repo>/pulls/<n>/merge"

# 6. GitHub Integration auto-deploys (Path A takes over)
# 7. Wait, verify, smoke test as Path A
# 8. Append audit log entry with path=C justification
```

---

## Post-Deploy Verification (Mandatory)

Within 5 minutes of deploy completion:

```bash
# 1. Confirm alias points to new deployment
vercel inspect <alias> --token $TOKEN | grep -E "id|target"

# 2. Smoke test public health endpoint
curl -sS -o /dev/null -w "%{http_code}\n" https://<alias>/api/healthz
# Expected: 200

# 3. Smoke test auth-protected endpoint (should return 401, not 500)
curl -sS -o /dev/null -w "%{http_code}\n" https://<alias>/api/ai-tiers
# Expected: 401 (auth required, server alive)

# 4. Check Vercel logs for errors
vercel logs <deployment-id> --token $TOKEN | grep -iE "error|exception"

# 5. Append audit log entry
```

If any check fails:
1. Decide: rollback OR fix-forward
2. If rollback: use Rollback Runbook below
3. Document decision in `.ai/current-task.md` Handoff section

---

## Rollback Runbook

### Path A Rollback

```bash
# 1. Get previous stable deployment ID (from audit log)
PREVIOUS_ID=<dpl_xxx>

# 2. Revert git
git revert <merge-commit-sha>
git push origin main  # triggers new deployment that includes revert

# OR (faster, no git):
vercel promote $PREVIOUS_ID --token $TOKEN
```

### Path B Rollback

```bash
# 1. Get previous stable deployment ID (from audit log)
PREVIOUS_ID=<dpl_xxx>

# 2. Promote previous
vercel promote $PREVIOUS_ID --token $TOKEN

# 3. Verify
vercel inspect <alias> --token $TOKEN  # confirm id == PREVIOUS_ID
curl -sS https://<alias>/api/healthz  # smoke test
```

### Path C Rollback

```bash
# Cannot un-merge via API. Must:
# 1. Revert commit
git revert <merge-commit-sha>
git push origin main  # Path A takes over

# 2. Wait for auto-deploy
# 3. Verify
```

### Database Schema Rollback

```bash
# If deploy included schema change (e.g., added column):
# 1. Forward fix preferred — write code that doesn't need column removed
# 2. If must drop: create down migration, apply via Supabase MCP
# 3. Verify: query information_schema before and after
```

**Rollback time budget:** 5 minutes from decision to deploy ID swap. If exceeded, escalate.

---

## Audit Log Format (`.ai/deploy-log.md`)

Every deploy appends one line:

```markdown
| ts | path | project | sha | prev_id | new_id | result | notes |
|---|---|---|---|---|---|---|---|
| 2026-09-16 12:06 | B | teora-backend | 4e499d7 | dpl_HsMepdHAbi1LUGVw3pujeEdsjyMy | dpl_KtjqH7gRMbRjzFGT3Yom2RAwk885 | SUCCESS | bundle rebuild, ERR-022 fix |
| 2026-09-16 11:45 | A | academic-workspace | 248e880 | (auto-promoted by GH integration) | dpl_AYTEMz7gXp8HWGYEBUCBw23RGM4g | SUCCESS | Olagon Phase 1+2 merge |
| 2026-09-16 11:40 | C | teora | 248e880 | n/a | merge_commit | SUCCESS | auto-merge broken (ERR-021), owner-approved bypass |
```

**Required fields:**
- `ts` — ISO timestamp
- `path` — A / B / C
- `project` — which Vercel project
- `sha` — commit SHA (full or short)
- `prev_id` — previous stable deployment ID (or "auto" for Path A first deploy)
- `new_id` — new deployment ID (or merge commit SHA for Path C)
- `result` — SUCCESS / FAILED / ROLLED_BACK
- `notes` — 1-line context (what was deployed, why, any ERR referenced)

---

## Integration with `.ai/current-task.md`

Every deploy attempt MUST update Handoff section:

```markdown
## Handoff YYYY-MM-DD HH:MM — model X → model Y

**Active deploy:** <project> via <path>
**Previous stable:** <prev_id>
**New:** <new_id>
**Status:** SUCCESS / FAILED / ROLLED_BACK
**Verified at:** <timestamp>
**Audit log:** see .ai/deploy-log.md
**Rollback runbook tested:** yes / no
```

---

## Enforcement Rules

These are HARD rules. Violating them = ERR entry mandatory.

1. **No deploy without pre-deploy checklist complete.** Skip checklist = ERR.
2. **No claim "deployed" without audit log entry.** Forgetting audit = ERR.
3. **No Path C without Path A/B attempted first** (or documented why impossible).
4. **No rollback without recording reason in audit log.**
5. **No Path B without explicit `vercel promote`** (ERR-022 trap).

---

## SOP Version History

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-09-16 | Initial — 3 paths × 6 properties matrix | Replace SOP-001 (path-conditional) with universal gate |

**Supersedes:** SOP-001 (kept for reference only, marked deprecated in `.ai/decisions.md`).

---

## Related

- ERR-021 — Auto-merge workflow fails (Path C justification)
- ERR-022 — Vercel `deploy --prod` does not update alias (Path B mandatory promote)
- Memory `auto-merge-peter-evans-fails-repo-allow-auto-merge.md`
- Memory `vercel-promote-required-after-deploy-prod.md`
- Memory `deployment-drift-local-vs-live-20260913.md` (originated need for SOP-001)
</content>
</invoke>