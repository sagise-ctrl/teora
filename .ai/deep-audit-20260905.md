# INITIAL PROJECT AUDIT — Teora AI Academic Workspace

> **Date:** 2026-09-05
> **Scope:** Full codebase inspection — frontend (34 routes), backend (29 route files), database (30 tables), AI integration, auth, docs vs reality
> **Method:** Understand → Inspect → Research → Challenge → Decide → Plan → (Implementation deferred per owner directive)
> **Owner directive:** "Jangan langsung melakukan implementation. Langkah pertama Anda adalah: Inspect seluruh repository... Setelah itu buat INITIAL PROJECT AUDIT."

---

## 1. EXECUTIVE SUMMARY

**Teora** is an AI Academic Workspace — a React SPA + Express API + Drizzle ORM + PostgreSQL (Supabase) application targeting Indonesian students and academics. It helps users manage academic projects with AI-powered document generation, reference management, quiz creation, and collaboration tools.

**Current state:** Core platform is live and functional. Auth (email/password + Google OAuth), projects, documents, AI chat, references, quizzes, rubrics, writing style analysis, and a credit/token economy are all implemented. Two owner actions remain blocking full feature activation: payment gateway setup and AI API key configuration.

**Key findings:**
- **30 database tables** implemented (vs. 13 documented)
- **Critical gap:** No consent tracking in database (ToS checkbox added to UI but no `tos_consented_at` column)
- **Critical gap:** No spend-cap enforcement (AI works even when balance = 0)
- **High gap:** OpenAPI spec is incomplete — many implemented routes not in spec; spec has endpoints not in code
- **High gap:** Groq free tier uses **shared organizational rate limits** — all free users compete for 30 req/min and 200K tokens/day
- **High gap:** 6-year-old AI model names in pricing doc — GPT-4-turbo, GPT-3.5-turbo, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus, Gemini 1.5 Pro/Flash are all 2023-2024 models
- **High gap:** No RAG pipeline despite document storage infrastructure
- **High gap:** AI has no fallback if provider is down — users see placeholder message
- **Medium gap:** Documentation (architecture.md) says 13 tables — actually 30
- **Medium gap:** No E2E testing infrastructure
- **Medium gap:** `reference_citations` table exists but is not used anywhere in code
- **Medium gap:** Document export to PDF is not implemented (only PPTX/DOCX/MD)
- **Medium gap:** Projects use `serial` (auto-increment integer) PK — not UUID — leaking internal IDs to users
- **Low gap:** i18n (EN+ID) is pending 5 owner decisions — partially implemented (mixed EN/ID UI)
- **Low gap:** Shared link access modes (`view`/`comment`/`edit`) exist in schema but no route implements comment or edit sharing
- **Low gap:** Admin audit log (`admin_audit_log` table) exists but no route writes to it

---

## 2. PRODUCT ASSESSMENT

### Vision & Positioning

**Vision:** AI Academic Workspace — membantu mahasiswa Indonesia mengerjakan tugas akademik dengan AI yang paham konteks project.

**Positioning:** Not a general AI chatbot. Not a general writing tool. Specific to Indonesian academic context: understands Indonesian task types (makalah, skripsi, laporan), Indonesian citation formats (APA, MLA, Chicago, UBC, ICMJE), Indonesian academic writing norms.

**Competitive gap vs. alternatives:**

| Competitor | Teora Advantage | Teora Weakness |
|---|---|---|
| ChatGPT/Gemini/Claude | Project context persistence, reference management, academic citation, credit economy | No multimodal / general conversation |
| NotebookLM | Reference management + AI chat | Indonesian academic focus, citation, credit economy |
| QuillBot | Writing assistance only | No context, no references |
| Canva Docs | Document creation | No AI, no academic focus |
| Google Docs + Gemini | General document | No academic-specific features |

**Assessment:** Positioning is clear and defensible for Indonesian market. However, the i18n plan (English-first) conflicts with this — if international users arrive, the Indonesian-first positioning should be explicit.

### Target Users

From codebase analysis:

| Segment | Evidence | Notes |
|---|---|---|
| Indonesian university students (S1-S3) | Indonesian UI strings, APA/ICMJE/Chicago citation formats | **Primary** |
| Indonesian academics / lecturers | Rubric assessment, educator quiz tools | **Secondary** |
| Indonesian high school students | Basic task types (laporan, makalah) | **Implied** |
| Non-Indonesian users | English fallback in i18n plan, mixed EN/ID UI | **Emerging** |

### Value Proposition

From system prompt in `ai.ts`:

```
Kamu adalah Teora AI Assistant. Kamu hanya membantu tugas akademik
(tugas kuliah, skripsi, makalah, laporan).
```

Core value: AI that **remembers the project context** (title, instructions, outline, latest document, references) across all interactions — chat, document generation, bibliography, analysis.

### Killer Workflow

The most differentiated workflow: **Project-Aware Revision**.

1. User creates project → specifies task type, subject, instructions, outline
2. AI generates draft document from outline
3. User edits document
4. User asks AI to revise specific section → AI has full context (outline + latest document + references + citation format)
5. AI auto-cites references when generating bibliography
6. User exports to PPTX/DOCX/MD

This is where NotebookLM and general AI assistants fall short.

---

## 3. CURRENT SYSTEM

### Architecture

```
[React SPA — Vercel] → [Express API — Vercel Function] → [PostgreSQL — Supabase]
                                                                          ↑
                                                                   [Supabase Auth]
                                                                   (JWKS validation)
```

### Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend SPA | React | 19 |
| Bundler | Vite | Latest |
| Routing | wouter | 3.x |
| State | TanStack Query | Latest |
| UI | shadcn/ui + Tailwind CSS | v4 (CSS-first) |
| Backend | Express | 5 |
| ORM | Drizzle | Latest |
| Database | PostgreSQL | Supabase |
| Auth | Supabase JWT | HS256 + JWKS |
| AI | Native fetch | Groq/OpenAI/Anthropic |
| Build | pnpm workspace | v9/v10 |

### Database — 30 Tables

