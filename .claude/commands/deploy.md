# Deploy (Safe) — SOP-003 Universal Deploy Gate

Apply the deploy-safe skill BEFORE any deploy to Teora production.

## Usage

```
/deploy [path] [target]
```

Where:
- `[path]` is one of: `A` (GitHub integration), `B` (Vercel CLI manual), `C` (PAT API merge)
- `[target]` is the project: `backend`, `frontend`, or `both`

If invoked without arguments, ask which path and which target.

## What This Command Does

1. Load `.claude/skills/deploy-safe/SKILL.md`
2. Run pre-deploy checklist for the chosen path
3. Verify all 6 properties per the matrix for chosen path × target
4. Execute the deploy workflow for that path
5. Run post-deploy verification
6. Append audit log entry to `.ai/deploy-log.md`
7. Update `.ai/current-task.md` Handoff section
8. Report result with rollback command

## Hard Stops (Will Not Proceed)

- Pre-deploy checklist incomplete
- Previous stable deployment ID not recorded
- Rollback runbook not ready
- Audit log entry not drafted
- CI red without explicit override documented
- Build artifact stale (mtime older than source)

## When to Invoke

- Before any production deploy (frontend or backend)
- Before any hotfix that touches production
- Before any database schema migration that affects production
- After any ERR that requires code change to fix

## What This Command Does NOT Do

- Does NOT bypass owner's authorization requirement
- Does NOT execute Path C unless Path A/B impossible or owner explicitly approved
- Does NOT claim success before audit log entry written
- Does NOT skip verification steps

## Related

- Skill: `.claude/skills/deploy-safe/SKILL.md` (SOP-003)
- Supersedes: SOP-001 (4-step gate, path-conditional)
- Audit log: `.ai/deploy-log.md`
- Handoff template: `.ai/current-task.md` Handoff section
</content>
</invoke>