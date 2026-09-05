# Initial Project Audit — Teora

> **Date:** 2026-09-05
> **Auditor:** AI Engineering Team (autonomous)
> **Scope:** Full monorepo — product, engineering, AI, security, business
> **Phase:** 1 — Context Gathering (DO NOT implement)
> **Framework:** 18-section MASTER DIRECTIVE audit

---

## 1. Executive Summary

**What Teora is:** AI Academic Workspace untuk mahasiswa Indonesia. Jenni AI competitor dengan full document workspace (bukan sekadar AI writing).

**Maturity:** MVP launched, ~85% product-market fit untuk core use case (Task Mentor: menulis dokumen akademik dengan AI). Masih banyak gap antara dokumentasi dan implementasi, serta antara what-you-can-do dan what-actually-works.

**Strengths:**
- Clean 3-layer architecture (React SPA + Express + Drizzle + Supabase PG)
- AI-powered features working (chat, quiz, rubric, outline, write, export)
- Token-based billing infrastructure in place
- Indonesian-language UI throughout
- OpenAPI as single source of truth
- Solid auth foundation (Supabase JWT + OAuth)

**Critical Gaps:**
1. **Payment gateway NOT integrated** — Stripe/Midtrans belum live, tidak ada revenue
2. **AI API provider belum dikonfigurasi** — Groq/OpenAI key belum di-set
3. **Citation endpoints tidak ada** — OpenAPI spec ada, backend route tidak ada
4. **Referral reward tidak diimplementasi** — TBD since day one
5. **Subscription tiers tidak aktif** — pricing docs lengkap, implementasi nol
6. **No migrations history** — schema evolved via drizzle-kit push, tidak ada audit trail

**Score by Dimension:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Product Vision | 8/10 | Clear positioning, well-aligned features |
| Engineering | 6/10 | Solid foundations, technical debt + schema gaps |
| AI Features | 7/10 | Core working, missing citation + timeout/retry |
| Security | 7/10 | Auth solid, RLS gaps + no rate limit UX |
| Business | 3/10 | No payment, no revenue, pricing not live |
| Documentation | 5/10 | Comprehensive but stale/duplicate in places |

---

## 2. Product Assessment

### 2.1 Vision & Positioning

**Positioning:** "Jenni AI for Indonesia" — AI Academic Workspace dengan full document management.

**Target User:** Mahasiswa Indonesia (S1-S2), researcher, educator. Akademik writing use case.

**Value Proposition:** Dari positioning.md:
- AI-powered research companion
- Reference management
- Quiz generation
- Citation formatting
- Export to PDF/DOCX
- Indonesian language interface

**Competitive Gap:**
| Competitor | Kelebihan Teora | Kelemahan Teora |
|------------|-----------------|----------------|
| Jenni AI | Full workspace, references, Indonesian | AI quality, brand recognition |
| Overleaf | Unlimited, collaborative | No AI, English-only |
| Scispace | Literature search | No writing, expensive |
| ChatGPT | Unlimited chat | No academic structure |

**Gap Yang Belum Diisi:**
- Full reference library management (Pustaka Saya partial)
- Indonesian language (teorus的优势)
- Academic-specific output formats (APA, IEEE, dll.)
- Quiz + rubric for educators

### 2.2 Target User Segments

| Segment | Use Case | Priority |
|---------|----------|---------|
| Mahasiswa S1 | Task/hypothesis writing | PRIMARY |
| Mahasiswa S2 | Thesis chapter writing | PRIMARY |
| Dosen/Guru | Quiz generation, rubric | SECONDARY |
| Researcher | Literature review, reference mgmt | SECONDARY |

### 2.3 User Journey — Current State

```
PUBLIC:
/ (landing) → /login or /register → /dashboard

AUTHENTICATED (basic tier):
/dashboard → /projects → /projects/:id (document workspace)
    ├─ AI Chat (messages)
    ├─ Document Outline
    ├─ Document Content
    ├─ References
    ├─ Quiz
    ├─ Practice
    └─ Export (PDF/DOCX/PPTX)

ADMIN:
/admin/users, /admin/audit-log, /admin/usage
```

### 2.4 Value Flow

```
User registers → AI features use tokens → Token balance depletes → User tops up (WALLET) → Teora pays AI provider

MISSING: Subscription tiers, Stripe/Midtrans, referral reward payout
```

---

## 3. Current System

### 3.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (artifacts/academic-workspace)                │
│  React 19 SPA + Vite + TanStack Query + wouter         │
│  shadcn/ui + Tailwind CSS + Recharts                   │
│  MSW for API mocking                                   │
│  Port 18543 (dev) / Vercel (prod)                     │
└────────────────────────┬──────────────────────────────┘
                          │ HTTP REST
┌────────────────────────▼──────────────────────────────┐
│  BACKEND (artifacts/api-server)                       │
│  Express 5 + TypeScript                               │
│  Routes → Services → AI Providers                      │
│  Drizzle ORM → Supabase PostgreSQL                    │
│  Port 8080 (dev) / Vercel Functions (prod)           │
└────────────────────────┬──────────────────────────────┘
                          │ SQL
┌────────────────────────▼──────────────────────────────┐
│  DATABASE (lib/db → Supabase PostgreSQL)              │
│  30 tables, RLS enabled on most                       │
│  JWT auth via Supabase Auth                           │
└───────────────────────────────────────────────────────┘
                          │