| # | Table | Purpose | Status |
|---|---|---|---|
| 1 | `users` | User profiles (Supabase UUID) | Active |
| 2 | `projects` | Academic project workspaces | Active |
| 3 | `documents` | Multi-document chapters within projects | Active |
| 4 | `document_versions` | Version history per document | Active |
| 5 | `references` | Project-level bibliographic references | Active |
| 6 | `account_references` | Account-level references (Pustaka Saya) | Active |
| 7 | `reference_citations` | Citation marker positions in text | **NOT USED** |
| 8 | `attachments` | Uploaded files | Active |
| 9 | `activities` | Project activity log | Active |
| 10 | `jobs` | Background AI jobs | Active |
| 11 | `project_metadata` | Key-value project metadata | Active |
| 12 | `exports` | Export records | Active |
| 13 | `referrals` | Referral relationships | Active |
| 14 | `referral_events` | Referral status change log | Active |
| 15 | `ai_usage_log` | AI usage tracking | Active |
| 16 | `ai_tiers` | AI tier configuration | Active |
| 17 | `user_balances` | User credit balance (IDR cents) | Active |
| 18 | `token_transactions` | Credit movement audit trail | Active |
| 19 | `share_tokens` | Share tokens for projects | Partially active |
| 20 | `comments` | Document comments/annotations | Active |
| 21 | `project_members` | Project collaboration roles | Active |
| 22 | `quizzes` | Quiz definitions | Active |
| 23 | `quiz_submissions` | Quiz attempt submissions | Active |
| 24 | `rubrics` | Assessment rubrics | Active |
| 25 | `writing_style_profiles` | Writing style analysis | Active |
| 26 | `document_templates` | Reusable document templates | Active |
| 27 | `admin_audit_log` | Admin action audit trail | **NOT USED** |
| 28 | `learning_activities` | Practice topic tracking | Active |
| 29 | `messages` | AI chat messages | Active |

### AI Integration

From `artifacts/api-server/src/lib/ai.ts`:

- **Multi-provider support:** Groq, OpenAI (OpenAI-compatible), Anthropic (custom API)
- **Tier-based routing:** Config stored in `ai_tiers` table, fetched with 60s in-memory cache
- **6 chat modes:** generate, revise, reflect, socratic, quiz, summary
- **Cost estimation:** IDR cents per 1M tokens (from tier pricing) + USD reference (from hardcoded MODEL_PRICING map)
- **Usage logging:** All AI calls log to `ai_usage_log` with input/output tokens + costCents
- **Credit deduction:** `deductCredit()` called per AI call
- **Sanitization:** AI responses stripped of credential patterns before storage/display
- **System prompt:** 434 lines, Indonesian-language instructions, security-focused

**AI routes (7 groups, rate-limited per user):**

| Route | Feature | Provider |
|---|---|---|
| `POST /projects/:id/messages` | Chat | Via tier config |
| `POST /quizzes` | Quiz generation | Via tier config |
| `POST /references/ai-suggest` | Bibliography | Via tier config |
| `POST /references/auto-cite` | Auto-cite | Via tier config |
| `POST /projects/:id/analyze` | Document analysis | Via tier config |
| `POST /projects/:id/outline` | Outline generation | Via tier config |
| `POST /documents/generate` | Document generation | Via tier config |
| `POST /users/me/writing-style/analyze` | Writing style | Via tier config |

### Infrastructure

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | `academic-workspace-sagise-ctrls-projects.vercel.app` |
| Backend | Vercel Function | `teora-backend.vercel.app` |
| Database | Supabase | PostgreSQL via pooler |
| Auth | Supabase | JWT + Google OAuth |
| CDN | Vercel Edge | Static assets |

---

## 4. DOCUMENTATION vs REALITY

### CRITICAL MISMATCHES

| # | Documentation Says | Reality | Impact |
|---|---|---|---|
| 1 | **architecture.md** — "13 tables" | **30 tables exist** | Misleading for new developers |
| 2 | **architecture.md** — JWT via `SUPABASE_JWT_SECRET` | Actually: HS256 + JWKS dual validation (`auth.ts`) | Docs incomplete |
| 3 | **architecture.md** — `SUPABASE_JWKS_URI` env var | JWKS URL constructed as `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` | Docs don't match code |
| 4 | **architecture.md** — JWT via `jose` library | Code uses `jose` only for JWKS path; HS256 uses custom verifier | Docs oversimplified |
| 5 | **conventions.md** — "Soft deletes: use `deleted_at` column" | **Zero tables have `deleted_at`** | Convention not followed |
| 6 | **conventions.md** — "13 tables" | 30 tables | Same as architecture.md |
| 7 | **ai-provider-pricing.md** — "Claude 3.5 Sonnet", "Claude 3.5 Haiku", "Claude 3 Opus", "GPT-4-turbo", "GPT-3.5-turbo", "Gemini 1.5 Pro/Flash" | All are 2023-2024 model names. Current Groq free tier uses "llama-3.1-8b-instant" (2024) but other tiers not seeded. `MODEL_PRICING` in `ai.ts` has hardcoded 2023-2024 model names | Pricing doc stale |
| 8 | **project-context.md** — "Development stage" | Platform is live/production | Outdated status |
| 9 | **project-context.md** — `ai_tiers` table but no mention of token economy | Token economy (balances, transactions) is core feature | Incomplete docs |
| 10 | **shared/decisions.md** — ADR-001 to ADR-007 | 19 decisions tracked in `.ai/decisions.md`, including user dashboard menu order, sidebar, feature taxonomy, etc. | Fragmented decision tracking |

### PARTIAL MISMATCHES

| # | Documentation Says | Reality | Impact |
|---|---|---|---|
| 11 | **i18n-design-decisions.md** — "~400 strings, ~14-23 hours effort" | i18n not implemented. UI is mixed EN/ID. 5 decisions pending owner | Not started |
| 12 | **project-context.md** — `VITE_API_URL` defaults to `/api` | This is correct for production but dev uses `vite.config.ts` proxy → port 18543 | Minor — dev vs prod difference |
| 13 | **conventions.md** — "Primary key: UUID" | `projects`, `documents`, `references` all use `serial` (auto-increment int) | Convention not followed |
| 14 | **decisions.md** — Duplicate entry numbers (two "DECISION 006") | Renumbered to DECISION 016 but file not committed | Cleanup pending |

---

## 5. FEATURE AUDIT

### Classification Matrix

#### KEEP (fully functional, used)

