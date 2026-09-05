# INITIAL PROJECT AUDIT — Teora AI Academic Workspace

> **Date:** 2026-09-05
> **Auditor:** AI Engineering Team (autonomous, 4-agent parallel audit)
> **Scope:** Full monorepo — product, engineering, AI, security, business, UX
> **Method:** Understand → Inspect → Research → Challenge → Decide → Plan → (Implementation deferred)
> **Constraint:** "Pahami dulu, jangan langsung setup. Simpan dulu temuan ke dokumentasi."

---

## EXECUTIVE SUMMARY

**Teora** adalah AI Academic Workspace untuk mahasiswa Indonesia. MVP sudah live: auth (email/password + Google OAuth), projects, AI chat, references, quiz, rubric, writing style, dan token economy sudah berfungsi.

**Kekuatan:**
- Clean 3-layer architecture (React SPA + Express + Drizzle + Supabase PG)
- AI features bekerja (chat, quiz, rubric, outline, write, export PPTX)
- Indonesian-language UI konsisten
- Token-based billing infrastructure sudah ada
- Auth foundation solid (Supabase JWT + OAuth)

**Yang belum selesai:**
- AI provider API key belum di-set → AI tidak jalan
- Payment gateway belum wired → tidak ada revenue
- Mobile nav tidak ada
- Positioning belum dikunci

**Gap kritis antara docs vs reality:** 15+ items (termasuk citation endpoints yang ada di spec tapi tidak ada di code, DOCX export tidak di-build, PDF export rusak)

**Verdict:** Proyek impresif untuk 1 developer. Tapi ada gap signifikan antara feature count dan product readiness untuk launch publik. 3 hal kritis: (1) positioning belum dikunci, (2) mobile UX rusak, (3) payment belum terhubung.

**Score by Dimension:**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Product Vision | 7/10 | Clear but positioning not locked |
| Engineering | 6/10 | Solid foundations, technical debt + gaps |
| AI Features | 6/10 | Core working, missing grounding + timeout |
| Security | 7/10 | Auth solid, RLS gaps + no rate limit UX |
| Business | 3/10 | No payment, no revenue |
| UX | 5/10 | Mobile nav broken, nav overload |
| Documentation | 5/10 | Comprehensive but stale in places |

---

## 1. PRODUCT POSITIONING

### 1.1 Current State

**Hero message:** "Asisten Akademik untuk Belajar, Memahami, Menguasai"
**Sub:** "Teora membantu Anda memahami tugas akademik dari awal sampai akhir — bukan hasil jadi, tapi pemahaman yang Anda kuasai sendiri."
**CTA:** "Mulai Gratis" + "Daftar Sekarang"

**5 fitur di landing:** Task Mentor, Practice, Pustaka Saya, AI Assistant, Export

### 1.2 Gap: Landing ≠ App

| Route | Ada di App.tsx | Dipromokan di Landing? |
|-------|----------------|----------------------|
| `/dashboard` | ✅ | ❌ |
| `/projects` (Daftar Task) | ✅ | ❌ |
| `/projects/new` | ✅ | ❌ |
| `/finops` | ✅ | ❌ |
| `/referral` | ✅ | ❌ |
| `/ai-pricing` | ✅ | ❌ |
| `/topup` | ✅ | ❌ |
| `/practice` | ✅ | ❌ |
| `/assessment` | ✅ | ❌ |
| `/usage` | ✅ | ❌ |
| `/pustaka-saya` | ✅ | ❌ |
| `/profile` | ✅ | ❌ |
| `/bantuan` | ✅ | ❌ |

**Landing hanya tampilkan 5 fitur, tapi ada 24+ route lain di aplikasi.** Discovery gap besar — user potensial tidak tahu fitur-fitur ini ada.

### 1.3 Positioning Options (Belum Dipilih Owner)

Dari `docs/ai-team/product/positioning.md`, 4 option masih pending sejak 2026-08-21:

| Option | Positioning | Risk |
|--------|-------------|------|
| A | "Jenni AI untuk Indonesia" — academic writing focus | Butuh citation superiority yang kuat |
| B | "AI Tutor Indonesia" — learning/understanding focus | Butuh mastery tracking yang compelling |
| C | "Academic Journey Partner" — semester-long companion | Butuh long-term retention mechanics |
| D | "Citation-First" — reference management + AI | Terlalu sempit? |

### 1.4 Competitive Gap

