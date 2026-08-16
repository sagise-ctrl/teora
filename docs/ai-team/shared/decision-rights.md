# Decision Rights

## RACI vs DACI — Two Different Frameworks

These serve different purposes. Do not mix into one matrix.

| Framework | Used For | Key Concept |
|-----------|----------|-------------|
| **RACI** | Routine work/execution within one division | Responsible (does the work), Accountable (one owner), Consulted, Informed |
| **DACI** | Cross-division decisions with one Approver | Driver (prepares options), Approver (final say — one person), Contributor, Informed |

---

## Decision Rights Matrix (DACI Approvers)

### Who Has the Final Say

| Decision Impact | Approver | Examples |
|-----------------|----------|----------|
| **Technical/routine operational** | AI division (autonomous) | Edit files, fix bugs, reply standard CS tickets, normal deployments |
| **Cross-division, small-medium impact** | Management | Minor feature prioritization, content/copy decisions, minor operational changes |
| **Major business impact** | **Owner** | Money transfers, new subscriptions/purchases, legal commitments, external party access, secret disclosure, irreversible destructive actions, strategic business decisions |

### Approver Definitions

| Role | Who |
|------|-----|
| **Owner** | Non-technical solo owner. Decides on money, legal, strategy, major commitments. |
| **Management** | AI division coordinating all other divisions. Decides on operational priorities and cross-division conflicts. |
| **AI divisions** | Each handles autonomous execution within their scope. |

---

## Escalation Path

When uncertain whether a decision needs Owner input:

1. **Does it involve money transfer or payment?** → Owner
2. **Does it involve legal commitment or contract?** → Owner
3. **Does it involve external party access or secret sharing?** → Owner
4. **Does it involve irreversible destructive action?** → Owner
5. **Is it ambiguous or risky with no clear precedent?** → Management (Management escalates to Owner if needed)

**Default to escalation, not assumption.** If in doubt, ask Management.

---

## RACI Template Per Division

Use this template when defining who does what within a process.

| Task | Responsible | Accountable | Consulted | Informed |
|------|-------------|-------------|-----------|----------|
| (define per process) | Who does the work | Who owns the outcome | Who advises | Who is notified |

### Example: Daily Financial Report

| Task | Responsible | Accountable | Consulted | Informed |
|------|-------------|-------------|-----------|----------|
| Collect daily cost data | FinOps | FinOps | — | Management |
| Calculate margin | FinOps | FinOps | — | Management |
| Write evening report | Management | Management | FinOps (numbers) | Owner |
| Alert on anomaly | FinOps | Management | — | Owner (if SEV2+) |

---

## Decision Documentation

All significant decisions (especially those escalated to Owner) must be documented in:
- `shared/decisions.md` — decision log
- `.ai/blockers.md` — decisions pending Owner input
- Incident reports in `.ai/incidents/` — for decisions made under pressure

Each decision record should include:
- What was decided
- Options considered
- Why this option was chosen
- Who approved
- Date