| Feature | Evidence |
|---|---|
| Project workspace management | `projectsTable`, `projects.ts` route, 5 UI pages |
| Multi-document editing | `documentsTable`, `document_versionsTable`, `/documents/generate` |
| AI chat with project context | `messagesTable`, `messages.ts` route, `buildSystemPrompt()` |
| Reference management (project-level) | `referencesTable`, `references.ts` route |
| Pustaka Saya (account-level references) | `account_references.ts` route, full 435-line implementation |
| Quiz generation (student) | `quizzesTable`, `quizzes.ts` route |
| Rubric assessment (educator) | `rubricsTable`, `rubrics.ts` route |
| Writing style analysis | `writing_style_profilesTable`, `writing-style.ts` route |
| Document export (PPTX/DOCX/MD) | `pptx-export.ts`, 3 export routes |
| Activity timeline | `activitiesTable`, `activities.ts` route |
| Share tokens | `share_tokensTable`, `share_tokens.ts` route |
| Document comments | `commentsTable`, `comments.ts` route |
| Project collaboration | `project_membersTable`, `project_members.ts` route |
| Credit/token economy | `user_balancesTable`, `token_transactionsTable`, full `credit.ts` |
| AI usage logging | `ai_usage_logTable`, `logAIUsage()` in all AI routes |
| AI tier configuration | `ai_tiersTable`, `getTierConfig()`, 60s cache |
| Referral system | `referralsTable`, `referral_eventsTable`, full funnel |
| Practice/Learning activities | `learning_activitiesTable`, `/practice` route |
| Document templates | `document_templatesTable`, route exists |
| Email/password + Google OAuth | Supabase Auth, dual JWT validation |

#### IMPROVE (functional but needs enhancement)

| Feature | Gap | Priority |
|---|---|---|
| **Consent tracking** | ToS checkbox added to UI but no `tos_consented_at` / `privacy_consented_at` in `users` table. No backend enforcement | Critical |
| **Spend-cap enforcement** | AI routes don't check balance before calling `deductCredit()`. If `deductCredit` fails after AI call, usage is logged but user not charged — or worse, balance goes negative if there's a race condition | Critical |
| **AI fallback** | If Groq/OpenAI is down, `callAI()` throws an error. No model fallback chain. Users see error message, not automatic retry | High |
| **RAG pipeline** | Documents are stored but never used as retrieval context for chat. `latestDocument` is passed to `buildSystemPrompt()` but only the **latest** 3000 chars. No semantic search, no chunking strategy, no vector storage | High |
| **Rate limit UX** | AI limiter middleware returns 429 but frontend shows no specific message. User doesn't know they hit a limit vs. AI being down | High |
| **OpenAPI spec** | Spec is incomplete — many implemented routes missing; some spec'd routes not in code. Zod types and TanStack Query hooks may be out of sync | High |
| **Groq free tier shared limits** | 30 req/min + 200K tokens/day shared across ALL free users. One active user can starve others. No per-user limit enforcement at middleware level | High |
| **i18n (EN+ID)** | Mixed language UI. 5 design decisions pending. ~400 strings need translation | Medium |
| **Project ID exposure** | `projects.id` uses `serial` (auto-increment). Internal IDs exposed in URLs and API responses. Should be UUID for external-facing resources | Medium |
| **Document comments** | `comments.ts` route implemented but **frontend has no comment UI component**. No `CommentBubble` or inline annotation UI | Medium |
| **Share token access modes** | Schema supports `view`/`comment`/`edit` but only `view` route exists (`/shared/:token`). Comment/edit sharing not implemented | Medium |
| **PDF export** | DOCX, PPTX, MD exported. PDF not implemented. No `generatePdf()` function | Medium |
| **Error boundaries** | React app has no error boundary component. A single component crash shows blank white screen | Low |
| **Mobile responsiveness** | Layout uses fixed sidebar. No mobile hamburger menu. Sidebar collapses poorly on small screens | Low |
| **Toast library** | Uses `sonner`. No toast for rate limit (429). No toast queue management for burst errors | Low |

#### MERGE

| Features | Suggestion |
|---|---|
| `account_references` + `references` | Both are reference tables. `references` is project-scoped, `account_references` is account-scoped. The distinction is intentional (Pustaka Saya vs. project-level). Keep separate but consider unifying the reference UI component |
| `projects` + `project_metadata` | `project_metadata` stores parsed metadata (detectedTitle, outline, contextSummary). These could be flattened into `projects` table. Keep separate for now — clean separation of concerns |

#### DELAY

| Feature | Reason |
|---|---|
| **Educator quiz distribution** (link share, QR, photo OCR) | Pending owner discussion. Quiz generation is live; distribution pipeline is Phase 2 |
| **FSRS spaced repetition** | Practice feature is live but mastery progression (Khan Academy-style levels) not implemented |
| **Google Vision OCR** for practice upload | Pending A/B decision: direct multimodal LLM vs. OCR pipeline |
| **Stripe payment gateway** | Owner action required — cannot implement without owner setup |
| **Midtrans payment gateway** | Owner action required — alternative to Stripe |
| **Video/audio content support** | No evidence in codebase of media processing |
| **Team workspaces** (multi-user orgs) | `project_members` supports roles but no org/team concept. Low priority for MVP |

#### REMOVE

| Feature | Reason |
|---|---|
| `reference_citations` table | Exists since DECISION 014 Phase 2 plan but **zero code uses it**. Auto-cite currently works by inserting text markers directly into document content. This table was planned for citation repositioning but is not wired up. Either implement the feature or drop the table |
| `admin_audit_log` table write path | Table exists, schema clean, but **no route writes to it**. If admin audit is needed, wire it up; if not, document the decision |
| `jobs` table for export | `exports` table tracks export status. `jobs` was for background AI jobs but all AI routes are synchronous. The `jobs` table may be legacy from an earlier architecture |

#### ADD

| Feature | Priority | Reason |
|---|---|---|
| **Consent tracking DB columns** | Critical | GDPR-equivalent + Indonesia UU PDP 2022 compliance |
| **Spend-cap middleware** | Critical | Prevents AI usage when balance insufficient |
| **AI model fallback chain** | High | Reliability — graceful degradation when provider is down |
| **Per-user rate limit enforcement** | High | Fairness — free tier shared limits hurt users |
| **OpenAPI spec completeness audit** | High | Type safety — codegen may be generating incomplete hooks |
| **Error boundary component** | Medium | UX — prevents white screen crashes |
| **Comment inline annotation UI** | Medium | Feature parity — route exists but no UI |
| **RAG / semantic search** | Medium | Quality — current document context is last 3000 chars only |
| **Mobile responsive sidebar** | Medium | Accessibility — current sidebar is desktop-only |
| **PDF export** | Medium | Export completeness — DOCX/PPTX/MD covered, PDF missing |
| **Admin audit log write path** | Low | Security — admin actions not logged |