| Competitor | Teora Advantage | Teora Weakness |
|---|---|---|
| ChatGPT/Gemini/Claude | Project context, reference management, citation, credit economy | No multimodal |
| NotebookLM | Reference + AI chat | Indonesian academic focus, citation, credit |
| Jenni.ai | Indonesian language, local format | Jenni lebih mature |
| Khan Academy | Free, structured curriculum | No AI personalization |
| Quizlet | Quiz dengan repetition | No AI generation |

**Honest assessment:** Teora's ONE reason to exist — contextual AI that understands Indonesian academic writing (makalah, skripsi, laporan) and generates properly formatted Indonesian citations (APA, MLA, Chicago, UBC, ICMJE).

---

## 2. FEATURE AUDIT

### KEEP (fitur penting dan berfungsi)

| Feature | Why | Status |
|---------|-----|--------|
| Task Mentor (Projects) | Core workflow — create project, write outline, generate document | Working |
| AI Chat | Core AI interaction per project | Working |
| Quiz | AI-generated quiz dengan repetition | Working |
| Reference Management | Simpan referensi, auto-cite | Working (UI ada) |
| Export PPTX | Generate slide dari outline | Working |
| Token Economy | Balance, deduct, usage log | Working |
| Auth | Email/password + Google OAuth | Working |
| Landing Page | Public-facing entry point | Working |
| Usage Tracking | User bisa lihat pemakaian token | Working |

### IMPROVE (penting tapi perlu diperbaiki)

| Feature | Problem | Fix Priority |
|---------|---------|--------------|
| Mobile Navigation | Tidak ada sidebar/drawer di mobile | P0 |
| Rate Limit UX | User tidak tahu saat kena rate limit | P1 |
| AI Citation | Tidak ada grounding/validation — hallucination risk | P1 |
| Spend Cap | AI bisa jalan walau balance = 0 | P1 |
| Share Token | Math.random() bukan cryptographic | P1 |
| AI Timeout | Request bisa hang selamanya | P1 |
| AI Fallback | Groq down = semua AI mati | P1 |
| PDF Export | Route ada tapi tidak berfungsi | P2 |
| DOCX Export | Spec ada tapi tidak di-build | P2 |
| Admin Audit Log | Table ada tapi tidak ditulis | P2 |
| Per-user Rate Limit | Semua user dapat 30 req/min yang sama | P2 |

### DELAY (bagus tapi belum prioritas)

| Feature | Why Delay |
|---------|----------|
| RAG Pipeline | Butuh data volume untuk validate value |
| Section-scoped AI Chat | Semua chat project-scoped sekarang |
| Notifications | Belum ada user demand |
| Collaboration/Members | Table+route ada tapi UI tidak ada |
| Document Templates | Table+route ada tapi UI tidak ada |
| Zotero Sync | Spec tapi tidak pernah di-build |
| Plagiarism Detection | Out of scope untuk MVP |

### REMOVE (tidak punya value cukup)

| Feature | Why |
|---------|-----|
| Project Templates | Tidak ada UI, tidak ada demand |
| Collaborative editing | Out of scope |
| Mobile native app | SPA sudah cukup |

### ADD (kebutuhan penting yang belum ada)

| Feature | Why Needed |
|---------|-----------|
| Mobile drawer navigation | 40%+ user Indonesia mobile-first |
| Spend cap enforcement | Revenue protection |
| Rate limit user message | UX — user harus tahu kenapa gagal |
| UU PDP consent banner | Legal compliance |
| Onboarding flow | User baru tidak tahu harus mulai dari mana |

---

## 3. SECURITY AUDIT

### Critical (3)

| # | Finding | File | Impact | Fix |
|---|---------|------|---------|-----|
| C1 | `supabase-admin.ts` throws at module level — crashes server if env vars missing | `src/lib/supabase-admin.ts` | Server won't start if env vars misconfigured | Wrap in try/catch, graceful degradation |
| C2 | No file size limit on uploads | `routes/attachments.ts` | Base64 upload unbounded — OOM risk | Add max size check |
| C3 | `/tmp/` on Vercel is ephemeral | `routes/exports.ts` | Export files written to `/tmp/` disappear | Use `/var/task/` or stream directly |

### High (4)

