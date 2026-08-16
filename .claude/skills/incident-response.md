# Incident Response Playbook

> Structured response workflow for production incidents in Teora. For AI Production Admin.

## Incident Severity Levels

| Level | Response Time | Example |
|-------|--------------|---------|
| P0 — Critical | Immediate | Site down, data breach, auth bypass |
| P1 — High | < 1 hour | Core feature broken, significant data loss |
| P2 — Medium | < 4 hours | Non-critical feature broken, degraded performance |
| P3 — Low | < 24 hours | UI bug, minor feature issue |

## Response Workflow

### 1. Detect
- Error monitoring: check error rates, latency spikes
- User reports: check support channels
- Automated alerts: check monitoring dashboard

### 2. Assess
- Identify affected users/features
- Estimate business impact
- Determine severity level
- Check recent deployments

### 3. Communicate
- Log incident in `.ai/incidents/YYYYMMDD-NNN.md`
- Update `.ai/blockers.md` if owner decision needed
- Monitor for escalation

### 4. Diagnose
- Review error logs (`vercel logs` or server logs)
- Check recent changes (git log, deployment history)
- Identify root cause
- Reproduce if possible

### 5. Fix
- Implement fix following `feature-development.md` workflow
- Test in development
- Deploy to production
- Monitor for resolution

### 6. Verify
- Confirm fix resolves issue
- No regression in other features
- Error rates return to normal

### 7. Report
- Update incident file with resolution
- Document root cause and fix
- Update knowledge base if new pattern discovered
- Report to owner

## Post-Incident Review

For P0/P1 incidents:
- What happened?
- Why did it happen?
- How was it resolved?
- What can prevent recurrence?
- Action items with owners

## Common Incident Patterns

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| 500 on API | Unhandled exception, DB error | Check server logs, restart PM2 |
| Frontend errors | Build issue, env var missing | Redeploy, check Vercel env vars |
| Auth failures | JWT secret mismatch, Supabase issue | Check env vars, verify Supabase status |
| Slow response | Database query, cold start | Add caching, check query performance |
| Data inconsistency | Race condition, missing validation | Add transactions, validate inputs |

## Key Contacts

| Service | Status Page |
|---------|-----------|
| Vercel | vercel.status.vercel.com |
| Supabase | status.supabase.com |
| PostgreSQL | Check via Supabase dashboard |

## Key Files

| File | Purpose |
|------|---------|
| `.ai/incidents/template.md` | Incident report template |
| `.ai/incidents/incident-registry.md` | All incidents index |
| `docs/ai-team/production-admin/monitoring.md` | Monitoring setup |
| `docs/ai-team/production-admin/incident-management.md` | Detailed process |
