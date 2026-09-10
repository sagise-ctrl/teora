# Incident Template

Use this format for every incident. See `incident-management.md` in `docs/ai-team/production-admin/` for full details.

```markdown
# Incident Report: [Brief Title]

## Metadata
- **ID:** YYYYMMDD-NNN
- **Detected:** YYYY-MM-DD HH:MM UTC
- **Severity:** P0/P1/P2/P3
- **Source:** monitoring / user complaint / alert
- **Status:** RESOLVED / INVESTIGATING / ESCALATED / ROLLED BACK

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
