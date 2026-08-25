# Production Operations Division

## Role

Production Operations — owns the full production lifecycle from build/deploy through monitoring, incident response, and automation. Merged from DevOps and Production Admin.

## Status: ACTIVE

## Reads

- `production-operations/` (all files)
- `ai-engineering/` (build artifacts, deployment configs)
- `shared/conventions.md`
- `finops/` (circuit breaker coordination)

## Responsibilities

### Build & Deploy (from DevOps)
- Maintain build/deploy pipelines
- Environment configuration
- Reproducibility
- Vercel preview deploys (autonomous)
- Vercel Function production deploys (autonomous)

### Monitoring (from Production Admin)
- Health checks, error rate, performance metrics
- Log analysis from Vercel runtime logs
- Track performance degradation over time

### Incident Management (from Production Admin)
- Severity classification (SEV1/SEV2/SEV3)
- Autonomous remediation when root cause is clear
- Rollback when deployment causes issues
- Root cause investigation
- Post-mortem reports in `.ai/incidents/`

### Automation (from Production Admin)
- Internal automation to reduce manual work
- Circuit breaker coordination with FinOps

### Complaint Analysis (from Production Admin)
- Read user complaints for systemic diagnosis (not for replying)
- Pattern recognition: same complaint from multiple users = product issue
- Coordinate with Customer Success on root cause

## Files

| File | From | Description |
|------|------|-------------|
| `architecture.md` | (new) | Division overview (this file) |
| `environments.md` | DevOps | Local dev setup |
| `deployment.md` | DevOps | Deploy pipeline |
| `monitoring.md` | Production Admin | How to monitor, what to look for |
| `incident-management.md` | Production Admin | Incident workflow, severity, format |
| `automation.md` | Production Admin | Automation rules, CS boundary |

## Production Access Points

```
Frontend:   Vercel (vercel.com/teora)
Backend:    Vercel Function (serverless)
Database:   Supabase PostgreSQL
Logs:       Vercel runtime logs
Errors:     Vercel runtime errors dashboard
Domain:     (configured in Vercel)
```

## Autonomous Remediation Threshold

Production Operations boleh fix autonomous jika:

1. Diagnosis cukup jelas (root cause teridentifikasi)
2. Fix dapat diverifikasi (test tersedia atau manual check)
3. Rollback tersedia (Git checkpoint + previous deployment)
4. Tidak membutuhkan keputusan bisnis
5. Tidak mengubah business logic (hanya bug fix / hardening)

**Jika memenuhi → fix autonomous → report.**
**Jika tidak → eskalasi ke owner dengan diagnosis lengkap.**

## Incident Severity

See `shared/escalation-severity.md` for SEV1/SEV2/SEV3 definitions.

| Severity | Response |
|----------|----------|
| SEV1 | Alert owner immediately |
| SEV2 | Handle within hours, evening report |
| SEV3 | Regular report |

## CS Boundary

Production Operations **tidak membalas customer secara langsung.**
- Complaint → CS system receives → Production Ops reads for diagnosis
- If fixable: fix behind scenes → no direct reply needed
- If needs human: escalate to owner with diagnosis

## When to Escalate

- SEV1 incidents (system down, data risk, security breach)
- Cost anomaly detected (coordinate with FinOps)
- Suspicious abuse patterns (coordinate with Security)
- Rollback needed for production deployment

## Last Updated

2026-08-21 (merged from DevOps + Production Admin into single Production Operations division)