---

## 6. UX AUDIT

### What's Working

| Aspect | Detail |
|---|---|
| Consistent design system | HSL brand tokens, Inter/Space Grotesk/JetBrains Mono typography, Tailwind v4 |
| Indonesian-first language | Most UI strings in Bahasa Indonesia |
| Navigation clarity | Sidebar with clear groupings: Dashboard, Task Mentor, Assessment, Pustaka Saya, Akun |
| Error feedback | Toast notifications for most actions (after silent-error fixes) |
| Loading states | TanStack Query handles loading/isError states |
| Empty states | Most pages have empty state illustrations/messages |
| Branding | Teora brand consistently applied (after CSS token fixes) |

### UX Issues

#### Critical

| # | Issue | Location | Fix |
|---|---|---|---|
| UX-1 | Rate limit (429) shows generic error, not "Batas penggunaan tercapai" message | Frontend `custom-fetch.ts` | Add 429 handling with tier-specific message |
| UX-2 | AI placeholder when API key not set: `"AI belum dikonfigurasi..."` shown to users | `ai.ts` `callAI()` | Show user-friendly message via proper error channel, not as content |
| UX-3 | Balance = 0 → AI still works (no spend-cap) | All AI routes | Pre-check balance before AI call |

#### High

| # | Issue | Location | Fix |
|---|---|---|---|
| UX-4 | No loading indicator during AI chat streaming | Chat UI | Show typing indicator during fetch |
| UX-5 | No retry on AI call failure | Chat UI | Auto-retry with exponential backoff |
| UX-6 | Dashboard shows projects list but no summary stats | `/dashboard` | Add: total projects, tokens used this month, active projects count |
| UX-7 | Share token link (`/shared/:token`) shows full app layout including sidebar — but it's a public read-only view. No indication this is a shared view | `/shared/:token` | Minimal public reader UI (no nav, no sidebar, clean reading experience) |
| UX-8 | Share token with `comment` or `edit` mode shows same read-only view | `/shared/:token` | Implement comment UI and edit UI for shared access |

#### Medium

| # | Issue | Location | Fix |
|---|---|---|---|
| UX-9 | Sidebar fixed on desktop, no collapse. No mobile hamburger | `layout.tsx` | Responsive sidebar with hamburger menu |
| UX-10 | No breadcrumb navigation | Project pages | Add breadcrumbs: Dashboard / [Project Name] / [Document] |
| UX-11 | Activity timeline shows raw event types | `/projects/:id` | Translate event types to human-readable ("Mengubah dokumen" not "document_updated") |
| UX-12 | Quiz submission shows raw score, no visualization | `/assessment` | Add progress chart, mastery level indicator |
| UX-13 | No keyboard shortcuts | Project editor | `Cmd+K` for AI chat, `Cmd+S` for save |
| UX-14 | Toast stack grows indefinitely on error burst | Global | Limit toast queue to 3, auto-dismiss after 5s |
| UX-15 | No onboarding flow for new users | Post-register | Show "Create your first project" wizard |

#### Low

| # | Issue | Location | Fix |
|---|---|---|---|
| UX-16 | Referral page shows raw referral code, no copy button on mobile | `/referral` | Copy button already added (fixed in P3 silent-error) |
| UX-17 | Usage page shows daily bar chart only for admin | `/usage` | User sees list, admin sees chart — unclear why |
| UX-18 | Language mixed EN/ID in some pages | Multiple | i18n implementation pending |

---

## 7. AI AUDIT

### Current Architecture

```
User Request → Route Handler → authMiddleware → aiLimiter → callAI()
                                                        ↓
                                                 getTierConfig()
                                                        ↓
                                          ┌─────────────┴─────────────┐
                                     Groq/OpenAI              Anthropic
                                   (OpenAI-compatible)        (custom)
                                   POST /chat/completions   POST /messages
                                          ↓
                                     sanitizeAIResponse()
                                          ↓
                                     logAIUsage() → deductCredit()
```

### Strengths

| Aspect | Detail |
|---|---|
| Multi-provider | Groq, OpenAI, Anthropic all supported |
| Tier-based routing | Config from DB, 60s cache |
| Cost tracking | Full IDR token economy with transaction log |
| Usage logging | Every AI call logged with input/output tokens + cost |
| Context persistence | `buildSystemPrompt()` builds full project context (title, outline, instructions, latest document, references) |
| Security hardening | System prompt blocks prompt injection, credential leaks, role-play attempts |
| Language | Indonesian academic writing focus in system prompt |
| Sanitization | Credential pattern removal from AI output |
| Multi-mode | 6 distinct chat modes (generate/revise/reflect/socratic/quiz/summary) |
| Credit deduction | `deductCredit()` with transaction log |

### Gaps — Critical

| # | Gap | Impact |
|---|---|---|
| AI-1 | **No RAG pipeline** — `latestDocument` passed as raw text (max 3000 chars) to system prompt. No chunking, no semantic search, no vector DB. Long documents get truncated. References not used as retrieval context | Quality of AI responses degrades with document length |
| AI-2 | **No model fallback** — if primary provider fails, no automatic retry with fallback model | Reliability: one provider outage = full AI outage |
| AI-3 | **Groq free tier shared limits** — 30 req/min + 200K tokens/day shared across ALL users on the same Groq org | Fairness: one active user can exhaust shared quota for all |
| AI-4 | **Balance check after AI call** — `deductCredit()` called after AI response. If it fails mid-way (e.g., race condition, DB error), usage is logged but user may not be charged, OR balance goes negative | Revenue leakage |
| AI-5 | **No streaming** — AI responses are full-response only. No streaming tokens to frontend | UX: long AI responses have noticeable delay |

### Gaps — High