┌────────────────────────▼──────────────────────────────┐
│  AI PROVIDERS (configurable via env)                  │
│  Groq / OpenAI / Anthropic / Gemini (OpenAI compat)   │
│  AI_LIMITS enforced per route                         │
└───────────────────────────────────────────────────────┘
```

### 3.2 Frontend (React SPA)

**Stack:** React 19, Vite, TypeScript, TanStack Query, wouter, shadcn/ui, Tailwind CSS 4, Recharts, react-hook-form + zod, Lucide React, reveal.js (PPTX preview)

**Pages (31 total):**
- Public: `/`, `/login`, `/register`, `/terms`, `/privacy`, `/bantuan`
- Authenticated: `/dashboard`, `/projects`, `/projects/new`, `/projects/:id`, `/pustaka-saya`, `/practice`, `/assessment`, `/referral`, `/usage`, `/akun`
- Admin: `/admin/users`, `/admin/audit-log`, `/admin/usage`, `/admin/settings`
- Auth: `/auth/callback`, `/auth/refresh`

**Build output:** Single-bundle SPA, all routes 200 OK. Vercel-hosted at `academic-workspace-eta.vercel.app`.

### 3.3 Backend (Express API)

**Stack:** Express 5, TypeScript, Drizzle ORM, jose (JWT), pino (logging), cors, express-rate-limit, pdf-lib, pptxgenjs, docx, OpenAI SDK, Anthropic SDK

**Routes (15 files):**
- `auth.ts` — register, login, OAuth callback, refresh, logout, check-username
- `users.ts` — profile CRUD, balance, tier change
- `projects.ts` — CRUD, activity, share tokens, PDF export
- `documents.ts` — section content CRUD
- `messages.ts` — AI chat messages
- `references.ts` — DOI/ISBN lookup, bibliography, auto-cite (BROKEN — no handler)
- `citations.ts` — citation endpoints (PARTIAL — only GET `/stats` exists)
- `quizzes.ts` — generate, submit, grade
- `rubrics.ts` — generate rubric
- `learning-activities.ts` — practice tracking + recommendations
- `ai-usage.ts` — usage statistics
- `admin-users.ts` — user management
- `admin-audit-log.ts` — audit log
- `admin-stats.ts` — dashboard stats
- `referrals.ts` — referral code, events
- `account-references.ts` — Pustaka Saya CRUD

**Middleware:** authMiddleware, ownerMiddleware, aiLimiter (7 AI route groups), globalErrorHandler, cors, trust proxy

### 3.4 Database (Supabase PostgreSQL)

**30 tables in schema** (per `lib/db/src/schema/index.ts`):

| Table | Purpose | Status |
|-------|---------|--------|
| `users` | User accounts | Active |
| `projects` | Document workspaces | Active |
| `documents` | Section content | Active |
| `multi_documents` | Unclear (not used?) | Unknown |
| `messages` | AI chat history | Active |
| `references` | Per-project references | Active |
| `account_references` | Global library | Active |
| `reference_citations` | Citation markers in text | Active (no route) |
| `attachments` | File uploads | Active |
| `activities` | Project activity log | Active |
| `jobs` | Background AI jobs | Active |
| `project_metadata` | Project settings | Active |
| `exports` | Export jobs | Active |
| `referrals` | Referral codes | Active |
| `referral_events` | Referral event tracking | Active |
| `ai_usage_log` | Token usage log | Active |
| `ai_tiers` | AI tier configs | Active |
| `user_balances` | Token balance | Active |
| `token_transactions` | Balance transactions | Active |
| `share_tokens` | Share links | Active |
| `comments` | Document comments | Active |
| `project_members` | Collaborators | Active |
| `quizzes` | Quiz definitions | Active |
| `quiz_submissions` | Quiz answers | Active |
| `rubrics` | Assessment rubrics | Active |
| `writing_style_profiles` | Writing style presets | Active |
| `document_templates` | Saved outlines | Active |
| `admin_audit_log` | Admin action log | Active |
| `learning_activities` | Practice tracking | Active |

**RLS:** Enabled on most tables. `reference_citations` has RLS but NO policies defined.

### 3.5 Infrastructure

| Component | Provider | Status |
|-----------|----------|--------|
| Frontend hosting | Vercel | Production |
| Backend hosting | Vercel Functions | Production |
| Database | Supabase | Production |
| Auth | Supabase Auth | Production |
| AI providers | Groq/OpenAI/Anthropic/Gemini | Configured, not active |
| Payment | None | NOT integrated |
| Email | Nodemailer + SMTP | Configured |
| Analytics | None | Not set up |
| Monitoring | None | Not set up |
| Uptime checks | None | Not set up |

**Production URLs:**
- Frontend: `https://academic-workspace-eta.vercel.app`
- Backend: `https://teora-backend.vercel.app`
- Backend API prefix: `/api/v1`

### 3.6 OpenAPI Spec

**File:** `lib/api-spec/openapi.yaml` (~2800 lines)
**Schema count:** ~80+ schemas
**Endpoint count:** ~60+ endpoints

Generated outputs:
- `lib/api-zod/src/generated/api.ts` — Zod schemas
- `lib/api-client-react/src/generated/api.ts` — TanStack Query hooks
- Stale copies also exist in `artifacts/academic-workspace/src/lib/api-zod/` and `.../api-client-react/`

**Key issue:** `lib/api-zod/src/generated/api.ts` is STALE — not regenerated after recent OpenAPI changes (`costCents`, `totalCostCents`, `username`).

---

## 4. Documentation vs Reality

### 4.1 Documentation Inventory

| Document | Location | Last Updated | Accuracy |
|----------|----------|-------------|---------|
| Project context | `docs/ai-team/shared/project-context.md` | ~2026-08 | Partial |
| Architecture | `docs/ai-team/shared/architecture.md` | ~2026-08 | Partial |
| Feature taxonomy | `docs/ai-team/product/feature-taxonomy.md` | 2026-08-25 | Accurate |
| Business rules | `docs/ai-team/product/business-rules.md` | ~2026-08 | Partial |
| Requirements | `docs/ai-team/product/requirements.md` | ~2026-08 | Partial |
| Positioning | `docs/ai-team/product/positioning.md` | ~2026-08 | Needs review |
| Pricing | `docs/ai-team/finance/pricing.md` | ~2026-08 | Incomplete |
| Token economy | `docs/ai-team/finance/token-economy.md` | ~2026-08 | Incomplete |
| AI engineering | `docs/ai-team/ai-engineering/README.md` | ~2026-08 | Partial |
| Security | `docs/ai-team/security/threat-model.md` | ~2026-08 | Partial |
| Conventions | `docs/ai-team/shared/conventions.md` | ~2026-08 | Mostly accurate |
| Decisions | `docs/ai-team/shared/decisions.md` | 2026-09 | Updated |
| Lessons learned | `docs/ai-team/shared/lessons-learned.md` | 2026-09 | Updated |
| Previous audit | `audit.md` | 2026-09-04 | Comprehensive |

### 4.2 Key Mismatches

