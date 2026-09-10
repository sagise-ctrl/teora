# AI Engineering Team — Operational State

This directory contains AI team's working state. Updated at milestones by AI.

## Files

| File | Purpose |
|------|---------|
| `current-task.md` | Active task status and progress |
| `progress.md` | Completed work log (chronological) |
| `blockers.md` | Items waiting for owner decision |
| `incidents/` | Production incident reports |
| `checkpoints/` | Named checkpoints for resume |
| `sessions/` | Full discussion archives (turn-by-turn) |
| `daily/` | Daily status reports (owner-facing) |
| `knowledge/` | Long-term AI team knowledge base |
| `migrations/` | Database migration history |

## Rules

- AI updates these files at every milestone
- New sessions MUST read these files before starting work
- Owner can read these files to track AI team progress
- NEVER commit secrets, tokens, or credentials here
- These files are gitignored — not visible in repository

## Workflow

```
1. New session starts
2. Read .ai/current-task.md → understand active work
3. Read .ai/blockers.md → understand pending decisions
4. Read .ai/progress.md → understand what's been done
5. Read .ai/incidents/incident-registry.md → check recent incidents
6. Start or continue work
7. Update current-task.md at milestones
8. Update progress.md when work is completed
9. Update blockers.md when decision is needed
```

## Naming Conventions

### Current Task
- One active task at a time
- Use imperative mood: "Set up Vitest testing framework"
- Include estimated complexity: simple / medium / complex

### Progress
- Entries by date, newest first
- Format: `YYYY-MM-DD | [brief description] | [files changed] | [status]`
- Include what was done and outcome

### Blockers
- Owner decisions needed
- Include: decision topic, options considered, recommendation
- Remove when resolved

### Incidents
- Format: `YYYYMMDD-NNN.md` (e.g., `20260814-001.md`)
- See `incident-management.md` in `docs/ai-team/production-admin/` for format

### Checkpoints
- Format: `YYYY-MM-DD-<short-slug>.md`
- Created at major milestones (end of sprint, after major deploy, etc.)
- Should contain: session goal, final state, lessons learned, restart instructions for next session

### Sessions
- Format: `YYYY-MM-DD-<short-slug>.md`
- Full discussion archive turn-by-turn (tools used, decisions made, exact outputs)
- Created when owner asks "simpan sesi diskusi ini" or at end of complex debugging sessions
- Read alongside checkpoints when full traceability is needed
