# Incident Registry

> All production incidents. Newest first.

| ID | Date | Severity | Title | Status | Post-mortem |
|----|------|----------|-------|--------|-------------|
| INC-011 | 2026-09-20 | **P1 High** | Analyze pipeline empty workspace — AI free-form taskType violates DB CHECK constraint → transaction rollback (Bug 1) + waitUntil silent failure no UI feedback (Bug 2) + errorMessage truncated at 500 chars hides DB errors (Bug 3) | Resolved (commit f50e7a4; backend deploy dpl_6U7rXUDQJo9wwYE9jN5ihNrK8YMQ; frontend deploy dpl_CH9BpT5VPKnWjyqbYaqRCW2YmZmo; DB migration applied; E2E owner-verify pending) | [20260920-004](20260920-004.md) |
| INC-010 | 2026-09-20 | **P1 High** | Analyze pipeline fail (Olagon model ID format) + profileRouter 404 (missing router.use wiring) | Resolved (commit 83d5e18, deploy dpl_HW6bHEK8tq9U7oNJ4hwAyAZxs8Ay; both fixes verified at HTTP layer; E2E owner-verify pending) | [20260920-002](20260920-002.md) |
| INC-009 | 2026-09-20 | **P1 Critical** | Task Mentor "Begin Analyze" hangs, no document — analyze route awaits pipeline sync, Vercel Hobby 10s SIGKILL mid-pipeline → no transaction commit → project stuck | Resolved (commit 512f843, deploy dpl_4grH2isdjAy9S6Ffae21K9sazbBA; waitUntil + maxDuration=60; project 22 + job 6 manually unblocked; E2E pending owner verify) | [20260920-001](20260920-001.md) |
| INC-006 | 2026-09-15 | **P0 Critical** | RLS gap: 10 user-facing tables RLS enabled but no policies + `rls_auto_enable()` SECURITY DEFINER anon-callable + leaked password protection disabled | **OPEN — awaiting owner authorization** | [20260915-001](20260915-001.md) |
| INC-007 | 2026-09-18 | P3 Low | Production /register throws uncaught ZodError (ERR-027 fix committed but never promoted) | Resolved (commit a20e764 promoted via `vercel promote dpl_7iMQf6SfeeSAnQZ85RwTYwbKeVtN`; post-promote sweep clean) | [20260918-002](20260918-002.md) |
| INC-008 | 2026-09-18 | P3 Low | Production POST /api/projects 400 → 500 — `taskType: "dashboard_chat"` rejected by Zod enum (DECISION 010) AND DB CHECK constraint | Resolved (OpenAPI enum extended, codegen, build, api-server deploy to dpl_HamBBEqL1JKvuJTa1rkKfKbuHmyy; DB CHECK constraint `projects_task_type_check` altered via Supabase MCP) | [20260918-003](20260918-003.md) |
| INC-005 | 2026-09-13 | P1 High | feat/daftar-task tiktoken persists; latest prod-target deploy 500 (no user impact, alias healthy) | Resolved (commit 66b1cab, deploy dpl_3862xm4zRniQPnduqCyuJZnEpMRg) | [20260913-002](../../.ai/current-task.md) |
| INC-004 | 2026-09-12 | P1 High | ERR-017 cherry-pick broke production (tiktoken WASM not bundleable) | Resolved (refactor deployed + production VERIFIED 200 OK) | [20260912-001](../../docs/ai-team/incidents/20260912-001.md) |
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