| # | Finding | File | Impact | Fix |
|---|---------|------|---------|-----|
| H1 | **VERIFIED** — `orderBy(sql\`created_at desc\`)` wrong column name | `routes/ai-usage.ts:51` | Every GET /ai-usage throws SQL error | `orderBy(desc(aiUsageLogTable.createdAt))` |
| H2 | Stripe webhook tidak ada | `routes/webhooks.ts` | `addCredit` references `stripePaymentIntentId` tapi webhook tidak ada | Implement Stripe webhook |
| H3 | Race condition — duplicate project fetch | `routes/projects.ts` | Analyze pipeline fetches same project twice | Cache atau single fetch |
| H4 | `deductCredit` failure = silent success | `routes/*.ts` | User gets free AI if deduct fails | Throw on failure, rollback |

### Medium (12)

| # | Finding |
|---|---------|
| M1 | Rate limiter ignores AI tier — free dan premium user sama-sama 30 req/min |
| M2 | User bisa request tier premium di body, tidak ada authorization check |
| M3 | Webhook HMAC verification missing |
| M4 | No DB transactions — multi-step operations bisa partial |
| M5 | Credit deducted even on parse failure |
| M6 | No AI endpoint tests |
| M7 | CrossRef/DOI tidak di-rate-limit |
| M8 | Chat history grows forever — no pruning |
| M9 | Export DOCX CPU-intensive on serverless |
| M10 | Quiz submission tidak `logActivity` |
| M11 | Admin suspend endpoint tidak benar-benar suspend |
| M12 | DOI check-then-insert race condition |

### Low (8)

| # | Finding |
|---|---------|
| L1 | `Math.random()` for share tokens — should be crypto |
| L2 | Admin email comparison case-sensitive — should `.toLowerCase()` |
| L3 | `reference_citations` table exists but not used anywhere |
| L4 | `admin_audit_log` table exists but never written |
| L5 | Owner email hardcoded in source |
| L6 | No E2E tests |
| L7 | No error logging consistency |
| L8 | Groq free tier shared limits — all users compete for 30 req/min + 200K tokens/hari |

### Security Strengths

- JWT verification solid (HS256-first + JWKS fallback)
- Prompt injection sanitization excellent (10 regex patterns)
- Per-route auth middleware pattern correct
- 3-tier project ownership model (owner/collaborator/viewer)
- CORS configured correctly (callback null/false, not throw)
- Rate limiting on auth endpoints
- Zod validation on all endpoints

---

## 4. ENGINEERING AUDIT

### Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React SPA (Vite), wouter, TanStack Query, shadcn/ui | Clean |
| Backend | Express, Drizzle ORM, pino logging | Clean |
| Database | PostgreSQL via Supabase | Solid |
| Auth | Supabase JWT + OAuth | Solid |
| AI | Groq API (model configurable) | Working |
| Deploy | Vercel (frontend + backend) | Working |
| API Spec | OpenAPI YAML + Orval codegen | Good practice |

### Database Schema

**30 tables implemented** (vs 13 documented in architecture.md):

Core: `users`, `projects`, `project_activities`, `project_sections`, `project_messages`
Documents: `documents`, `attachments`
References: `references`, `reference_citations`, `account_references`
AI: `ai_usage_log`, `user_balances`
Quizzes: `quizzes`, `quiz_questions`, `quiz_answers`, `learning_activities`
Admin: `admin_audit_log`, `ai_tiers`, `referrals`, `sessions`
Auth: `sessions`

### OpenAPI Spec Drift

**Route di code tapi tidak di spec:** 15+ endpoints
**Route di spec tapi tidak di code:** 5+ endpoints (termasuk citation endpoints)
**Fix:** Run codegen setelah setiap perubahan spec

### Tech Debt Summary

| Type | Count | Severity |
|------|-------|----------|
| `any` type usage | 3 | Medium |
| Functions >100 lines | 5+ | Low |
| Dead code / orphan files | 7 | Low |
| No migration history | 1 | High |
| OpenAPI drift | 1 | High |
| Stale generated files | 1 | Medium |

---

## 5. AI ARCHITECTURE AUDIT

### What's Working

| Component | Status | Notes |
|-----------|--------|-------|
| System prompt | ✅ Good | 6 mode (outline, write, chat, quiz, rubric, style), Bahasa Indonesia |
| Prompt injection sanitization | ✅ Excellent | 10 regex patterns, 100K char truncation |
| Sanitization on output | ✅ Good | Strips credential patterns |
| AI error handling | ⚠️ Partial | Logs error but user gets generic message |
| Cost tracking | ✅ Good | `logAIUsage` + `deductCredit` on every AI call |

