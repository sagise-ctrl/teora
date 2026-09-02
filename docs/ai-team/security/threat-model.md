# Threat Model

> Security threat analysis for Teora AI Academic Workspace. Last reviewed: 2026-08-23.

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│   Browser   │────▶│  Vercel CDN  │────▶│ API Server  │────▶│ Supabase  │
│  (React SPA)│     │  (Frontend) │     │  (Vercel    │     │ PostgreSQL │
└─────────────┘     └──────────────┘     │  Function)  │     └────────────┘
                                           └─────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │  AI API     │
                                           │  (OpenAI)   │
                                           └─────────────┘
```

### Components

| Component | Role | Trust Boundary |
|-----------|------|---------------|
| React SPA (Browser) | User interface | Untrusted |
| Vercel CDN | Static asset delivery | Semi-trusted |
| API Server (Vercel Function) | Business logic, auth, data access | Trusted |
| Supabase PostgreSQL | Data storage, RLS | Trusted |
| AI API (OpenAI-compatible) | AI generation | External |

---

## Identity & Access Management

### Actors

| Actor | Description | Trust Level |
|-------|-------------|-------------|
| Anonymous user | No JWT token | Untrusted |
| Authenticated user | Valid Supabase JWT | User-scoped |
| Collaborator | Project member with role | User + project-scoped |
| Project owner | Full project control | Full project access |
| API server (service role) | Backend operations | Full database access |
| AI API | External service | None |

### Authentication Flow

1. User signs in via Supabase Auth (email/password or OAuth)
2. Supabase returns JWT (15 min expiry) + refresh token (30 days)
3. Frontend stores JWT in memory (not localStorage — avoids XSS theft)
4. All API requests include `Authorization: Bearer <jwt>` header
5. Backend validates JWT using Supabase JWT secret via `jose` library
6. Refresh token rotation on each use

### Authorization Model

- **Row-Level Security (RLS)**: Default-deny, per-table policies based on `auth.uid()`
- **Project ownership**: `requireProjectOwnership()` middleware verifies user owns or collaborates on project
- **Role enforcement**: owner > collaborator > viewer (enforced in business logic)
- **Share tokens**: time-limited tokens bypass auth for specific project access

---

## Threat Analysis (STRIDE)

### S — Spoofing

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| JWT token theft via XSS | Low | High | No `dangerouslySetInnerHTML`, httpOnly cookie consideration |
| Credential brute force | Low | High | Supabase handles rate limiting on auth |
| Stolen refresh tokens | Medium | High | Refresh token rotation, short-lived JWTs |

**Mitigations:**
- Supabase email confirmation required for new accounts
- JWT expiration: 15 minutes (short-lived)
- Refresh token rotation on each use
- Consider httpOnly cookies for token storage

### T — Tampering

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| SQL injection via request params | Low | Critical | All queries via Drizzle ORM (parameterized) |
| Prompt injection in AI calls | Medium | Medium | `sanitizeInstructionText()` strips dangerous patterns |
| URL manipulation (IDOR) | Medium | High | `requireProjectOwnership()` on all data endpoints |
| File path traversal in exports | Low | Medium | Filename sanitization (`/^[a-zA-Z0-9_.-]+$/`) |

**Mitigations:**
- Drizzle ORM for all database queries (no raw SQL)
- Input validation with Zod on all request bodies
- Ownership checks before any data access
- AI prompt sanitization before sending to AI API

### R — Repudiation

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| User denies action | Low | Medium | Activity log (`logActivity()`) tracks all actions |
| AI-generated content attribution | Medium | Medium | AI usage log (`ai_usage_log` table) |

**Mitigations:**
- `activities` table logs all user actions with timestamps
- `ai_usage_log` tracks every AI API call (user, timestamp, tokens, cost)
- Export audit trail in `exports` table

### I — Information Disclosure

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| RLS bypass via service role | Low | Critical | Service role key used only server-side, never exposed |
| AI response leaking credentials | Low | High | Response sanitization strips credential patterns |
| Unprotected share token access | Medium | Medium | Tokens are single-use, time-limited |
| Stack traces in API errors | Low | Medium | Error handler catches all exceptions, returns generic messages |
| Sensitive data in logs | Low | Medium | No sensitive data in `console.log` |

**Mitigations:**
- RLS policies on all 21 tables (auth.uid() check)
- `sanitizeAIResponse()` strips email/password patterns from AI outputs
- Share tokens: UUID v4 with expiration
- Production error handler: no stack traces exposed

### D — Denial of Service

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| AI API cost explosion | Medium | High | Per-user rate limiting, token budget tracking |
| Large file upload exhaustion | Low | Medium | File size limits (configured in upload handler) |
| API rate limit bypass | Low | Medium | `express-rate-limit` on auth endpoints |
| Database connection exhaustion | Low | Medium | Supabase connection pooler, proper timeout handling |

**Mitigations:**
- AI rate limiting: per-user limits on AI calls
- Token usage tracked in `ai_usage_log`
- Rate limiter on auth endpoints
- Connection pooler via `DATABASE_POOLER_URL`

### E — Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Collaborator gains owner access | Low | High | Role checks in `requireProjectOwnership()` |
| Share token grants permanent access | Low | Medium | Token has `expiresAt`, deleted after use |
| JWT algorithm confusion | Low | Critical | `jose` validates algorithm, only HS256 allowed |

**Mitigations:**
- `requireProjectOwnership()` checks role before granting access
- Share token schema: `expiresAt` required, `usesLeft` optional
- JWT validation: explicit algorithm check via jose

---

## AI-Specific Threats

### Prompt Injection

**Attack vector:** User input embedded in AI prompts, e.g., "write a paper about [malicious instructions]"

**Mitigation:**
- `sanitizeInstructionText()` strips markdown, code blocks, and instruction patterns before injection
- Separate system prompt from user content
- AI response sanitization prevents credential leakage

**Remaining risk:** Sophisticated prompt injection may bypass pattern matching. Monitor AI usage logs for anomalies.

### AI Disclosure

**Requirement:** Projects can enable `aiDisclosure` flag to show AI-generated content indicators.

**Mitigation:**
- `aiDisclosure` stored per project in `project_metadata`
- Frontend toggles disclosure labels based on this flag

### AI Cost Anomaly

**Attack vector:** Malicious user or compromised account floods AI API, causing billing spike.

**Mitigation:**
- Rate limiting on AI endpoints (per-user)
- `ai_usage_log` tracks token usage per user
- Monthly token budget (future: implement per-user limits)

---

## Data Classification

| Data Type | Sensitivity | Storage | Protection |
|-----------|-------------|---------|------------|
| User credentials | Critical | Supabase Auth | Managed by Supabase |
| JWT tokens | High | Memory/cookies | HTTPS only, short expiry |
| Project documents | High | Supabase DB | RLS policies |
| AI usage logs | Medium | Supabase DB | RLS policies |
| Activity logs | Medium | Supabase DB | RLS policies |
| Share tokens | Medium | Supabase DB | UUID v4, time-limited |
| Payment info | Critical | Payment provider | Never stored in our DB |

---

## Security Architecture Decisions

### RLS as Primary Access Control

Teora uses Supabase RLS as the first line of defense. Every table has a default-deny policy.

**Pattern:**
```sql
-- User can read their own data
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING ((auth.uid()::text) = id);