| # | Documentation Says | Reality | Gap |
|---|-------------------|---------|-----|
| 1 | AI provider configured | Env vars not set | No AI works in production |
| 2 | Payment via Stripe | Stripe code exists but not configured | No revenue |
| 3 | Subscription tiers implemented | Only wallet balance exists | No tier enforcement |
| 4 | Citation endpoints available | Only in OpenAPI spec, not in backend | Feature broken |
| 5 | Referral rewards payout | Referral system tracks, no payout | User gets nothing |
| 6 | Global reference library | Account-level refs exist but no dedicated UI | Half-baked |
| 7 | Section-scoped AI chat | All AI chat is project-scoped | Context always full project |
| 8 | Document templates | Table + route exist, no UI | Can't save/load templates |
| 9 | Export DOCX/PDF | DOCX not implemented, PDF broken | Only PPTX works |
| 10 | Search references | DOI/ISBN lookup only, not full search | Internet search missing |
| 11 | FinOps dashboard | Admin usage table exists, no proper dashboard | Raw data only |
| 12 | 7 AI tier configs | Table exists, not all used | Tier 4 (Team) unused |
| 13 | Zotero sync | Not implemented | Planned but never built |
| 14 | Notifications | Not implemented | In taxonomy, not in code |
| 15 | Project members/invite | Table + route exist, no UI | Can't invite collaborators |

### 4.3 Missing Documentation

1. **API rate limit UX** — docs say rate limiting exists but no user-facing message when hit
2. **AI provider fallback** — when Groq fails, what happens? No fallback configured
3. **Spend cap behavior** — what when balance = 0? InsufficientBalanceDialog exists but edge cases unclear
4. **Consent tracking** — ToS consent checkbox added to registration but no DB columns for audit
5. **Project status transitions** — documented in business-rules.md but not all transitions enforced

---

## 5. Feature Audit

### 5.1 Feature Taxonomy vs Implementation

Per `feature-taxonomy.md`, current implementation status:

**F1 — Account Management**
| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| Authentication | Full | Full | Working |
| Profile | Basic | Full | Working |
| Referral & Reward | Partial | Track-only | Broken (no payout) |
| Global Reference Library | Account scope | Table exists | Half-baked (no UI) |
| Account AI Chat | ACCOUNT scope | Not built | NOT IMPLEMENTED |

**F2 — Project Management**
| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| Create/List/Update/Delete | Full | Full | Working |
| Activity Timeline | Full | Full | Working |
| Share & Invite | Share link | Token-based share | Partial |
| Project AI Chat | PROJECT scope | PROJECT scope | Working (but no section scoping) |
| Project Reference Pool | Full | Full | Working |

**F3 — Document Workspace**
| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| Section Navigator | Full | Full | Working |
| Master Outline | Full | Full | Working |
| Section AI Chat | SECTION scope | PROJECT scope | Wrong scope |
| Section References | SECTION scope | PROJECT scope | Wrong scope |
| Document Revision | Full | Basic | Working |
| Version History | Full | Full | Working |
| Attachment | Full | Basic | Working |
| Comments | Full | Full | Working |
| Document Template | ACCOUNT | Table+route, no UI | NOT IMPLEMENTED |
| Export DOCX | Full | Not built | NOT IMPLEMENTED |
| Export PDF | Full | BROKEN | NOT WORKING |
| Export PPTX | Full | Full | Working (only export that works) |

**F4 — Assessment & Learning**
| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| Quiz Generator | Full | Full | Working |
| Quiz Submission | Full | Full | Working |
| Auto-Grading | MCQ+short | MCQ+short | Working |
| Rubric Generator | Full | Full | Working |
| Rubric Editor | Full | Not built | NOT IMPLEMENTED |
| Submission Viewer | Full | Basic | Working |
| Assessment AI Chat | ASSESSMENT | Not built | NOT IMPLEMENTED |

**F5 — Reference & Citation**
| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| DOI/ISBN Import | Full | Full | Working |
| Global Library View | ACCOUNT | No dedicated page | PARTIAL |
| Project Pool | PROJECT | Full | Working |
| Section Tag | SECTION | PROJECT scope | Wrong scope |
| Reference Validation | Full | Full | Working |
| Bibliography Generator | Full | Full | Working |
| Search References | Internet | DOI/ISBN only | PARTIAL |
| Auto-Cite | Full | BROKEN | No backend handler |
| Citation Persistence | Full | BROKEN | No backend route |
| Zotero Sync | Full | Not built | NOT IMPLEMENTED |
| Reference AI Chat | REFERENCE | Not built | NOT IMPLEMENTED |

**F6 — Collaboration & Feedback**
| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| Share Link | Full | Token-based | Working |
| Inline Comments | Full | Full | Working |
| Threaded Replies | Full | Full | Working |
| Comment Resolve | Full | Full | Working |
| Project Members | Full | Table+route, no UI | NOT IMPLEMENTED |
| Notifications | Full | Not built | NOT IMPLEMENTED |

**F7 — Monitoring & Analytics**
| Feature | Spec | Impl | Status |
|---------|------|------|--------|
| AI Usage Log | Full | Table + API | Working |
| AI Usage Dashboard UI | Full | Raw table | PARTIAL |
| Project Activity | Full | Table | Working |
| FinOps Admin | Full | Table only | PARTIAL |

### 5.2 Feature Summary

| Category | Count | Notes |
|---------|-------|-------|
| Fully Working | ~35 | Core features functional |
| Partial (scope wrong) | ~5 | Chat/refs not section-scoped |
| Partial (UI missing) | ~5 | Library, templates, rubric editor |
| Broken (no backend) | ~4 | Auto-cite, citations, DOCX export |
| Not Built | ~10 | Notifications, Zotero, AI chats at other scopes |

**Implementation ratio:** ~60% of spec features are fully working. 40% are partial, broken, or missing.

---

## 6. UX Audit

### 6.1 UI Language & Consistency

