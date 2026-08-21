# Incident Management — AI Production Admin

## Severity Levels

| Severity | Definition | Response |
|----------|------------|----------|
| **P0 Critical** | Service down, data loss, security breach, financial loss | Immediate autonomous fix if possible. Owner notification within 5 min. |
| **P1 High** | Major feature broken, >10% users affected, auth broken | Fix within 1 hour if fixable. Owner notification within 15 min. |
| **P2 Medium** | Minor feature broken, 1-10% users affected, degraded performance | Fix within 24 hours. Owner daily summary. |
| **P3 Low** | Cosmetic issue, <1% users affected, non-blocking | Fix in next sprint cycle. No owner notification required. |

## Severity Decision Tree

```
Is service down or data at risk?
  YES → P0 → Immediate autonomous fix → Owner notification
  NO
    → Are >10% users blocked?
      YES → P1 → Fast fix → Owner notification
      NO
        → Is major feature non-functional?
          YES → P1 → Fix within 1h → Owner notification
          NO
            → Is minor feature affected?
              YES → P2 → Fix within 24h → Daily summary
              NO
                → Cosmetic/low impact?
                  YES → P3 → Next sprint
                  NO → Use judgment, default to higher severity
```

## Autonomous Remediation Threshold

AI Production Admin boleh fix autonomous **tanpa tanya owner** jika:

1. **Root cause jelas** — error message jelas atau root cause sudah pernah terjadi
2. **Fix verified** — test dapat memverifikasi fix
3. **Rollback tersedia** — Git checkpoint atau previous deployment ada
4. **No business decision needed** — fix teknis, bukan perubahan logic
5. **No financial impact** — fix tidak menyebabkan biaya
6. **No legal/compliance** — tidak涉及 compliance issue

**Contoh fix autonomous:**
- Fix TypeError di API route (root cause jelas, test tersedia)
- Restart stuck process (simple restart, easy rollback)
- Redeploy setelah config change
- Fix environment variable yang salah
- Rate limit yang terlalu ketat
- Fix JWT validation error
- Fix database connection timeout

**Contoh yang perlu tanya owner:**
- Refund request (financial)
- Pemberian akses kepada orang baru (external access)
- Perubahan pricing (business decision)
- Penghapusan data user (data destruction)
- Perubahan security policy (legal/compliance)

## Incident Workflow

### When Issue Detected

```
1. DETECT — monitoring, user complaint, alert
2. ASSESS — severity, scope, user impact
3. CLASSIFY — P0/P1/P2/P3
4. INVESTIGATE — logs, errors, recent changes
5. FIX — if autonomous threshold met
6. TEST — verify fix works
7. DEPLOY — if deployment needed
8. MONITOR — watch for recurrence
9. ROLLBACK — if fix causes worse problem
10. REPORT — incident report to .ai/incidents/
11. NOTIFY — owner if P0/P1
```

### Investigation Checklist

- [ ] Read error message / stack trace
- [ ] Check recent deployments (last 24h)
- [ ] Check recent code changes
- [ ] Check environment variables
- [ ] Check external dependencies (Supabase, Stripe, OpenAI)
- [ ] Check database state
- [ ] Check authentication/authorization
- [ ] Check rate limits
- [ ] Reproduce locally if possible
- [ ] Check similar past incidents

## Incident Report Format

Create at `.ai/incidents/YYYYMMDD-NNN.md`:

```markdown
# Incident Report: [Brief Title]

## Metadata
- **ID:** YYYYMMDD-NNN
- **Detected:** YYYY-MM-DD HH:MM UTC
- **Severity:** P0/P1/P2/P3
- **Source:** monitoring / user complaint / alert
- **Status:** RESOLVED / INVESTIGATING / ESCALATED

## Summary
Brief description of what happened (1-3 sentences, non-technical).

## Affected Feature
What feature/endpoint/functionality was affected.

## User Impact
How many users affected, what they experienced.

## Error / Symptom
Technical description of the error.

## Root Cause
What actually caused the incident.

## Investigation
Steps taken to find root cause.

## Action Taken
What was done to fix the issue.

## Files Changed
List of files modified to fix.

## Tests
Tests run to verify fix.

## Deployment
How/when fix was deployed.

## Rollback
Was rollback performed? If yes, what triggered it.

## Monitoring
What was monitored post-fix. Any recurrence alerts?

## Current Status
Is the issue fully resolved? Any remaining risk?

## Remaining Risk
Any known remaining risks or follow-up needed.

## Recommendations
What should be done to prevent recurrence?

## Lessons Learned
Key takeaways for the team.
```

## Incident Registry

Update `.ai/incidents/incident-registry.md` with every new incident:

```markdown
# Incident Registry

| ID | Date | Severity | Title | Status | Post-mortem |
|----|------|----------|-------|--------|-------------|
| YYYYMMDD-NNN | YYYY-MM-DD | P0 | Title | Resolved | link |
```

## Rollback Procedure

### Frontend (Vercel)

```bash
# Check recent deployments
vercel list

# Get previous deployment URL
vercel list --limit 5

# Promote previous deployment
vercel promote [deployment-id]

# Or: redeploy from previous Git commit
git log --oneline -5
# find the last good commit
vercel --prod # triggers new deploy from main
```

### Backend (VPS)

```bash
# SSH to VPS
ssh user@server

# Check supervisor status
supervisorctl status

# Restart API server
supervisorctl restart teora-api

# If database issue:
supabase db push --project-id [id] --linked

# If rollback needed:
# Check git log for last good commit
git log --oneline -10
git checkout [good-commit-hash]
# Rebuild and restart
pm2 restart teora-api
# or
supervisorctl restart teora-api
```

### Database (Supabase)

```bash
# Check migration status
supabase migration list

# If bad migration:
# Use Supabase dashboard to restore from backup
# Or: manually revert via Supabase SQL editor
```

## Escalation Matrix

| Severity | Autonomous Fix | Owner Notification | Response Time |
|----------|---------------|-------------------|---------------|
| P0 | Yes (if threshold met) | Immediately (within 5 min) | Owner acknowledges |
| P1 | Yes (if threshold met) | Within 15 min | Owner within 1 hour |
| P2 | As appropriate | Daily summary | Owner within 24 hours |
| P3 | N/A | Weekly summary | Owner weekly review |

## Owner Report Template

For P0/P1, write a brief non-technical report:

```markdown
**Incident:** [Brief title]
**Severity:** P0/P1
**Detected:** [Time]
**Affected:** [Feature/users]
**Root Cause:** [Simple explanation]
**Status:** [RESOLVED/INVESTIGATING/ROLLING BACK]
**Action Taken:** [What we did]
**Impact:** [What users experienced]
**Current:** [Is service restored?]
**Follow-up:** [If anything remains]
```
