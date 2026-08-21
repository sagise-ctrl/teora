# Threat Model

## Assets to Protect

- User credentials (Supabase Auth)
- JWT tokens (session cookies)
- Project data (documents, references, chat history)
- Database (all user data)
- API keys (AI_PROVIDER, SUPABASE_SERVICE_ROLE_KEY)
- File attachments

## Threats

### 1. Unauthorized Project Access
User accesses another user's project
- **Mitigation:** Every API route checks project ownership via user_id match
- **Severity:** High

### 2. JWT Token Theft
Attacker steals session cookie
- **Mitigation:** httpOnly, sameSite=strict cookies; short expiration
- **Severity:** High

### 3. AI Prompt Injection
Malicious input in instructions field
- **Mitigation:** Input sanitization before sending to AI; context isolation
- **Severity:** Medium

### 4. File Upload Exploitation
Malicious files uploaded
- **Mitigation:** Type validation, size limits, stored outside web root
- **Severity:** Medium

### 5. API Rate Limiting Bypass
Brute force auth
- **Mitigation:** 5 req/min rate limit on /api/auth/*
- **Severity:** Medium

### 6. Database Injection
SQL injection via parameters
- **Mitigation:** Drizzle ORM (parameterized queries), Zod validation
- **Severity:** Low (already mitigated)

### 7. Sensitive Data Exposure
Secrets in logs/responses
- **Mitigation:** pino logger redacts sensitive fields; error responses don't leak stack
- **Severity:** Medium

### 8. Referral Fraud
Users gaming referral system
- **Mitigation:** Referral status lifecycle (pending -> verified -> qualified -> rewarded -> rejected)
- **Severity:** Low