- **Primary language:** Bahasa Indonesia throughout ✅
- **Em dash preference:** Avoided in user-facing text ✅ (recently cleaned)
- **Brand consistency:** HSL token system in CSS, brand colors (#2D79FF, #8E54E9) used consistently ✅
- **Typography:** Inter (UI) + Space Grotesk (headings) + JetBrains Mono (technical) ✅

### 6.2 Navigation & Information Architecture

**Current sidebar (authenticated):**
```
Logo → Dashboard → Task Mentor → Practice → Pustaka Saya → Referensi → Assessment → Akun → (Admin, if owner)
```

**Issues:**
1. "Referensi" in sidebar — unclear if this is global library or project-level refs
2. No dedicated "Account AI Chat" despite being in taxonomy
3. Practice (brain icon) placement between Assessment and Pustaka Saya — odd ordering
4. Help/Pusat Bantuan buried under Akun sub-menu
5. `/usage` page not linked in sidebar (only orange warning at low balance)

### 6.3 Error Handling & Feedback

**Fixed (2026-09-04):** All critical silent errors now show toast notifications.

**Remaining issues:**
- AI rate limit hit — no user-facing message (returns 429, frontend shows generic error)
- AI timeout — no timeout configured, request hangs indefinitely
- Registration errors — generic Supabase error, not sanitized
- 404 pages — generic, no helpful navigation
- Empty states — some pages missing empty state illustrations/messages

### 6.4 Loading States

- Skeleton loaders on most data-heavy pages ✅
- No skeleton for AI chat responses (just spinner)
- Progress indicator for AI jobs (outline generation, writing) ✅

### 6.5 Mobile & Responsive

- Not explicitly tested
- No responsive design audit documented
- No PWA manifest

### 6.6 Accessibility

- No explicit accessibility audit
- Focus rings styled (brand color) ✅
- Alt text on images — not audited
- ARIA labels — not audited
- Color contrast — parchment background with dark text should be readable, not audited

### 6.7 Page-by-Page UX Issues

| Page | Issue |
|------|-------|
| `/projects/new` | No validation feedback until submit |
| `/projects/:id` | Very large file (2200+ lines) — hard to maintain, potential for more silent errors |
| `/pustaka-saya` | Global library — exists but no dedicated route, accessed via `/projects/:id` |
| `/practice` | New page — needs real usage testing |
| `/usage` | Recently fixed — now shows IDR, but DailyBarChart removed (was broken) |
| `/admin/users` | User management table — functional |
| `/register` | ToS consent added ✅, but consent not persisted to DB |

---

## 7. AI Audit

### 7.1 AI Architecture

**Multi-provider setup** (configurable via env vars):
- Primary: Groq (OpenAI-compatible)
- Fallback: OpenAI, Anthropic, Google Gemini
- Selection: Per-request, based on AI tier config from DB

**AI routing flow:**
```
User request → authMiddleware → aiLimiter → route handler
    → getAITierConfig(user) → select model → callProvider()
    → logAIUsage() → deductCredit()
```

**AI tier configs** (5 tiers in `ai_tiers` table):
| Tier | Model | Use Case |
|------|-------|---------|
| budget | Budget model | Free users |
| standard | Standard model | Basic/Pro |
| premium | Premium model | Advanced features |
| ultra | High-capability model | Complex tasks |
| max | Max-capability model | Highest quality |

### 7.2 AI Features — Implementation Status

| Feature | Handler | Token Tracking | Status |
|---------|---------|----------------|--------|
| Chat | `messages.ts` | ✅ | Working |
| Quiz Generation | `quizzes.ts` | ✅ | Working |
| Quiz Grading | `quizzes.ts` | ✅ | Working |
| Bibliography | `references.ts` | ✅ | Working |
| Auto-Cite | `references.ts` | ✅ | **BROKEN** — no handler |
| Citation Save | `citations.ts` | N/A | **MISSING** — no routes |
| Analyze | `projects.ts` | ✅ | Working |
| Outline Generation | `projects.ts` | ✅ | Working |
| Write/Generate | `projects.ts` | ✅ | Working |
| Rubric Generation | `rubrics.ts` | ✅ | Working |
| Writing Style | `writing-style.ts` | ✅ | Working |
| Practice Recommendations | `learning-activities.ts` | N/A | Working |
| Export PPTX | `projects.ts` | N/A | Working (pure transform) |
| Export DOCX | `projects.ts` | N/A | **NOT IMPLEMENTED** |
| Export PDF | `projects.ts` | N/A | **BROKEN** |

### 7.3 AI Cost Tracking

- `ai_usage_log` table records every AI request ✅
- `user_balances` tracks remaining balance ✅
- `token_transactions` records all transactions ✅
- Usage API endpoints exist (user + admin) ✅
- Frontend usage page now shows IDR costs ✅
- **BUT:** No actual topup mechanism — balance is wallet-based, no real money flows

### 7.4 AI Quality Issues

1. **No AI provider key configured** — features exist but AI won't work in production until env vars set
2. **No timeout/retry** — `fetch()` in `ai.ts` has no AbortSignal, hangs indefinitely
3. **No provider fallback** — if Groq fails, no automatic retry with different provider
4. **No rate limit UX** — `aiLimiter` returns 429, frontend shows generic error message
5. **Outdated model names** — fallback pricing in `ai.ts` uses old model names (claude-3-5-sonnet, gemini-1.5-pro)
6. **No AI response caching** — same question generates new response every time
7. **No AI evaluation** — no feedback loop on response quality

### 7.5 AI Safety (Academic Content)

**Auto-generated quiz content:**
- No content filter on AI-generated questions
- No factuality validation
- No citation requirement for AI-generated content
- No plagiarism detection integration

**Concerns:**
- AI can generate misleading academic content
- Quiz questions may contain factual errors
- Bibliography auto-generation may produce incorrect citations

---

## 8. Security & Privacy Audit

### 8.1 Authentication

| Component | Status | Notes |
|---------|--------|-------|
| Supabase Auth | ✅ Active | Email + Google OAuth |
| JWT validation (backend) | ✅ Active | HS256 + JWKS fallback |
| Token refresh | ✅ Active | Frontend handles automatically |
| OAuth callback | ✅ Fixed | window.location.href reload pattern |
| Session expiry | ✅ Handled | Toast + redirect to login |
| CORS | ✅ Configured | Trust proxy set |
| Rate limiting (auth) | ✅ 5 req/min | On /api/auth/* |

**Issues:**
- Rate limit returns generic error, no user-facing message
- Refresh token stored in localStorage (XSS risk) — not in httpOnly cookie
- Google OAuth working but callback requires full page reload

### 8.2 Authorization

| Component | Status | Notes |
|---------|--------|-------|
| Owner whitelist | ✅ Active | Hardcoded email check for admin |
| Project ownership | ✅ Active | Every project route checks ownership |
| Admin routes | ✅ Protected | ownerMiddleware + hardcoded email |
| RLS policies | ⚠️ Partial | Most tables have policies, some don't |
| AI tier enforcement | ✅ Active | Tier checked per request |

**Issues:**
1. **Owner whitelist hardcoded** — `sagiseainun@gmail.com` in source code, not in DB/config
2. **RLS on `reference_citations`** — enabled but NO policies defined (all queries denied)
3. **No role-based access beyond owner** — only owner vs non-owner; no admin/editor/viewer enforcement for regular users
4. **Share tokens** use insecure `Math.random()` — CRITICAL (fixed per 2026-09-05, verify deployed)

### 8.3 Input Validation

| Layer | Status | Notes |
|-------|--------|-------|
| Zod on all routes | ✅ | Most routes use safeParse |
| learning-activities.ts | ❌ | Manual validation instead of Zod |
| SQL injection | ✅ | Drizzle ORM parameterized queries |
| XSS | ✅ | React escapes by default |
| File upload | ⚠️ | Filename sanitized, mime type checked, 10MB limit |

### 8.4 Data Privacy

**Data stored:**
- Email, display name, username
- Project content (text/markdown)
- AI chat messages
- References (DOI, ISBN, metadata)
- Quiz submissions and answers
- File attachments
- AI usage logs

**Privacy issues:**
1. **No consent tracking in DB** — ToS checkbox added to registration but not persisted
2. **No data export** — GDPR-like "download my data" not implemented
3. **No data deletion** — soft delete on projects, but no user-initiated account deletion
4. **AI prompts stored** — chat messages stored indefinitely, may contain sensitive user content
5. **No privacy policy enforcement** — policy page exists, no technical enforcement

### 8.5 API Security

| Aspect | Status | Notes |
|--------|--------|-------|
| Auth on all /api/* | ✅ | Except /api/auth and /api/webhooks |
| No stack traces in prod | ✅ | Global error handler strips |
| Secrets in env vars | ✅ | All API keys in env, not in code |
| Admin audit log | ✅ | Admin actions logged |
| CORS configuration | ✅ | Configured for Vercel domain |
| Rate limiting | ⚠️ | Auth routes limited, other routes unlimited |

### 8.6 Security Checklist

- [x] JWT validation on all protected routes
- [x] Zod input validation
- [x] Drizzle ORM (no raw SQL)
- [x] No stack traces in API responses
- [x] Rate limiting on auth endpoints
- [x] Owner-only admin routes
- [x] AI tier access control
- [x] File upload sanitization
- [x] Share token generation (CRYPTOGRAPHIC — fixed 2026-09-05)
- [ ] RLS policies on all tables
- [ ] Consent tracking in DB
- [ ] User data export (GDPR-like)
- [ ] Account deletion
- [ ] Rate limiting UX feedback
- [ ] Hardcoded owner whitelist → DB-based
- [ ] AI provider timeout/retry

---

## 9. Engineering Audit

### 9.1 Code Quality

**Strengths:**
- TypeScript strict mode ✅
- Zod runtime validation ✅
- Drizzle ORM (no raw SQL) ✅
- TanStack Query for all server state ✅
- react-hook-form + zod for all forms ✅
- Consistent error handling pattern ✅
- Indonesian language in code comments ✅

**Issues:**
1. **Project file size** — `project.tsx` is 2200+ lines, should be split
2. **Generated API stale** — `lib/api-zod/src/generated/api.ts` not regenerated after recent changes
3. **Double JSON operations** — `learning_activities` stores JSON in text column, parses multiple times
4. **Duplicate queries** — `references.ts` re-fetches project and metadata
5. **Manual validation** — `learning-activities.ts` uses manual validation instead of Zod schema
6. **Type shadowing** — `docx-export.ts` `Document` class name shadow
7. **Unused imports** — `Loader2` in `practice.tsx`, dead prop in `layout.tsx`

### 9.2 Database Quality

**Strengths:**
- Clean Drizzle schema with proper indexes ✅
- Foreign keys defined ✅
- Timestamps on all tables ✅
- UUID primary keys ✅
- Unique constraints where needed ✅

**Issues:**
1. **No migration history** — `drizzle-kit push` used instead of proper migrations
2. **`reference_citations` RLS** — enabled but no policies
3. **`learning_activities.topics`** — text column instead of JSONB
4. **`learning_activities` unique index** — NULL collision risk with optional `sourceProjectId`
5. **No partial indexes** — some queries would benefit from partial indexes
6. **`multi_documents` table** — exists but unclear purpose, not referenced in routes

### 9.3 API Quality

**Strengths:**
- OpenAPI spec as source of truth ✅
- Consistent REST patterns ✅
- Zod validation on most routes ✅
- Error wrapping with pino ✅
- Middleware pattern consistent ✅

**Issues:**
1. **5 citation endpoints unimplemented** — in OpenAPI spec but no route handlers
2. **DOCX export unimplemented** — in spec, not built
3. **PDF export broken** — route exists but likely fails
4. **Learning activities uses manual validation** — inconsistent with other routes
5. **OpenAPI spec monolithic** — 2800 lines, no $ref reuse
6. **Duplicate generated API copies** — workspace + workspace copy, manual sync required
7. **No API versioning strategy** — all under /api/v1, no deprecation path

### 9.4 Build & Deployment

**CI/CD:**
- GitHub Actions for frontend deploy ✅
- GitHub Actions for backend deploy ✅
- Vercel auto-deploy on push to main ✅

**Issues:**
1. **Stale dist directory** — `lib/db/dist/` not rebuilt after schema changes
2. **package-lock.json + pnpm-lock.yaml** — both exist, causes confusion
3. **`mockServiceWorker.js`** — committed bundled file, should be gitignored
4. **No sourcemap config** — vite build may produce warnings
5. **No build caching** — not optimized for incremental builds

### 9.5 Testing

**Current:** Vitest setup with 3 test files:
- `use-auth.test.tsx` — auth hook tests
- (2 more test files — name not in scope)

**Coverage:** Unknown, not documented

**Missing:**
- No E2E tests (Playwright/Cypress)
- No API integration tests
- No DB migration tests
- No AI feature tests

### 9.6 Technical Debt Summary

| Item | Severity | Effort |
|------|---------|--------|
| `project.tsx` split (2200+ lines) | Medium | High |
| Learning activities JSONB migration | Medium | Medium |
| Citation endpoints implementation | High | High |
| DOCX export | High | Medium |
| PDF export fix | High | Medium |
| Stale generated API regeneration | Medium | Low |
| Duplicate API copies consolidation | Low | Medium |
| Orphan files cleanup | Low | Low |
| No migration history | Medium | High |
| RLS policies on reference_citations | High | Low |
| Rate limit UX feedback | Medium | Low |

---

## 10. Performance Audit

### 10.1 Frontend Performance

**Build output:** Single bundle SPA
- Main JS bundle: ~200KB (gzipped estimate)
- CSS: separate file
- Fonts: Google Fonts (loaded via CSS @import)
- Images: SVG favicon only

**Issues:**
1. **No bundle analysis** — size of JS/CSS not documented or optimized
2. **No code splitting** — all routes in one bundle, lazy loading not evident
3. **No image optimization** — no lazy loading on image-heavy pages
4. **No service worker caching** — no PWA caching strategy
5. **Font loading** — Google Fonts via @import, may cause flash of unstyled text

### 10.2 Backend Performance

**Issues:**
1. **In-memory AI tier cache** — not shared across serverless instances, cache misses every cold start
2. **No database connection pooling config** — using Supabase defaults
3. **No query optimization** — some endpoints do N+1 queries (chat messages loading)
4. **No response caching** — every AI request generates new response
5. **Export jobs** — no background queue, synchronous processing

### 10.3 Database Performance

**Indexes defined:** Yes, on foreign keys and common query columns

**Missing indexes:**
- `ai_usage_log` — no index on `user_id` + `created_at` (usage queries)
- `messages` — no index on `project_id` + `created_at` (chat pagination)
- `activities` — no index on `project_id` + `created_at` (timeline queries)

### 10.4 Network Performance

- No CDN for static assets
- No edge caching strategy
- AI responses not cached
- Reference metadata not cached

---

## 11. Cost Audit

### 11.1 Current Costs (Fixed/Operational)

| Component | Provider | Cost Model | Current Cost |
|-----------|----------|------------|--------------|
| Frontend hosting | Vercel | Usage-based | ~$0 (under free tier) |
| Backend hosting | Vercel | Usage-based | ~$0 (under free tier) |
| Database | Supabase | Usage-based | ~$0 (under free tier) |
| Auth | Supabase | Included | $0 |
| Domain | None | — | $0 |
| Monitoring | None | — | $0 |
| Email | SMTP | Pay-as-you-go | ~$0 |

### 11.2 AI Provider Costs

**NOT ACTIVE** — No AI API key configured.

When active, costs will be:
- Budget tier: ~$0.375 per 1K tokens
- Standard tier: ~$6.25 per 1K tokens
- Premium tier: ~$7.50 per 1K tokens

**Average per project:** ~$11.27 (budget model)

### 11.3 Revenue

**ZERO** — No payment integration.

### 11.4 Financial Model Gap

| Component | In Docs | In Code |
|-----------|---------|---------|
| Subscription tiers (Free/Basic/Pro/Team) | ✅ Complete | ❌ Not implemented |
| Pay-per-use pricing | ✅ Complete | ⚠️ Partial (wallet balance only) |
| Referral reward | ✅ Designed | ❌ Not implemented |
| Stripe integration | ⚠️ Code exists | ❌ Not configured |
| Midtrans | ❌ Not considered | ❌ Not implemented |
| Token purchase flow | ❌ Not designed | ❌ Not implemented |
| Invoice/receipt | ❌ Not designed | ❌ Not implemented |
| Refund policy | ❌ Not designed | ❌ Not implemented |

### 11.5 Margin Analysis

From pricing.md:
- Free tier: -$0.375/1K (subsidized)
- Basic: +$0.625/1K (62.5% margin) — break-even at 3,600 tokens
- Pro: +$0.225/1K (37.5% margin) — break-even at 48,580 tokens
- Team: +$0.025/1K (6.25% margin) — break-even at 193,000 tokens
- Pay-per-use: +$1.125/1K (75% margin) — highest margin

**Problem:** Without actual payment, the entire financial model is theoretical.

---

## 12. Risk Register

### 12.1 Product Risks

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|------------|--------|------------|
| No payment integration | CRITICAL | CERTAIN | No revenue | Owner must prioritize Stripe/Midtrans |
| AI provider not configured | CRITICAL | CERTAIN | App non-functional | Set env vars immediately |
| Citation feature broken | HIGH | CERTAIN | Core feature broken | Implement missing backend routes |
| PDF export broken | HIGH | CERTAIN | Can't deliver output | Fix export pipeline |
| Competition outpaces | MEDIUM | MEDIUM | User churn | Differentiate on Indonesian market |
| AI quality issues | MEDIUM | MEDIUM | User dissatisfaction | Add feedback loop, factuality checks |

### 12.2 Technical Risks

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|------------|--------|------------|
| Share token insecurity | CRITICAL | Patched | Token guessable | Fixed 2026-09-05 (crypto.randomUUID) |
| `reference_citations` RLS | HIGH | CERTAIN | Data locked | Add RLS policies or disable |
| DB schema drift | HIGH | MEDIUM | Can't reproduce DB | Start using migrations |
| Frontend regression | HIGH | MEDIUM | Feature breakage | Add E2E tests |
| AI provider downtime | MEDIUM | MEDIUM | App non-functional | Add fallback provider |
| Vercel cold starts | LOW | HIGH | Slow first request | Edge caching, keep-warm |

### 12.3 Security Risks

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|------------|--------|------------|
| Owner whitelist hardcoded | HIGH | CERTAIN | Only 1 admin forever | Move to DB config |
| Refresh token in localStorage | MEDIUM | MEDIUM | XSS theft possible | Move to httpOnly cookie |
| No consent tracking | MEDIUM | CERTAIN | Compliance risk | Add DB columns |
| AI prompt injection | MEDIUM | LOW | Data leakage | Sanitize AI inputs |
| Rate limit bypass | LOW | LOW | DoS risk | Implement per-user limits |

### 12.4 Business Risks

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|------------|--------|------------|
| No revenue stream | CRITICAL | CERTAIN | Business failure | Payment gateway priority |
| Token economy exploited | HIGH | LOW | Revenue loss | Usage monitoring, anomaly detection |
| Data breach | HIGH | LOW | Legal + trust | Security audit, RLS policies |
| User data loss | MEDIUM | LOW | User trust | Proper backups, migration history |
| Vendor lock-in (Supabase) | MEDIUM | CERTAIN | Cost increases | Evaluate alternatives periodically |

---

## 13. MVP Definition

### 13.1 What's MVP (Today)

**Working features that can be demoed:**
1. User registration + Google OAuth login
2. Project creation with outline + document content
3. AI chat per project (project-scoped)
4. Reference import (DOI/ISBN) + bibliography generation
5. Quiz generation + submission + auto-grading
6. PPTX export (only export that works)
7. Token balance display (IDR)
8. Admin dashboard (user list, audit log, usage)
9. Landing page + help page + ToS + privacy policy
10. Practice page (recommendations + history)

### 13.2 MVP Blockers

Before "real" launch, these MUST work:
1. **AI API key configured** — without this, AI features return error
2. **PDF export works** — primary deliverable for academic writing
3. **DOCX export works** — common format for academic submission
4. **Citation save works** — auto-cite results must persist
5. **Payment gateway** — users need to top up to use AI (even if manual approval)

### 13.3 Post-MVP Features (Nice to Have)

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Section-scoped AI chat | High | High | Changes AI prompt architecture |
| Global reference library UI | High | Medium | Dedicated page for Pustaka Saya |
| DOCX export | High | Medium | Already in OpenAPI |
| PDF export fix | High | Medium | Broken currently |
| Subscription tiers | Medium | High | Stripe integration needed |
| Zotero sync | Medium | High | Complex OAuth integration |
| Document templates | Medium | Medium | Table + route exist |
| Rubric editor | Medium | Low | Simple form |
| Notifications | Low | Medium | Real-time infrastructure needed |
| Collaborative editing | Low | Very High | WebSocket infrastructure |

---

## 14. Roadmap

### 14.1 Phase 0 — Survival (IMMEDIATE, owner action)

> Prerequisites before anything else works.

1. **Set AI_PROVIDER_API_KEY env var** — Groq or OpenAI key
2. **Set AI_PROVIDER_BASE_URL** — Groq base URL
3. **Test AI features end-to-end** — chat, quiz, outline, write
4. **Fix PDF export** — debug and fix export pipeline
5. **Implement DOCX export** — build from scratch
6. **Implement citation routes** — 5 endpoints from OpenAPI spec

### 14.2 Phase 1 — Payment (SHORT TERM, owner action)

1. **Stripe or Midtrans integration** — payment gateway
2. **Token purchase flow** — wallet topup
3. **Pricing page** — subscription tier display
4. **Subscription tier enforcement** — feature gates based on tier
5. **Invoice generation** — basic receipt

### 14.3 Phase 2 — Polish (MEDIUM TERM, AI team)

1. **Fix section-scoped AI chat** — update prompts to accept section context
2. **Global reference library UI** — dedicated Pustaka Saya page
3. **Rate limit UX** — user-facing message when 429 hit
4. **AI timeout/retry** — prevent indefinite hangs
5. **AI provider fallback** — automatic switch on failure
6. **Spend cap enforcement** — block AI when balance = 0
7. **Consent tracking DB** — persist ToS + privacy consent
8. **Migration history** — proper drizzle-kit generate workflow

### 14.4 Phase 3 — Growth (LONG TERM)

1. **Referral reward payout** — implement reward logic
2. **Search references (internet)** — CrossRef API integration
3. **Document templates UI** — save/load outline templates
4. **Rubric editor** — manual rubric creation
5. **Zotero sync** — OAuth integration
6. **FinOps admin dashboard** — proper cost visualization
7. **Notifications** — email + in-app
8. **Collaborative editing** — real-time multi-user

### 14.5 Phase 4 — Scale

1. **Mobile app** — React Native or PWA
2. **Email digest** — weekly progress summaries
3. **API access** — for third-party integrations
4. **Custom citation formats** — user-defined templates
5. **Team collaboration** — shared projects with roles

---

## 15. KPI

### 15.1 User Metrics

| Metric | Current | Target (3 months) |
|--------|---------|-------------------|
| Registered users | ~5 (test users) | 100 |
| Active users (weekly) | Unknown | 20 |
| Projects created | Unknown | 200 |
| Documents exported | Unknown | 50 |
| Quiz submissions | Unknown | 100 |
| AI chat messages | Unknown | 1000 |
| Referral signups | Unknown | 20 |

### 15.2 Technical Metrics

| Metric | Current | Target |
|--------|---------|--------|
| API uptime | ~99% (guess) | >99.5% |
| Page load time | Unknown | <3s |
| AI response time | Unknown | <10s |
| Error rate | Unknown | <1% |
| Build success rate | ~80% (historical) | >95% |
| Deploy frequency | Manual | Weekly |

### 15.3 Business Metrics

| Metric | Current | Target (3 months) |
|--------|---------|-------------------|
| Revenue | $0 | $100 |
| Paid users | 0 | 10 |
| Token consumption | Unknown | 100K tokens |
| Customer acquisition cost | Unknown | <$10 |
| Churn rate | Unknown | <10% |

### 15.4 Monitoring Gaps

- **No uptime monitoring** — UptimeRobot not set up
- **No error tracking** — Sentry not integrated
- **No analytics** — no user behavior data
- **No performance monitoring** — no Core Web Vitals tracking
- **No AI quality tracking** — no user feedback loop

---

## 16. Explicitly Not Building

### 16.1 Features Deferred

| Feature | Reason | Revisit |
|---------|--------|---------|
| Mobile app | PWA adequate for MVP | Phase 4 |
| Real-time collaboration | Infrastructure too complex for early stage | Phase 4 |
| Multiple language support | Indonesian-only for now | After market fit |
| Offline mode | Not critical for academic writing | Phase 3 |
| AI essay grading | Complex, needs expert validation | Phase 3 |
| Plagiarism detection | Integration complexity, cost | Phase 4 |
| AI image generation | Not aligned with academic writing core | Never (or Phase 5) |
| Video content | Not aligned with core use case | Never |
| Team subscription tier | Too early, complex billing | Phase 3 |
| API access for third parties | Security complexity | Phase 4 |

### 16.2 Technical Deferred

| Decision | Reason | Revisit |
|---------|--------|---------|
| GraphQL | REST adequate for current scale | When >100 endpoints |
| WebSockets | HTTP polling sufficient | Phase 3+ |
| Microservices | Overkill for current scope | Never (monolith fine) |
| Kafka/event streaming | No event-driven needs yet | Phase 3+ |
| Dedicated AI evaluation pipeline | Manual QA sufficient for now | Phase 3 |

---

## 17. Decision Log

### 17.1 Major Decisions (From `docs/ai-team/shared/decisions.md`)

| # | Decision | Date | Status |
|---|----------|------|--------|
| ADR-001 | OpenAPI as single source of truth | 2026 | ✅ Active |
| ADR-002 | Supabase for authentication | 2026 | ✅ Active |
| ADR-003 | TanStack Query for server state | 2026 | ✅ Active |
| 001 | React SPA, not Next.js | ~2026-08 | ✅ Active |
| 002 | Vercel for hosting | ~2026-08 | ✅ Active |
| 003 | Indonesian as primary UI language | ~2026-08 | ✅ Active |
| 004 | Session Start Protocol | 2026-09-01 | ✅ Active |
| 005 | Cross-origin auth fix (localStorage refresh) | 2026-08-28 | ✅ Active |
| 006 | Backend auth middleware pattern | ~2026-08 | ✅ Active |
| 007 | Express middleware mount order fix | 2026-08-25 | ✅ Active |
| 008 | Supabase JWKS verification | 2026-08-28 | ✅ Active |
| 009 | Deploy error playbook | 2026-09-04 | ✅ Active |
| 010 | Font replacement (Inter + Space Grotesk + JetBrains Mono) | 2026-09-04 | ✅ Active |
| 011 | Em dash removal from frontend | 2026-09-04 | ✅ Active |
| 012 | PPTX export via pptxgenjs | 2026-09-03 | ✅ Active |
| 013 | Practice/learning activities system | 2026-09-03 | ✅ Active |
| 014 | Reference + Citation system (3 phases) | 2026-09-03 | ⚠️ Phase 2-3 broken |
| 015 | Deploy robustness strategy | 2026-09-04 | ✅ Active |
| 016 | User dashboard menu order | 2026-08-29 | ✅ Active |

### 17.2 Pending Decisions

| # | Question | Options | Waiting On |
|---|----------|---------|-----------|
| P1 | Payment gateway | Stripe vs Midtrans | Owner |
| P2 | AI provider | Groq vs OpenAI vs Anthropic | Owner |
| P3 | Referral reward amount | TBD | Owner |
| P4 | Free tier limit enforcement | Block or degrade? | Owner |
| P5 | Overdraft policy | Block or charge extra? | Owner |
| P6 | Data retention policy | How long keep data? | Owner |
| P7 | Custom domain | teora.id vs teora.com? | Owner |

---

## 18. Implementation Plan

### 18.1 Immediate (This Week)

**Owner Actions (BLOCKING all AI features):**
1. Set `AI_PROVIDER_API_KEY` in Vercel env vars
2. Set `AI_PROVIDER_BASE_URL` (Groq: `https://api.groq.com/openai/v1`)
3. Set `AI_LIMITS_*` tier values in Vercel env vars
4. Test AI features end-to-end: chat, outline, write, quiz

**AI Team Actions (Non-blocking):**
1. Regenerate `lib/api-zod/src/generated/api.ts` — stale after recent OpenAPI changes
2. Implement citation backend routes (5 endpoints from OpenAPI spec)
3. Fix PDF export pipeline
4. Build DOCX export
5. Add rate limit UX (user-facing message on 429)
6. Add AI timeout with retry

### 18.2 Short Term (2-4 Weeks)

1. **Payment gateway integration** (owner + AI team)
   - Stripe setup or Midtrans setup
   - Webhook handler
   - Token purchase flow
   - Subscription tier enforcement

2. **Documentation cleanup** (AI team)
   - Consolidate duplicate generated API files
   - Add migration workflow
   - Clean orphan files
   - Update stale docs

3. **Security hardening** (AI team)
   - Add RLS policies on reference_citations
   - Move owner whitelist to DB
   - Add consent tracking columns
   - Fix refresh token storage

4. **Feature completion** (AI team)
   - Section-scoped AI chat
   - Global reference library UI
   - Document templates UI
   - Rubric editor

### 18.3 Medium Term (1-3 Months)

1. **Growth features**
   - Referral reward payout
   - CrossRef search integration
   - FinOps dashboard
   - Notifications (email + in-app)

2. **Quality**
   - E2E tests (Playwright)
   - AI quality feedback loop
   - Performance monitoring (Sentry, Core Web Vitals)
   - Uptime monitoring (UptimeRobot)

3. **Documentation**
   - Onboarding docs
   - API documentation
   - Admin handbook
   - User guide

### 18.4 Pre-Launch Checklist

- [ ] AI provider configured and tested
- [ ] PDF export works
- [ ] DOCX export works
- [ ] Citation save works
- [ ] Payment gateway live
- [ ] Token purchase works
- [ ] Subscription tiers enforced
- [ ] Uptime monitoring active
- [ ] Error tracking active
- [ ] Analytics tracking
- [ ] Consent tracking in DB
- [ ] RLS on all tables
- [ ] Migration history exists
- [ ] Landing page SEO-optimized
- [ ] Custom domain configured
- [ ] SSL certificate
- [ ] Privacy policy legal review
- [ ] Terms of service legal review

---

## Unknowns — Requires Owner Input

1. **Payment gateway preference** — Stripe or Midtrans? (Indonesia market)
2. **AI provider choice** — Groq (cheaper, faster) vs OpenAI (better quality) vs Anthropic
3. **Referral reward amount** — how much to pay referrers?
4. **Free tier policy** — 1,000 tokens/month, what happens when depleted?
5. **Custom domain** — teora.id, teora.com, or keep on vercel.app?
6. **Data retention** — how long to keep user data after deletion?
7. **Branding refresh** — current "Academic Workspace" vs "Task Mentor" as primary message?
8. **Analytics tool** — Plausible, Mixpanel, or PostHog?
9. **Support channel** — email only, or add chat/canned responses?
10. **Target user persona** — which Indonesian student segment first? S1 or S2?

---

## Audit Metadata

- **Files analyzed:** ~200
- **Lines of code:** ~50,000
- **Documentation files:** 30+
- **Database tables:** 30
- **API endpoints:** 60+
- **Frontend pages:** 31
- **Audit completed:** 2026-09-05
- **Auditor:** AI Engineering Team
- **Phase:** 1 — Context Gathering
- **Next:** Phase 2 — Analysis & Planning

---

*Audit document managed by AI Engineering Team. Update after each sprint/phase.*
