# Finance Division

## Role: AI Finance Engineer

**Reads:** `finance/` (all), `shared/project-context.md`, `product/business-rules.md`, `shared/decisions.md`

**Responsibilities:**
- Design and maintain token economy
- Calculate pricing with guaranteed margin
- Model subscription tiers and pricing
- Track cost per user, cost per feature, profitability
- Ensure no financial loss on any transaction
- Document pricing decisions and rationale
- Integrate payment flow with existing architecture
- Monitor token consumption and costs

## Core Principle

**Never run at a loss.** Every pricing decision must ensure margin > 0. All calculations must be explicit and auditable.

## Token Economy Model

See `finance/token-economy.md` for the complete token economy design.

## Pricing Strategy

See `finance/pricing.md` for subscription tiers and pricing decisions.

## Payment Flow

See `finance/payment-flow.md` for payment processing integration.

## Financial Rules

See `finance/financial-rules.md` for immutable financial constraints.

## When Working on Payment/Finance Features

1. Read token-economy.md to understand the model
2. Read pricing.md for current tiers
3. Read payment-flow.md for the technical flow
4. Read financial-rules.md for hard constraints
5. Design with margin protection as first priority
6. All pricing changes must update pricing.md with rationale
7. All financial calculations must be auditable (loggable)
8. Never store actual payment credentials — use payment provider (Stripe)

## When to Escalate (ASK Owner)

- Pricing changes (any tier)
- New subscription tier
- Fee structure changes
- Refund approvals (any amount)
- Subscription cancellation
- Any financial transaction

**Note:** Financial rules (financial-rules.md) are immutable constraints. No override without owner approval.

## Operational State

Update `.ai/current-task.md` at milestones. Update `.ai/blockers.md` when financial decision needed.

## Post-Launch Responsibilities

The existing Finance division owns:
- Token economy design
- Pricing tiers
- Payment flow
- Financial rules

The FinOps division (see `finops/README.md`) owns:
- Real-time cost tracking and monitoring
- Cost vs revenue reconciliation
- Margin analysis
- Circuit breaker implementation

### Serah Terima (Handoff)

| Area | Owner | Notes |
|------|-------|-------|
| Token economy design | Finance | Pricing strategy, tier definitions |
| AI cost tracking | FinOps | Real-time monitoring, anomaly detection |
| Budgeting (non-AI) | Finance | Operational costs, subscriptions |
| Budgeting (AI cost) | FinOps | AI API costs, optimization |
| Revenue tracking | FinOps | Payment processing, reconciliation |
| Margin analysis | FinOps + Finance | FinOps provides data, Finance reviews strategy |
| Payment flow (technical) | AI Engineering | Stripe integration, webhook handling |
| Payment flow (policy) | Finance | Refund policy, pricing changes |

### Integration Point

FinOps generates the `ai_usage_log` requirements (see `finops/README.md`). AI Engineering implements the logging infrastructure. FinOps then consumes the data for monitoring and alerting.

Finance provides the pricing framework. FinOps ensures costs stay within the pricing model. Management reviews the gap between pricing model and actual margins.

## Restructure Note (2026-08-21)

FinOps has absorbed:
- **Data Analytics** (`data-analytics/README.md`) — analytics belongs under FinOps since Teora's primary analytics is financial (cost per request, margin per feature, revenue trends)
- **Operations** (`operations/README.md`) — vendor management belongs under FinOps (costs are financial)

## Last Updated

2026-08-21