### What's Missing / Broken

| Component | Status | Impact |
|-----------|--------|--------|
| AI timeout | ❌ Missing | Request can hang indefinitely |
| AI fallback chain | ❌ Missing | Groq down = all AI dead |
| Citation grounding | ❌ Missing | Hallucination risk tinggi |
| Per-user rate limit | ⚠️ Partial | All users share same limit |
| Before-the-fact cost estimation | ❌ Missing | User tidak tahuestimasi biaya sebelum call |
| RAG pipeline | ❌ Missing | Long docs truncated to 3000 chars |
| AI evaluation dataset | ❌ Missing | No systematic quality measurement |

### AI Model Names (Stale)

Pricing docs mention GPT-4-turbo, GPT-3.5-turbo, Claude 3.5 Sonnet — all 2023-2024 models. Need update to current model names and pricing.

---

## 6. UX AUDIT

### Navigation Overload

Sidebar punya 7 item + 5 sub-item di bawah "Akun":

1. Dashboard
2. Task Mentor (collapsible: General Task, Academic Work)
3. Assessment
4. Practice
5. Pustaka Saya
6. Separator
7. Akun (collapsible: Profil, Penggunaan, Topup, Pricing, Bantuan)

**Problem:** Terlalu banyak untuk user baru. Tidak ada grouping by goal.

### Mobile Navigation — CRITICAL BROKEN

Sidebar di-set `hidden md:flex` — tapi tidak ada mobile drawer. User mobile tidak bisa navigasi.

### Missing UX States

| State | Status |
|-------|--------|
| Empty states | ⚠️ Not verified per page |
| Loading states | ⚠️ Partial — skeleton/spinner tidak konsisten |
| Error states | ⚠️ Sebagian sudah diperbaiki (silent errors) |
| Onboarding | ❌ Tidak ada — user baru tidak tahu harus mulai dari mana |

### User Flows

**Onboarding (tidak ada):** User daftar → ke dashboard → tidak ada panduan apa yang harus dilakukan pertama kali.

**Core workflow:** Create project → Write outline → Generate → Export — ini yang paling jelas dan berfungsi.

**Reference management:** Add reference → Auto-cite → Generate bibliography — UI ada tapi citation grounding tidak ada.

---

## 7. PAYMENT & BUSINESS AUDIT

### What's Working

| Component | Status |
|-----------|--------|
| Token economy | ✅ Balance, deduct, usage log |
| Credit tracking | ✅ Per-user, per-feature |
| Usage display | ✅ /usage page (IDR) |
| Balance warning | ✅ Low balance banner |

### What's Missing / Broken

| Component | Status | Impact |
|-----------|--------|--------|
| Midtrans wiring | ❌ Tidak ada backend endpoint | Payment tidak bisa jalan |
| Stripe webhook | ❌ Tidak ada | addCredit tidak pernah dipanggil |
| Spend cap | ❌ Tidak ada | AI jalan walau balance = 0 |
| Referral payout | ⚠️ Track-only | Tidak ada actual payout |
| Subscription tiers | ⚠️ Table+UI ada | Tidak ada yang activated |
| Margin analysis | ❌ Tidak ada | Tidak tahu profitabilitas per tier |

### Cost Audit (Estimasi)

**Groq API:**
- llama-3.3-70b: $0.59/1M input tokens, $0.79/1M output
- Gemma2-9b: $0.20/1M input, $0.20/1M output

**Per user scenario:**
- 100 messages/bulan × 500 tokens/message × $0.59/1M = ~$0.03/bulan/user
- Jika pricing Rp 50.000/bulan → margin ~Rp 49.500/bulan per user

**Unknowns:** Need actual usage data untuk validate.

---

## 8. DOCUMENTATION VS REALITY

15+ mismatches found:

| # | Documentation Says | Reality |
|---|------------------|---------|
| 1 | AI provider configured | Env vars missing |
| 2 | Payment via Stripe | Stripe code ada tapi webhook tidak ada |
| 3 | Subscription tiers active | Table+UI ada tapi tidak activated |
| 4 | Citation endpoints | Hanya di OpenAPI spec, tidak ada route handler |
| 5 | Referral rewards payout | Track-only, tidak ada payout |
| 6 | Global reference library | Table ada, tidak ada dedicated UI |
| 7 | Section-scoped AI chat | Semua project-scoped |
| 8 | Document templates | Table+route ada, tidak ada UI |
| 9 | Export DOCX/PDF | DOCX tidak di-build, PDF rusak |
| 10 | Search references | DOI/ISBN saja, tidak ada internet search |
| 11 | FinOps dashboard | Raw table display only |
| 12 | 7 AI tier configs | Tidak semua digunakan |
| 13 | Zotero sync | Spec tapi tidak pernah di-build |
| 14 | Notifications | Tidak pernah di-build |
| 15 | Project members invite | Table+route ada, tidak ada UI |
| 16 | DB: 13 tables | Actually 30 tables |

---

## 9. RISK REGISTER

| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| AI provider down = all features dead | High | Critical | Critical | Implement fallback chain |
| Malicious user drains budget via unbounded AI | Medium | High | Critical | Spend cap + before-call balance check |
| Groq free tier exhausted by few users | High | High | Critical | Per-user rate limit + tier enforcement |
| XSS via unsanitized AI output | Low | High | High | Sanitization exists, verify coverage |
| User data leak via RLS misconfiguration | Low | Critical | High | Audit RLS policies |
| JWT stored in localStorage = XSS theft | Low | High | High | Move to httpOnly cookie |
| Regulatory (UU PDP) violation | Medium | High | High | Consent banner + data retention |
| Share token collision | Low | Medium | Medium | Use crypto instead of Math.random() |
| Export file loss on serverless | High | Low | Medium | Don't use /tmp/, stream directly |
| Module-level throw crashes server | Low | High | High | Wrap supabase-admin in try/catch |

---

## 10. MVP DEFINITION

### Must Have (untuk launch)

Tanpa ini produk tidak bisa jalan:

1. AI API key configured + functional
2. Payment gateway (Midtrans) wired + working
3. Spend cap enforcement
4. Rate limit user-facing message
5. Mobile navigation (drawer)
6. Basic onboarding (bukan kosong screens)

### Should Have (segera setelah launch)

7. AI citation grounding
8. AI timeout + fallback
9. UU PDP consent banner
10. Error/loading/empty states per page

### Nice to Have (setelah validated)

11. RAG pipeline
12. Onboarding flow
13. Analytics integration
14. Referral payout
15. DOCX export fix

### Not Now

- Zotero sync
- Plagiarism detection
- Collaboration features
- Mobile native app
- Advanced AI evaluation

### Never / Remove

- Project templates (no UI, no demand)
- Comment/edit share modes (viewer only is fine for MVP)
- Real-time collaboration

---

## 11. ROADMAP

### Phase 0 — Survival (1-2 minggu)

Goal: AI actually works in production.

1. Set AI provider API key
2. Test every AI endpoint — verify responses
3. Fix AI timeout + fallback
4. Implement spend cap
5. Fix verified SQL error in ai-usage.ts
6. Fix PDF export or disable it
7. Build DOCX export or disable it

### Phase 1 — Payment (1-2 minggu)

Goal: Can actually take money.

1. Wire Midtrans backend endpoint
2. Integrate Midtrans payment page
3. Implement Stripe webhook
4. Fix spend cap (Phase 0 item 4)
5. Add rate limit user message
6. Activate subscription tiers

### Phase 2 — Polish (2-4 minggu)

Goal: Product usable tanpa confusion.

1. Mobile drawer navigation
2. Basic onboarding
3. UU PDP consent banner
4. Error/loading/empty states per page
5. Fix 7 orphan files
6. Citation grounding research

### Phase 3 — Growth (Setelah validated)

1. AI evaluation dataset
2. RAG pipeline
3. Referral payout
4. CrossRef search upgrade
5. Analytics integration
6. Onboarding flow improvement

---

## 12. OPEN QUESTIONS FOR OWNER

| # | Question | Why | Owner Decision? |
|---|----------|-----|----------------|
| 1 | **Positioning** — Pilih A/B/C/D? | Landing + go-to-market tergantung ini | YES |
| 2 | **Payment gateway** — Midtrans atau Stripe? | Indonesia market | YES |
| 3 | **AI provider** — Groq free tier atau paid tier? | Free tier punya shared limit problem | YES |
| 4 | **Free tier limits** — Max projects, max tokens/hari? | Revenue protection | YES |
| 5 | **UU PDP compliance** — Consent banner + retention? | Legal requirement | YES |
| 6 | **Custom domain** — teora.id, teora.com, atau tetap vercel.app? | Branding | YES |
| 7 | **Referral reward** — Berapa besar? | Business model | YES |
| 8 | **Analytics tool** — Plausible, Mixpanel, atau PostHog? | No analytics today | NO (AI can decide) |

