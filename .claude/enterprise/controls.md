# Enterprise Controls — Teora AI Engineering Team

> Governance rules for the Teora AI Engineering Team. Ensures quality, auditability, and accountability.

## Baseline

- **Repository:** https://github.com/sagise-ctrl/teora
- **Profile:** Full autonomous AI engineering team
- **Owner:** Non-technical, commercial focus — requires reports, not technical decisions

## Team Structure

11 divisions operating under autonomous execution model:

| Division | Responsibility |
|----------|---------------|
| Product | Requirements, roadmap, business rules |
| Architecture | System design, API, database |
| Development | Implementation, patterns |
| QA | Testing, regression |
| Security | Auth, authorization, threat model |
| Code Review | Review checklist, quality gate |
| DevOps | Deployment, CI/CD |
| Research | Library evaluation, tech decisions |
| Finance | Token economy, pricing, cost analysis |
| Design | Design system, UI |
| Production Admin | Monitoring, incidents, automation |

## Approval Expectations

### Owner Boundaries (always ask)
Owner decides on:
- Financial: purchases, subscriptions, refunds
- External Access: repo access, credential sharing
- Irreversible Destruction: data deletion, infrastructure destruction
- Legal/Business: contracts, commitments

### AI Team Autonomy (decide and execute)
AI team decides on:
- All technical decisions
- Implementation approach
- Code patterns and structure
- Performance optimization
- Security hardening
- Documentation updates

### Security-Sensitive Changes
Changes requiring explicit review before deploy:
- Authentication flow modifications
- Authorization/permission changes
- Database schema changes
- API key or credential handling
- Rate limiting adjustments
- CORS configuration

Process: Document in checkpoint → implement → verify → report to owner

### Audit Suppressions
When skipping a review or security check:
- Must include reason in code comment
- Narrowest viable matcher (not blanket suppressions)
- Document in `docs/ai-team/security/known-risks.md`

## Knowledge Base Updates

| Trigger | Update |
|---------|--------|
| Feature complete | Product + Architecture docs |
| Architecture change | Architecture + shared/architecture.md |
| Bug found/fixed | QA + Security docs |
| Technical decision | Shared/decisions.md |
| Dependency change | Research + Development |
| Deployment incident | DevOps + Production Admin |
| Production issue | Production Admin incident report |
| Security concern | Security + Production Admin |
| New pattern | Development/project-patterns.md |
| Old pattern removed | Remove from relevant docs |

## Reporting Cadence

Owner receives reports from:
- `.ai/progress.md` — Completed work log (per milestone)
- `.ai/current-task.md` — Active task status
- `.ai/blockers.md` — Items requiring owner decision
- `.ai/incidents/` — Production incident reports (immediate)

## Quality Gates

All tasks require:
1. Implementation complete
2. Typecheck passes
3. Build succeeds
4. Security review (per checklist)
5. Documentation updated
6. Checkpoint updated

## Skill Rollout

New skills or patterns:
1. Document in `docs/ai-team/development/`
2. Test on feature branch
3. Verify quality gates pass
4. Update team knowledge base
5. Report to owner if significant
