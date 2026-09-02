# Security Checklist

> Pre-deployment and ongoing security review checklist for Teora AI Academic Workspace.

## Pre-Deployment (Required before production launch)

### Authentication & Authorization
- [ ] Supabase Auth configured with email verification
- [ ] JWT validation on all API routes (Express middleware checks `req.user.id`)
- [ ] Project ownership verified before data access (`requireProjectOwnership`)
- [ ] Role-based access: owner/collaborator/viewer enforced
- [ ] Share tokens validated before granting project access
- [ ] No hardcoded secrets in codebase
- [ ] `.env` files gitignored (checked)
- [ ] No API keys in frontend bundle (checked)

### API Security
- [ ] CORS whitelist configured (`ALLOWED_ORIGINS` env var)
- [ ] Rate limiting on auth endpoints (`express-rate-limit`)
- [ ] Input validation with Zod on all request bodies
- [ ] SQL injection: all queries via Drizzle ORM (no raw SQL)
- [ ] Prompt injection protection: `sanitizeInstructionText()` strips dangerous patterns
- [ ] AI response sanitization: credential patterns stripped before storage/return
- [ ] No stack traces in API error responses
- [ ] JWT expiration properly validated (jose library)

### Database Security
- [x] RLS policies configured on all 21 tables ✅ DONE 2026-08-23
- [x] `rls_auto_enable` function: EXECUTE revoked from anon/authenticated ✅ DONE 2026-08-23
- [ ] Row-level access per-user verified (users see only their projects)
- [ ] Service role key used only in backend admin operations (never exposed to frontend)
- [ ] Supabase Storage bucket has RLS policies

### File Upload Security
- [ ] File type validation (mimeType check on uploads)
- [ ] File size limits enforced
- [ ] Upload filename sanitization (no path traversal)
- [ ] Storage bucket: public vs private correctly set
- [ ] Download endpoints validate user ownership

### AI Safety
- [ ] AI disclosure labels toggled per project (`aiDisclosure` flag)
- [ ] Prompt injection defense: user text sanitized before AI calls
- [ ] AI response sanitized (credential patterns stripped)
- [ ] AI usage logged for audit trail
- [ ] Rate limiting on AI calls (per user/IP)

### Frontend Security
- [ ] No sensitive data in URL query params
- [ ] Session tokens stored in httpOnly cookies
- [ ] XSS prevention: no `dangerouslySetInnerHTML`
- [ ] CSP headers configured (if needed)

## Post-Launch (Ongoing)

### Monitoring
- [ ] Failed auth attempt alerts
- [ ] Unusual API error rate monitoring
- [ ] AI API cost anomaly alerts
- [ ] Database connection error alerts

### Dependency Management
- [ ] `npm audit` runs in CI pipeline
- [ ] Security advisories reviewed weekly
- [ ] Dependencies updated monthly

### Access Control
- [ ] Supabase project: minimal team access
- [ ] Vercel project: environment variables not exposed
- [ ] GitHub: repo access restricted to team members
- [ ] Production database: no direct access except via migrations

### Compliance (Indonesia)
- [ ] UU PDP 2022: user data handling documented
- [ ] AI disclosure statement visible to users
- [ ] SKB 7 Menteri compliance reviewed

## Review Schedule

| Frequency | Activity |
|-----------|----------|
| Pre-launch | Full checklist review |
| Monthly | Dependency audit + security advisories |
| Quarterly | Threat model review + penetration testing |
| After any incident | Post-mortem + checklist update |

## Owner Actions Required

1. **Set production env vars** on Vercel dashboard:
   - `DATABASE_POOLER_URL`
   - `SUPABASE_URL`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AI_API_KEY`
   - `ALLOWED_ORIGINS`

2. **Configure payment provider** (Stripe/Midtrans) with webhook secrets

3. **Set up monitoring alerts** — see monitoring documentation

4. **Review AI disclosure** statement with legal counsel

5. **Configure backup strategy** for Supabase database

Last reviewed: 2026-08-23
Next review: 2026-09-23