-- User can update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING ((auth.uid()::text) = id);
```

### Service Role Separation

The API server uses a **service role key** for operations that bypass RLS:
- Admin-only operations
- Cross-user data aggregation
- AI usage logging

The service role key is stored as `SUPABASE_SERVICE_ROLE_KEY` env var in Vercel, never exposed to frontend.

### API Key Protection

| Key | Scope | Storage | Exposure |
|-----|-------|---------|----------|
| `SUPABASE_JWT_SECRET` | Verify user JWTs | Vercel env | Backend only |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB ops | Vercel env | Backend only |
| `AI_API_KEY` | AI API calls | Vercel env | Backend only |
| `DATABASE_POOLER_URL` | DB connections | Vercel env | Backend only |

### Export Security

Export files are stored server-side (`/tmp/academic-workspace-exports`), not in Supabase Storage, to avoid exposing them via public URLs. Download requires authentication and ownership check.

---

## Compliance (Indonesia)

### UU PDP 2022 (Personal Data Protection)

- User data (email, name, profile) is personal data under UU PDP 2022
- Data retention: user can request deletion (handled manually)
- AI usage logs contain anonymized usage data (not personal content)

### SKB 7 Menteri (AI Guidelines)

- `aiDisclosure` flag enables AI content labeling
- Users can disable AI features per project
- AI usage is logged for audit purposes

### TODO for Compliance

- [ ] Data deletion workflow (user-initiated account deletion)
- [ ] Data export for user (GDPR-style data portability)
- [ ] Privacy Policy document (see Tier 4)
- [ ] Terms of Service document (see Tier 4)

---

## Vulnerability Disclosure

If a security vulnerability is discovered:

1. **Do not** disclose publicly
2. Report to the development team immediately
3. Log in `.ai/incidents/` with severity P0/P1
4. Target remediation: P0 within 24 hours, P1 within 7 days

---

## Next Review

Quarterly review (next: 2026-11-23) or after any major architectural change.