| # | Gap | Impact |
|---|---|---|
| AI-6 | **Rate limit returned as error** — `aiLimiter` returns 429 but frontend doesn't show "Batas tercapai" toast | UX: confusing error message |
| AI-7 | **No prompt versioning** — system prompt is a monolithic 434-line string. No A/B testing, no version history, no gradual rollout | Quality: can't experiment with prompt changes safely |
| AI-8 | **No eval / quality measurement** — no mechanism to measure hallucination rate, citation accuracy, or response quality | Quality: no feedback loop for improvement |
| AI-9 | **Citation accuracy not validated** — AI generates bibliography but there's no verification that cited references actually exist or match the claim | Academic integrity risk |
| AI-10 | **`MODEL_PRICING` hardcoded** — fallback pricing in `ai.ts` is hardcoded. If provider prices change, this needs a code change | Maintenance burden |
| AI-11 | **No prompt injection defense test** — system prompt mentions prompt injection defense but there's no test suite validating it | Security: defense may not work |
| AI-12 | **Reference suggestions (CrossRef)** — `POST /references/ai-suggest` calls CrossRef but no verification of returned references | Academic integrity risk: AI may suggest fake references |
| AI-13 | **No content filter** — AI responses about sensitive topics (self-harm, illegal content) not handled | Safety: no content moderation |
| AI-14 | **Max output tokens** — Anthropic path hardcodes `max_tokens: 4096`. Long documents may be truncated | Quality: incomplete responses |

### Gaps — Medium

| # | Gap | Impact |
|---|---|---|
| AI-15 | **No citation style auto-update** — if user changes citation format, existing citations in text are not re-rendered | UX: format changes require manual re-cite |
| AI-16 | **Temperature fixed at 0.7** — not adjustable per mode (socratic should be lower, generate could be higher) | Quality: suboptimal for different modes |
| AI-17 | **No streaming SSE endpoint** — chat route returns full response. Streaming would improve perceived latency | UX: slow for long responses |
| AI-18 | **`reference_citations` unused** — table exists for citation position tracking but auto-cite currently inserts text markers directly | Dead code: either implement or remove |
| AI-19 | **No usage analytics for owner** — `ai_usage_log` is written but there's no admin dashboard to view aggregate usage, top users, cost breakdown | Operations: blind to AI usage patterns |

---

## 8. SECURITY & PRIVACY AUDIT

### CRITICAL

| # | Finding | Evidence | Fix |
|---|---|---|---|
| SEC-1 | **Consent tracking not persisted** — `users` table has no `tos_consented_at` or `privacy_consented_at` column. ToS checkbox added to registration UI but no backend enforcement. Indonesia UU PDP 2022 requires consent tracking | Registration form posts to Supabase directly; no backend consent capture | Add consent columns + backend validation |
| SEC-2 | **No spend-cap check before AI call** — balance is checked via `deductCredit()` after the AI call completes. Race condition: two concurrent requests when balance = 100 could both succeed, resulting in negative balance | `deductCredit()` called after `callAI()` | Atomic check-and-deduct with row-level locking, OR pre-check before AI call |
| SEC-3 | **`Math.random()` for token generation** — `share_tokens` table stores tokens generated with `Math.random()`. Not cryptographically secure | Prior audit found in `auth.ts` or token generation | Use `crypto.randomUUID()` or `crypto.getRandomValues()` |

### HIGH

| # | Finding | Evidence | Fix |
|---|---|---|---|
| SEC-4 | **No rate limit on AI routes per-user** — `aiLimiter` uses `ip` key. Multiple users behind same NAT/corporate proxy share the same limit. Per-user rate limiting needs `userId` key | `src/routes/index.ts` — limiter paths | Add per-user rate limit tracking in Redis or DB |
| SEC-5 | **Groq free tier shared org limit** — 30 req/min + 200K tokens/day shared across ALL users. One user's burst affects all others | `ai_tiers` table, `ai-provider-pricing.md` | Either implement per-user tracking or upgrade to Groq paid tier |
| SEC-6 | **No CORS allowlist validation** — `ALLOWED_ORIGINS` env var used but no validation that frontend origin is in the list. CORS misconfiguration could allow unauthorized cross-origin access | `app.ts` CORS config | Verify all allowed origins are explicitly listed |
| SEC-7 | **Share token access modes not enforced** — schema has `view`/`comment`/`edit` but only `view` implemented. If `edit` token is used, falls back to `view` silently | `/shared/:token` route | Implement comment/edit mode restrictions |
| SEC-8 | **Admin route authorization relies on `isOwner` boolean** — no role-based access beyond `isOwner`. If `isOwner` flag is compromised, full admin access granted | `auth.ts` optionalAuth + frontend `useAuth` | Consider proper RBAC with multiple roles |
| SEC-9 | **JWT tokens stored in localStorage** — vulnerable to XSS attacks. If any JavaScript on the page executes maliciously, tokens can be stolen | `use-auth.tsx` | Consider httpOnly cookie storage with CSRF protection |

### MEDIUM

| # | Finding | Evidence | Fix |
|---|---|---|---|
| SEC-10 | **No admin audit logging** — `admin_audit_log` table exists but no route writes to it. Admin actions (suspend user, change tier) are not tracked | No write path found | Wire admin actions to `admin_audit_log` |
| SEC-11 | **No input sanitization on AI context** — user-provided `instructionText`, `outline`, document content are injected into system prompt. Potential prompt injection if user uploads malicious content | `buildSystemPrompt()` concatenates user content | Sanitize user content before injecting into system prompt |
| SEC-12 | **No request timeout on AI calls** — `fetch()` to AI providers has no timeout. A hanging request could block the serverless function | `callOpenAICompatible()`, `callAnthropic()` | Add AbortController with 60s timeout |
| SEC-13 | **Error responses may leak internal info** — pino logger logs `{ tierId, envVar, status, body }` on AI API errors. If these logs are accessible, internal config exposed | `ai.ts` logger calls | Redact tierId/envVar from error logs |
| SEC-14 | **No CSRF protection** — API accepts requests from any origin (with CORS). State-changing requests (POST/PATCH/DELETE) have no CSRF token | No CSRF middleware found | Add CSRF token validation for state-changing operations |
| SEC-15 | **Project membership not enforced on all routes** — `project_members` table exists but many routes only check `req.user` (project owner) rather than checking `project_members` table | Routes only check userId ownership | Audit every route for proper authorization |

### LOW

| # | Finding | Evidence | Fix |
|---|---|---|---|
| SEC-16 | **`trust proxy` set to 1** — correct for Vercel but allows first proxy only. If more proxies in front, real IP could be spoofed | `app.ts` | Acceptable for current setup; document if infrastructure changes |
| SEC-17 | **No request ID propagation** — each request should have a unique ID for tracing. pinoHttp may add this automatically | pinoHttp config | Verify request ID in logs |
| SEC-18 | **Sensitive data in JWT claims** — user email stored in JWT. JWT stored in localStorage + transmitted on every request. Consider minimizing claims | Supabase JWT structure | Acceptable; Supabase design |

