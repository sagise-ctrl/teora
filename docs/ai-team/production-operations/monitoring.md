# Monitoring — AI Production Admin

## What to Monitor

### Health Endpoints

```
# Frontend health (Vercel)
https://[deployment].vercel.app/api/health

# Backend health (VPS)
https://api.teora.com/health
https://api.teora.com/api/health
```

### Key Metrics

| Metric | Normal Range | Warning | Critical |
|--------|-------------|---------|----------|
| Frontend error rate | < 0.1% | 0.1-1% | > 1% |
| API response time | < 200ms | 200-500ms | > 500ms |
| API error rate | < 0.5% | 0.5-2% | > 2% |
| Auth failure rate | < 1% | 1-5% | > 5% |
| Database latency | < 50ms | 50-200ms | > 200ms |
| Token balance alerts | > 0 | near 0 | 0 |
| Stripe webhook success | > 99% | 95-99% | < 95% |

### Monitoring Tools

| Tool | What It Shows | Access |
|------|--------------|--------|
| Vercel Runtime Logs | Serverless function logs, errors | Vercel dashboard / `vercel logs` |
| Vercel Runtime Errors | Grouped error clusters | Vercel dashboard |
| Web Analytics | Page views, errors, performance | Vercel dashboard |
| API server logs | Express route logs, queries | VPS server logs |
| Supabase Dashboard | DB health, connections, slow queries | Supabase dashboard |
| Stripe Dashboard | Payment failures, webhook issues | Stripe dashboard |

## Error Detection Patterns

### Frontend Errors (Vercel)

1. **Runtime errors** — check Vercel Runtime Errors dashboard
2. **API errors** — check API client error rates
3. **Auth errors** — JWT validation failures, expired sessions
4. **Build errors** — failed deployments
5. **Routing errors** — 404/500 on unexpected routes

### Backend Errors (VPS)

1. **Express errors** — pino logs, look for `level: 50` (error)
2. **Auth errors** — JWT validation failures, missing headers
3. **Database errors** — Drizzle ORM errors, connection issues
4. **AI provider errors** — OpenAI API failures, rate limits
5. **Payment errors** — Stripe webhook failures, signature validation

### Database Issues (Supabase)

1. **Connection exhaustion** — too many open connections
2. **Slow queries** — queries > 1s
3. **Migration failures** — schema push issues
4. **Data integrity** — constraint violations

### Payment Issues (Stripe)

1. **Webhook failures** — `payment_intent.succeeded` not received
2. **Signature errors** — webhook signature validation failures
3. **Dispute alerts** — chargebacks
4. **Failed charges** — card declined, insufficient funds
5. **Refund requests** — needs owner approval (ASK boundary)

## Log Analysis Commands

```bash
# Vercel function logs
vercel logs [project] --status=ERROR

# Vercel function logs with query
vercel logs [project] --query "TypeError"

# API server logs (on VPS)
# SSH to VPS then:
tail -f /var/log/teora/api.log

# Filter errors only
grep -i error /var/log/teora/api.log

# Recent errors
tail -100 /var/log/teora/api.log | grep ERROR

# Stripe webhook issues
grep -i stripe /var/log/teora/api.log | grep -i error

# Auth failures
grep -i "401\|403\|unauthorized" /var/log/teora/api.log
```

## Health Check Commands

```bash
# Frontend health
curl -s -o /dev/null -w "%{http_code}" https://[url]/api/health

# Backend health
curl -s -o /dev/null -w "%{http_code}" https://api.teora.com/health

# API endpoint test
curl -s https://api.teora.com/api/projects -H "Authorization: Bearer [token]"

# Database connection test
psql $DATABASE_URL -c "SELECT 1"

# Stripe webhook ping
curl -s https://api.teora.com/api/webhooks/stripe/ping
```

## Alert Thresholds

When detected, proceed to incident workflow:

| Alert | Action |
|-------|--------|
| Error rate > 1% | Investigate immediately |
| API down | Check server, restart if needed |
| Auth broken | Check JWT validation, Supabase JWKS |
| Payment failed | Check Stripe webhooks, logs |
| DB connection failed | Check Supabase, restart if self-hosted |
| Build failed | Check deployment logs, fix, redeploy |
| Token balance = 0 | Alert owner immediately |
| Security breach | Alert owner immediately, escalate |

## Proactive Monitoring Schedule

| Interval | Action |
|----------|--------|
| Every session start | Quick health check (curl health endpoints) |
| After every deployment | Verify health, check error rates |
| Daily | Review error logs, check Stripe dashboard |
| Weekly | Performance review, usage patterns |

## Monitoring → Incident Flow

```
Monitor detects anomaly
  → Check if real issue (not noise)
  → Classify severity
  → If P0/P1 and fixable: autonomous fix → report
  → If P2/P3: log → monitor → escalate if worsens
  → If needs owner decision: escalate with diagnosis
```
