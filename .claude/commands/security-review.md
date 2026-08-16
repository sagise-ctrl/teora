# Security Review Workflow

> Standard security checklist for every feature and change in Teora.

## Pre-Review

- Read `docs/ai-team/security/threat-model.md`
- Read `docs/ai-team/security/security-checklist.md`

## Security Checklist

### Authentication & Authorization
- [ ] All new API routes check authentication (JWT validation)
- [ ] Authorization: user can only access their own data
- [ ] No hardcoded credentials or secrets
- [ ] Environment variables used for all secrets
- [ ] Rate limiting on auth endpoints
- [ ] JWT expiration properly enforced

### Input Validation
- [ ] All user input validated with Zod schemas
- [ ] No raw SQL — always Drizzle ORM
- [ ] File uploads: type and size validated
- [ ] User-generated content: sanitized before render
- [ ] URL parameters: validated (UUID format, etc.)

### Data Protection
- [ ] Sensitive data not logged
- [ ] Error responses don't leak stack traces
- [ ] Database connection uses SSL
- [ ] Passwords hashed (handled by Supabase)
- [ ] API keys rotated if exposed

### API Security
- [ ] CORS configured correctly
- [ ] No `Access-Control-Allow-Origin: *` unless public
- [ ] HTTP methods restricted to what's needed
- [ ] Status codes don't leak internal details

### Frontend Security
- [ ] No `dangerouslySetInnerHTML` with user content
- [ ] XSS: user input escaped in renders
- [ ] Auth tokens stored securely (httpOnly cookies or secure storage)
- [ ] Redirects validated (no open redirect)

## Common Vulnerability Patterns

| Vulnerability | Check |
|-------------|-------|
| SQL Injection | No raw SQL strings |
| XSS | `dangerouslySetInnerHTML`, innerHTML usage |
| CSRF | JWT in Authorization header (not cookies) |
| IDOR | Authorization checks on every request |
| Broken Auth | JWT validation on every route |
| Sensitive Data Exposure | Error messages, logs, response bodies |

## Review Output

If any item fails:
1. Document the finding in the PR/branch
2. Fix before merge
3. Re-test after fix

## Key Files

| File | Purpose |
|------|---------|
| `artifacts/api-server/src/app.ts` | Auth middleware setup |
| `lib/api-zod/src/generated/` | Zod input validation schemas |
| `docs/ai-team/security/threat-model.md` | Threat model |
| `docs/ai-team/security/security-checklist.md` | Detailed checklist |