---

## 13. EXPLICITLY NOT BUILDING

Berdasarkan audit, berikut yang sengaja tidak dibangun:

| Item | Alasan |
|------|--------|
| Zotero sync | Tidak ada user demand, effort tinggi |
| Plagiarism detection | Out of scope untuk MVP, liability risk |
| Collaborative editing | Out of scope, complexity tinggi |
| Mobile native app | SPA sudah cukup untuk MVP |
| Real-time collaboration | Socket.io/server push tidak ada, tidak dibutuhkan |
| i18n EN+ID | 5 owner decision belum ada, effort tinggi untuk benefit rendah |
| Document templates | Table+route ada tapi tidak ada demand untuk UI |
| Comment/edit share modes | Viewer-only sudah cukup untuk MVP |
| Full RAG pipeline | Perlu data volume untuk validate value |
| Advanced AI evaluation | Perlu actual user data untuk build dataset |

---

## 14. DECISION LOG

| Decision | Status | Owner? |
|----------|--------|--------|
| Positioning option (A/B/C/D) | PENDING | YES |
| Payment gateway (Midtrans/Stripe) | PENDING | YES |
| AI provider (Groq free/paid) | PENDING | YES |
| Free tier limits | PENDING | YES |
| UU PDP compliance approach | PENDING | YES |
| Custom domain | PENDING | YES |
| Referral reward amount | PENDING | YES |

---

## 15. ACCEPTANCE CRITERIA (Per Feature)

### AI Chat
- [ ] Response dalam <10 detik untuk 500 token
- [ ] Rate limit message muncul saat exceeds
- [ ] Balance check sebelum call
- [ ] Timeout setelah 60 detik
- [ ] Fallback message saat AI provider down

### Payment (Topup)
- [ ] Midtrans snap window opens
- [ ] Webhook menerima payment confirmation
- [ ] Balance bertambah setelah payment
- [ ] Error handling jika payment gagal

### Mobile Navigation
- [ ] Hamburger menu di mobile
- [ ] Drawer dengan semua nav item
- [ ] Sub-items expandable

### Citation
- [ ] Citation dari Auto-Cite bisa diverifikasi kebenarannya
- [ ] Tidak ada fabricated reference
- [ ] AI response-grounded pada document content

---

## 16. KPI METRICS

Yang harus di-track (tidak ada yang currently diintegrasikan):

| Metric | Target | Current |
|--------|--------|---------|
| Activation rate | % user yang buat project pertama dalam 7 hari | Unknown |
| WAU/MAU | >30% | Unknown |
| Sessions/user/week | >3 | Unknown |
| Task completion rate | % project yang berhasil export | Unknown |
| AI acceptance rate | % AI response yang di-accept user | Unknown |
| Referral conversion | % user yang invite teman | Unknown |
| Cost per active user | <Rp 2.000/bulan | Unknown |
| Payment conversion | % user yang topup | Unknown |

---

## 17. TESTING STRATEGY

### Current State

- Unit tests: ~7 test files ada, coverage tidak diketahui
- Integration tests: Ada untuk beberapa routes
- E2E tests: Tidak ada

### Yang Dibutuhkan

| Type | Coverage Target | Priority |
|------|---------------|----------|
| AI hallucination test | Critical prompts | P0 |
| Rate limit test | Semua AI endpoint | P1 |
| Payment flow test | Happy + failure path | P1 |
| Auth bypass test | Semua protected routes | P1 |
| E2E: Register → Create project → Export | Full happy path | P2 |
| E2E: Topup → AI Chat | Payment → AI flow | P2 |

---

## 18. QUALITY GATES

Sebelum deploy ke production:

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run build` succeeds
- [ ] AI provider key configured + tested
- [ ] Payment gateway wired + tested
- [ ] Spend cap enforced
- [ ] Rate limit message visible to user
- [ ] Mobile navigation works
- [ ] No `console.log` atau debug code
- [ ] No hardcoded secrets
- [ ] UU PDP consent (minimal) in place
- [ ] Analytics tracking (minimal) in place