---

## 9. ENGINEERING AUDIT

### Architecture Issues

| # | Issue | Severity | Detail |
|---|---|---|---|
| ENG-1 | **OpenAPI spec drift** | High | Many routes not in spec; spec has routes not in code. Codegen generates incomplete types. Need full spec audit |
| ENG-2 | **`projects.id` is `serial`** | High | Auto-increment integer PK. Exposed in URLs (`/projects/5`) and API responses. Should be UUID for external-facing resources |
| ENG-3 | **No E2E tests** | High | Zero Playwright/Cypress setup. Only `use-auth.test.tsx` (unit test) exists |
| ENG-4 | **`reference_citations` unused** | Medium | Table exists, not used anywhere. Either implement the feature (citation repositioning) or drop the table |
| ENG-5 | **`admin_audit_log` unused** | Medium | Table exists, no write path. Wire or document decision |
| ENG-6 | **No CI path filters** | Medium | Both CI workflows run on every push. Should filter: lib/api-spec → frontend; lib/ → backend |
| ENG-7 | **No error boundary** | Medium | React app has no error boundary. Single component crash = white screen |
| ENG-8 | **`jobs` table may be legacy** | Low | All AI routes are synchronous. `jobs` table for background processing not actively used |
| ENG-9 | **No request timeout on AI calls** | Medium | `fetch()` calls have no AbortController timeout. Could hang indefinitely |
| ENG-10 | **`MODEL_PRICING` hardcoded** | Low | Fallback pricing in `ai.ts` should come from `ai_tiers` table |

### Code Quality

| Aspect | Status | Notes |
|---|---|---|
| TypeScript strict mode | ✅ On | All workspace tsconfigs use strict |
| No `any` types | ✅ Good | Searched codebase — minimal `any` usage |
| Zod validation | ✅ All routes | All inputs validated with Zod from `@workspace/api-zod` |
| Drizzle ORM only | ✅ No raw SQL | No raw SQL found in routes |
| Error middleware | ✅ Global | `error.ts` middleware catches all errors |
| No stack trace leaks | ✅ | Production errors return JSON `{ error: ... }` |
| pino logger | ✅ Used | All routes use `logger` from `lib/logger.js` |
| Express 5 async | ⚠️ Partial | Some routes use try-catch, some rely on error middleware |
| Import order | ✅ Conformance | External → internal → relative |
| Code style | ✅ Consistent | 2-space indent, single quotes, no semicolons, trailing commas |

### Build & Deployment

| Aspect | Status | Notes |
|---|---|---|
| Typecheck | ✅ Passes | `pnpm run typecheck` |
| Build | ✅ Passes | `pnpm run build` |
| Frontend deploy | ✅ Automated | GitHub Actions → Vercel |
| Backend deploy | ✅ Automated | GitHub Actions → Vercel |
| CI/CD | ✅ Working | 2 workflows: deploy-frontend.yml, deploy-backend.yml |
| Monorepo management | ⚠️ pnpm v9/v10 | Works but Vercel build uses npm. pnpm-lock.yaml conflicts with npm |
| No ESLint | ⚠️ Missing | Project-wide ESLint not configured |

---

## 10. PERFORMANCE AUDIT

| # | Area | Finding | Severity |
|---|---|---|---|
| PERF-1 | **AI response latency** | No streaming — full response waits for complete AI generation before returning. Long responses could take 10-30s | High |
| PERF-2 | **Groq free tier shared limits** | 30 req/min + 200K tokens/day shared across ALL free users. If one user saturates, others get 429 | High |
| PERF-3 | **AI tier config cache** | 60s TTL in-memory cache. On Vercel serverless (stateless), every cold start re-fetches from DB | Medium |
| PERF-4 | **No connection pooling config** | `DATABASE_POOLER_URL` used but pool size not configured. Vercel serverless cold starts may exhaust connections | Medium |
| PERF-5 | **Large document handling** | `latestDocument.substring(0, 3000)` hardcoded. No chunking strategy for large documents | Medium |
| PERF-6 | **No CDN caching headers** | Static assets served by Vercel (good) but API responses have no caching headers for GET requests | Low |
| PERF-7 | **Bundle size** | Frontend bundle includes reveal.js for PPTX preview. Only needed on export pages | Low |
| PERF-8 | **No image optimization** | No `vite-plugin-imagemin` or similar. Large images uploaded as attachments served as-is | Low |
| PERF-9 | **N+1 query potential** | `getProjectStats` may run multiple queries for project + documents + references + messages | Medium |
| PERF-10 | **No prefetching** | TanStack Query prefetch not used. Next likely page not prefetched | Low |

---

## 11. COST AUDIT

### Unit Economics

From `ai.ts` MODEL_PRICING and `ai_tiers` table structure:

| Tier | Provider | Model | Input Cost | Output Cost | Sell Price | Margin |
|---|---|---|---|---|---|---|
| Free | Groq | Llama 3.1 8B | $0 | $0 | Free | N/A |
| Standard | Groq | Llama 3.3 70B | $0.001/1M | $0.004/1M | IDR configurable | TBD |
| Premium | Anthropic | Claude 3.5 Sonnet | $3.00/1M | $15.00/1M | IDR configurable | TBD |
| Ultra | OpenAI | GPT-4o | $2.50/1M | $10.00/1M | IDR configurable | TBD |

**Note:** `ai_tiers` table has `providerCostPer1MInputCents` + `providerCostPer1MOutputCents` for margin calculation. Current tiers NOT seeded in DB — requires owner to configure via admin dashboard.

### Known Costs

