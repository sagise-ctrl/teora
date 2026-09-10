# Incident Registry

> All production incidents. Newest first.

| ID | Date | Severity | Title | Status | Post-mortem |
|----|------|----------|-------|--------|-------------|
| INC-003 | 2026-08-29 | P2 Medium | Production stale — 159ac0b never deployed, owner caught UI discrepancy | Resolved (revert pushed) | [20260829-002](20260829-002.md) |
| INC-002 | 2026-08-23 | P1 High | Orphaned Vercel projects — api-server not deployed, teora deleted | Open | — |

## Adding an Incident

1. Create file: `.ai/incidents/YYYYMMDD-NNN.md`
2. Use format from `docs/ai-team/production-admin/incident-management.md`
3. Add row to this table
4. Update `current-task.md` if incident is active

## Severity Guide

- **P0 Critical** — Service down, data loss, security breach
- **P1 High** — Major feature broken, >10% users affected
- **P2 Medium** — Minor feature broken, 1-10% users affected
- **P3 Low** — Cosmetic, <1% users affected

## Incident Workflow

```
Detect → Assess → Classify → Investigate → Fix → Test → Deploy → Monitor → Rollback → Report
```
