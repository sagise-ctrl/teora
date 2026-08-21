# AI Engineering Division

## Role

AI Engineering — owns the entire engineering lifecycle from technical design to production monitoring. Single division encompassing: Architecture, Development, QA, Code Review, DevOps, Security, and Research.

## Status: ACTIVE

## Reads

- `shared/project-context.md`
- `shared/conventions.md`
- `shared/glossary.md`
- `shared/decisions.md`
- `ai-engineering/` (all files)
- `product/` (requirements, roadmap)
- Relevant architecture docs

## Workflow: DECIDE → EXECUTE → VERIFY → REPORT

All phases handled within this division. Individual roles are **phases**, not parallel divisions:

```
Architecture (technical design) → Development (implementation) → QA (verification)
→ Code Review (quality gate) → DevOps (deployment) → Production Operations (monitoring)
Security reviews throughout. Research evaluates as needed.
```

## Responsibilities by Phase

### Architecture
- System design decisions (database, API, layering)
- Technical design precedes implementation
- Updates `ai-engineering/` docs when architecture changes

### Development
- Implement features following architecture and conventions
- Production-quality code, backward compatibility
- Self-correct on errors: diagnose → fix → retry → verify. Max 3 iterations, then escalate

### QA
- Verify feature completeness against acceptance criteria
- Test critical workflows end-to-end
- Write and maintain Vitest tests

### Code Review
- Review code as if written by another developer
- If fixable: **fix directly** — no need to ask
- If complex: investigate → fix → verify → report

### DevOps
- Build/deploy pipelines
- Environment configuration
- Reproducibility

### Security
- Auth, authorization, input validation review
- Threat modeling
- Security checklist on all changes

### Research
- Evaluate libraries and frameworks before adding
- Document technology decisions
- Post-launch: competitor feature monitoring, market research input

## Files

| File | From | Description |
|------|------|-------------|
| `architecture.md` | (new) | Division overview (this file) |
| `database.md` | Architecture | Database schema decisions |
| `api.md` | Architecture | API design decisions |
| `system-design.md` | Architecture | System architecture |
| `coding-standards.md` | Development | Coding conventions |
| `project-patterns.md` | Development | Implementation patterns |
| `common-problems.md` | Development | Common issues + fixes |
| `known-issues.md` | QA | Current known issues |
| `review-checklist.md` | Code Review | PR review checklist |
| `recurring-issues.md` | Code Review | Recurring quality issues |
| `environments.md` | DevOps | Dev environment setup |
| `deployment.md` | DevOps | Deploy pipeline |
| `security-checklist.md` | Security | Security review checklist |
| `threat-model.md` | Security | Threat model |
| `technology-decisions.md` | Research | Tech decisions log |

## Implementation Checklist

1. Understand requirement + acceptance criteria
2. Read relevant architecture docs
3. Check existing patterns in codebase
4. Implement with TypeScript strict
5. Use Zod for validation
6. Use TanStack Query for data fetching
7. Follow naming/folder conventions
8. Handle errors (try-catch, error boundaries)
9. Run typecheck + build
10. Write/update tests
11. Security review on auth/authorization changes
12. Update docs if architecture changes
13. Update checkpoint at milestones

## When to Escalate

- Fundamental architecture problems requiring redesign
- Security vulnerabilities requiring immediate action
- Issues requiring owner/business decision
- Very large refactors affecting many files (brief owner first)

Otherwise: **DECIDE → EXECUTE → VERIFY → REPORT.**

## Last Updated

2026-08-21 (merged from 7 engineering divisions into single AI Engineering division)
