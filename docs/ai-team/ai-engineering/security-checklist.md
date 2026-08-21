# Security Checklist

Security review checklist for Teora features. Complete before any feature PR.

## Authentication & Authorization

- [ ] Authentication enforced on all protected routes?
- [ ] Authorization checked (user owns the resource)?
- [ ] JWT validation includes expiration check?
- [ ] Cookie flags correct (`httpOnly`, `secure`, `sameSite`)?

## Input Validation

- [ ] All inputs validated with Zod?
- [ ] No raw SQL or string interpolation in queries?
- [ ] User input sanitized before rendering (XSS)?
- [ ] File uploads validated (size, type, content)?

## Secrets & Configuration

- [ ] No secrets, API keys, tokens in code or comments?
- [ ] Error messages do not leak sensitive info?
- [ ] Environment variables documented, no hardcoded values?
- [ ] `DATABASE_URL`, `SUPABASE_JWT_SECRET`, etc. only in env?

## API Security

- [ ] Rate limiting appropriate for the endpoint?
- [ ] CORS configured correctly?
- [ ] CSRF protection in place for state-changing operations?
- [ ] No verbose errors in production?
- [ ] Version endpoint info not exposed unnecessarily?

## Dependency Security

- [ ] Check for known vulnerabilities: `pnpm audit` (when configured)
- [ ] Review new dependencies before adding
- [ ] Prefer well-maintained packages with good security track records

## Data Handling

- [ ] Sensitive data not logged?
- [ ] Passwords/keys never in responses?
- [ ] User data isolated per tenant (user)?
- [ ] Deletion cascades handled (soft delete or hard delete)?
