# Escalation & Incident Severity

## Severity Levels

Start with 3 levels — enough for Teora's current scale. Easier to add levels later than to simplify from too many at the start.

> **Important:** Severity = how big the impact is (objective fact). Priority = order of handling (considers severity + effort). When in doubt, round up (safer to treat SEV3 as SEV2 than vice versa).

| Level | Definition | Teora Examples | Response |
|-------|-----------|----------------|----------|
| **SEV1** | System completely down / user data at risk / secret leaked | Checkout dead, data breach, API keys exposed | Telegram alert immediately, Production Admin + Security handles, Management notifies Owner right away |
| **SEV2** | Major feature partially broken / AI cost spike outside normal pattern / complaint surge | One AI feature fails for some users, one account suddenly using far above-average cost, spike in user complaints | Handle within hours, in evening report if not yet resolved |
| **SEV3** | Minor bug / CS question outside AI capacity / small operational decision needed | Typo, rare edge case, question requiring human judgment | Regular report, no immediate alert |

---

## Severity Definitions Detail

### SEV1 — Critical

**Criteria:** One or more of:
- System completely unavailable
- User data exposed or at risk
- Secrets/credentials leaked
- Payment processing completely broken
- Security breach or attempted breach

**Response time:** Immediate (minutes)
**Communication:** Real-time Telegram alert to Owner
**Resolution target:** ASAP, with hourly updates

### SEV2 — High

**Criteria:** One or more of:
- Major feature degraded or partially broken
- AI cost anomaly outside normal pattern (FinOps circuit breaker may have triggered)
- Significant user complaint surge
- Performance degradation affecting user experience
- One user/account exhibiting suspicious/abuse patterns

**Response time:** Within hours
**Communication:** Evening report if not resolved by then
**Resolution target:** Within same business day if possible

### SEV3 — Medium/Low

**Criteria:** One or more of:
- Minor bug with limited impact
- Edge case affecting few users
- CS question outside AI capacity (escalated)
- Operational decision needed (small scope)
- Improvement suggestion from user data

**Response time:** Within days
**Communication:** Regular reports
**Resolution target:** Next sprint/cycle

---

## Escalation Paths by Division

### Production Incidents

```
Detection (any division)
  → Production Admin investigates
  → Classifies severity (SEV1/2/3)
  → SEV1: Alert Owner immediately + Telegram
  → SEV2: Handle + evening report
  → SEV3: Track + regular report
  → All: Post-mortem within 48h
```

### Financial Incidents

```
Cost anomaly detected (FinOps)
  → FinOps triggers circuit breaker if needed
  → FinOps alerts Management
  → SEV1/2: Management alerts Owner
  → FinOps investigates root cause
  → Post-mortem in `.ai/incidents/`
```

### Customer Success Escalations

```
CS request received
  → AI CS evaluates scope
  → Within scope: AI resolves
  → Outside scope / SEV1/2: Escalate to Management
  → Refund/compensation: Escalate to Owner
  → All: Track in reports
```

---

## Severity Calibration Review

Monthly calibration review:
- Were any SEV3 incidents actually SEV2 in disguise?
- Were any SEV2 incidents actually SEV1?
- Were decisions made at the right severity level?
- Adjust severity definitions if patterns emerge

This calibration ensures the system gets more accurate over time without accumulating a backlog of misclassified incidents.

---

## Post-Mortem Requirements

Every SEV1 and SEV2 incident requires a post-mortem:

File: `.ai/incidents/YYYYMMDD-NNN.md`

```
# Incident: [Brief Title]
Date: YYYY-MM-DD
Severity: SEV1/SEV2
Duration: X hours Y minutes
Status: Resolved

## What Happened
[Clear description]

## Root Cause
[Why did it happen?]

## Detection
- Was it detected automatically? How?
- Was it detected by a human?
- Time from incident start to detection: X

## Response
[What was done, when, by whom]

## Impact
[What was the business/user impact?]

## Lessons Learned
[What would we do differently?]

## Changes Made
[Concrete changes to prevent recurrence]
```