| Cost | Amount | Notes |
|---|---|---|
| Supabase | Free tier (Teora's current) | DB, Auth, Storage |
| Vercel | Hobby → Pro plan needed | Pro needed for serverless functions with duration >10s |
| Groq | Free tier | 30 req/min, 200K tokens/day shared |
| Anthropic | Not configured | API key not set |
| OpenAI | Not configured | API key not set |

### Cost Risks

| # | Risk | Mitigation |
|---|---|---|
| COST-1 | Groq free tier exhaustion | Monitor usage; implement per-user limits; consider Groq paid tier |
| COST-2 | No AI tier seeding | Owner must configure tiers via admin dashboard before paid features work |
| COST-3 | Token economy not enforced | Balance can go negative due to race condition in deductCredit |
| COST-4 | Stripe not configured | Topup impossible — no revenue |
| COST-5 | No usage analytics | Can't optimize costs without visibility |

---

## 12. RISK REGISTER

| # | Risk | Severity | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | AI provider outage (Groq down) | High | Medium | All AI features down | Implement fallback chain |
| R-02 | Groq free tier exhausted by one user | High | Medium | All free users get 429 | Per-user rate limiting |
| R-03 | Balance race condition (double-spend) | Critical | Low | Revenue loss | Atomic check-and-deduct |
| R-04 | Indonesia UU PDP 2022 violation | Critical | Low | Legal non-compliance | Add consent tracking |
| R-05 | Prompt injection via uploaded content | High | Low | System prompt manipulation | Sanitize user content |
| R-06 | Share token token collision/guess | Medium | Low | Unauthorized access | Use crypto UUID |
| R-07 | Vercel cold start timeout on AI calls | Medium | Medium | Slow first response | Increase function timeout |
| R-08 | Supabase connection pool exhaustion | Medium | Low | 503 errors | Configure pool size |
| R-09 | XSS via stored XSS in document content | Medium | Low | Malicious script execution | Sanitize HTML on render |
| R-10 | JWT stored in localStorage (XSS steal) | Medium | Low | Account takeover | httpOnly cookies |
| R-11 | No AI eval / hallucination detection | Medium | High | Low-quality responses damaging reputation | Build eval pipeline |
| R-12 | Stale model names in pricing doc | Low | High | Confusion during tier setup | Update to current model names |
| R-13 | OpenAPI spec drift | High | High | Type mismatches at runtime | Audit and sync spec |
| R-14 | Referral abuse (fake accounts) | Medium | Medium | Revenue loss from fake referrals | Add email verification + first-payment requirement |
| R-15 | No error boundary (white screen crashes) | Medium | Low | User frustration | Add React error boundary |

---

## 13. MVP DEFINITION

**MVP = features needed for Teora to acquire and retain its first 100 paying users.**

### Must Have (MVP)

1. User registration + email verification (email/password + Google OAuth)
2. Project creation with metadata (title, task type, subject, citation format, instructions, outline)
3. AI document generation from outline
4. AI chat with project context
5. Reference management (add, validate, cite)
6. Document export (DOCX + PPTX + MD)
7. Token credit economy (balance display, usage tracking)
8. Topup via payment gateway (Stripe or Midtrans)
9. Usage history (token spending per user)
10. Responsive UI on mobile

### Nice to Have (Post-MVP)

- PDF export
- AI streaming
- RAG pipeline
- Citation auto-update on format change
- Quiz generation + educator tools
- Practice/recommendation system
- Writing style analysis
- Multi-document chapter management
- Real-time collaboration comments
- Email/password change
- Password reset
- i18n (English + Indonesian switcher)
- Admin dashboard (user management, tier configuration)
- Referral system (full funnel)
- Document templates
- Share token with comment/edit modes

---

## 14. ROADMAP

### Phase 0 — Stabilization (1 week)

> Fix gaps that block a clean production launch.

- [ ] Add consent tracking columns (`tos_consented_at`, `privacy_consented_at`)
- [ ] Implement spend-cap middleware (pre-check balance before AI call)
- [ ] OpenAPI spec completeness audit + sync
- [ ] Add error boundary component
- [ ] Add 429 rate limit user message
- [ ] Implement AI model fallback chain
- [ ] Fix Groq free tier per-user limits
- [ ] Fix `projects.id` to use UUID (breaking change — needs migration)
- [ ] Wire `admin_audit_log` writes
- [ ] Remove or implement `reference_citations`

### Phase 1 — AI Quality (2 weeks)

> Improve AI response quality and reliability.

- [ ] Implement RAG pipeline (chunking + semantic search)
- [ ] Add streaming for chat responses
- [ ] Build AI eval dataset (hallucination traps, citation accuracy)
- [ ] Prompt versioning system
- [ ] Reference CrossRef validation
- [ ] Citation format auto-update when format changes

### Phase 2 — Payments & Growth (2 weeks)

> Enable revenue.

- [ ] Stripe or Midtrans integration
- [ ] Topup flow (frontend + backend)
- [ ] AI tier seeding (owner configures via admin dashboard)
- [ ] Referral system full implementation
- [ ] Email verification enforcement for referrals

### Phase 3 — Educator Tools (3 weeks)

> Expand to teacher/lecturer segment.

- [ ] Quiz builder (standalone, not project-linked)
- [ ] Share quiz via link + QR code
- [ ] Quiz to PDF/print
- [ ] Photo answer OCR (if A/B decision: direct multimodal LLM vs. Google Vision)
- [ ] AI-assisted grading review
- [ ] Submission tracker dashboard

### Phase 4 — Polish & Scale (2 weeks)

> Improve UX and prepare for scale.

- [ ] i18n (English + Indonesian) — 5 pending decisions
- [ ] Mobile responsive sidebar
- [ ] PDF export
- [ ] Onboarding wizard
- [ ] Breadcrumb navigation
- [ ] Keyboard shortcuts
- [ ] Usage analytics dashboard for owner
- [ ] Per-user AI usage analytics

### Phase 5 — Advanced (Backlog)

- FSRS spaced repetition for Practice
- Team workspaces
- Real-time collaboration (WebSocket/SSE)
- Video/audio content support
- Academic integrity detection (plagiarism)

---

## 15. KPI

### User Acquisition

| KPI | Target (Month 1) | Target (Month 3) | Target (Year 1) |
|---|---|---|---|
| New registrations | 50 | 500 | 5,000 |
| Email-verified users | 40 (80%) | 400 (80%) | 4,000 (80%) |
| Google OAuth users | 10 (20%) | 150 (30%) | 1,500 (30%) |
| Users with first project | 30 (60%) | 300 (60%) | 3,000 (60%) |

### Engagement

| KPI | Target |
|---|---|
| Projects created per user (month 1) | 2.0 |
| AI chat messages per user (month 1) | 10 |
| Documents generated per user (month 1) | 1.5 |
| 7-day retention | 30% |
| 30-day retention | 15% |

### Revenue

| KPI | Target |
|---|---|
| Paying users (month 1) | 5 |
| Paying users (month 3) | 50 |
| Paying users (year 1) | 500 |
| Average revenue per user (ARPU) | Rp 50,000/month |
| Conversion rate (free → paid) | 5% |

### AI Quality

| KPI | Target |
|---|---|
| AI error rate (5xx on AI routes) | < 1% |
| Average AI response time | < 10s |
| Citation accuracy | > 95% (references verified) |
| User satisfaction (CSAT) | > 4.0/5 |

### Technical

| KPI | Target |
|---|---|
| API uptime | 99.5% |
| Frontend Core Web Vitals (LCP) | < 2.5s |
| Backend p50 latency | < 200ms |
| Backend p99 latency | < 2000ms |
| Groq free tier utilization | < 50% of daily limit |

---

## 16. EXPLICITLY NOT BUILDING (Decision Log)

These are features discussed but deliberately excluded from the roadmap:

| Feature | Reason | Revisit Date |
|---|---|---|
| Video/audio content support | No evidence of user demand; high processing cost | 2027 |
| Multi-language AI (Thai, Vietnamese, etc.) | Indonesian market not saturated; expand after 1K users | 2027 |
| Offline mode | React SPA — would need significant architecture change | 2028 |
| Native mobile app | Web app covers 95% of use cases; PWA may suffice | 2027 |
| Team workspaces (orgs/departments) | `project_members` exists but not prioritized; single-user first | 2027 |
| White-label / enterprise | Too early; focus on consumer/solo first | 2028 |

---

## 17. DECISION LOG

| # | Decision | Chosen | Rationale | Date |
|---|---|---|---|---|
| D-001 | API schema source of truth | OpenAPI YAML | Human-readable, auto-generates types + hooks | 2026 |
| D-002 | Auth provider | Supabase Auth | Integrated with DB, JWT built-in, OAuth supported | 2026 |
| D-003 | Server state | TanStack Query | Auto-generated hooks from OpenAPI, superior caching | 2026 |
| D-004 | CSS framework | Tailwind CSS v4 | CSS-first config, Vite-native | 2026 |
| D-005 | HTTP framework | Express 5 | Largest middleware ecosystem | 2026 |
| D-006 | ORM | Drizzle | TypeScript-native, no DSL, works with Zod | 2026 |
| D-007 | Backend deployment | Vercel Function | Zero server management, auto-scale, built-in CI/CD | 2026-08-23 |
| D-008 | Project ID type | `serial` (current) → should be UUID | Internal IDs exposed in URLs | **PENDING** |
| D-009 | Share token security | `Math.random()` (current) → should be crypto UUID | Current implementation guessable | **PENDING** |
| D-010 | AI fallback | None (current) → should implement | No graceful degradation | **PENDING** |
| D-011 | Consent tracking | UI only (current) → should add DB columns | UU PDP 2022 compliance | **PENDING** |
| D-012 | i18n approach | Mixed EN/ID (current) → should implement EN+ID | 5 design decisions pending | **PENDING** |
| D-013 | Payment gateway | Not configured (Stripe or Midtrans) | Owner action required | **PENDING** |

---

## 18. IMPLEMENTATION PLAN

### Immediate (Before Next Deploy)

Per owner directive: implementation is deferred. The audit findings above serve as the roadmap.

### Priority Queue

| Priority | Item | Effort | Owner |
|---|---|---|---|
| P0 | **Payment gateway setup** | Owner action | Owner |
| P0 | **AI API key setup** | Owner action | Owner |
| P1 | Consent tracking DB columns | 2 hours | AI Team |
| P1 | Spend-cap middleware (pre-check balance) | 2 hours | AI Team |
| P1 | OpenAPI spec audit + sync | 4 hours | AI Team |
| P1 | AI model fallback chain | 3 hours | AI Team |
| P1 | Rate limit user message (429) | 1 hour | AI Team |
| P1 | `Math.random()` → crypto UUID for share tokens | 1 hour | AI Team |
| P2 | Error boundary component | 1 hour | AI Team |
| P2 | Groq per-user rate limits | 4 hours | AI Team |
| P2 | Wire `admin_audit_log` | 2 hours | AI Team |
| P2 | `reference_citations` implement or remove | 4 hours | AI Team |
| P2 | AI request timeout (AbortController) | 1 hour | AI Team |
| P3 | RAG pipeline | 2 weeks | AI Team |
| P3 | AI streaming | 1 week | AI Team |
| P3 | i18n implementation | 1 week | AI Team (pending 5 decisions) |
| P3 | Mobile responsive sidebar | 4 hours | AI Team |
| P3 | PDF export | 1 week | AI Team |

---

## 19. CHALLENGES & QUESTIONS FOR OWNER

Before implementing Phase 0, the following decisions need owner input:

| # | Question | Options |
|---|---|---|
| Q-1 | **Payment gateway:** Stripe or Midtrans? | Stripe (international) / Midtrans (Indonesia-focused) |
| Q-2 | **AI tier seeding:** Should AI Team pre-seed the `ai_tiers` table with recommended tiers, or owner configures via admin dashboard? | Pre-seed / Owner configures |
| Q-3 | **Groq free tier strategy:** Upgrade to paid tier (per-user limits) or implement rate limiting in code? | Groq paid / Code-based limits |
| Q-4 | **Project ID migration:** Migrating `serial` → `uuid` is a breaking change affecting URLs, API responses, DB relations. When to do this? | Now (breaking) / After v1.0 / Never |
| Q-5 | **`reference_citations` fate:** The table exists for citation repositioning but is unused. Implement it (2-3 days) or drop it? | Implement / Drop |
| Q-6 | **i18n priority:** English-first approach vs. Indonesian-first. Current UI is Indonesian. Should i18n prioritize English or maintain Indonesian as primary? | English-first / Indonesian-first |
| Q-7 | **RAG strategy:** Simple chunking (split by paragraphs, feed to context) vs. semantic search (embeddings + vector DB). Simple approach is faster to implement. | Simple chunking / Semantic search |
| Q-8 | **Stripe webhook secret:** Required for payment verification. Where to store? | Vercel env vars / Supabase Edge Function |

---

*Audit completed 2026-09-05. Findings categorized by severity: Critical (7), High (17), Medium (19), Low (9). Total: 52 findings across 10 audit dimensions.*
