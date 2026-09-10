# Teora — INITIAL PROJECT AUDIT
> Date: 2026-09-05 | Auditor: Claude Code (opus-4-6)
> Scope: Full monorepo — product, UX, AI architecture, competitive, business model
> Constraint: "Pahami dulu, jangan langsung setup. Simpan dulu temuan ke dokumentasi file audit yang relevan."

---

## EXECUTIVE SUMMARY

| Area | Status |
|------|--------|
| Product positioning | ✅ Hero jelas, 5 fitur di landing, tapi 24 route lain TIDAK dipromokan |
| Competitive gap | ⚠️ Posisi "Jenni AI untuk Indonesia" belum dikunci — positioning options A/B/C/D belum dipilih owner |
| Feature completeness | ⚠️ 9 fitur di requirements.md, 5 di landing, 29 route di App.tsx — banyak MISSING BETWEEN |
| UX/IA | 🔴 Navigation overload: 7 item + 5 sub-item Akun; tidak ada mobile sidebar; tidak ada onboarding |
| AI architecture | ⚠️ System prompt bagus (6 mode), tapi tidak ada grounding, tidak ada citation validation |
| Security | ✅ Auth + JWT + RBAC + rate limiting; perlu audit UU PDP compliance |
| Payment model | 🔴 Token economy SUDAH ada (balance, deduct, usage log), tapi MIDTRANS BELUM di-wiring |
| Engineering gaps | ⚠️ 24 code issues dari audit.md + 7 orphan files + banyak acceptance criteria belum di-test |

**High-level verdict:** Teora adalah proyek yang IMPRESIF untuk 1 developer — banyak fitur bekerja. Tapi ada gap signifikan antara feature count dan product readiness untuk launch publik. 3 hal kritis: (1) positioning BELUM dikunci, (2) mobile UX HANCUR (tidak ada sidebar), (3) payment BELUM terhubung.

---

## 1. PRODUCT POSITIONING AUDIT

### Current Landing (yang live)

Hero: "Asisten Akademik untuk Belajar, Memahami, Menguasai"
Sub: "Teora membantu Anda memahami tugas akademik dari awal sampai akhir — bukan hasil jadi, tapi pemahaman yang Anda kuasai sendiri."
CTA: "Mulai Gratis" + "Daftar Sekarang"

**5 fitur di landing:**
1. Task Mentor — "kerjakan selangkah demi selangkah, dengan AI yang menjelaskan dasar materinya"
2. Practice — "quiz dengan sistem pengulangan yang membantu Anda mengingat"
3. Pustaka Saya — "kelola pustaka referensi dengan Auto-Cite"
4. AI Assistant — "tanya tentang tugas — AI bantu Anda memahami, bukan sekadar menjawab"
5. Export — "hasilkan dokumen siap submit"

### Gap: Landing ≠ App

| Route | Ada di App.tsx | Ada di Landing? |
|-------|---------------|----------------|
| `/dashboard` | ✅ | ❌ |
| `/projects` (Daftar Task) | ✅ | ❌ |
| `/projects/new` | ✅ | ❌ |
| `/finops` (FinOps) | ✅ | ❌ |
| `/referral` | ✅ | ❌ |
| `/ai-pricing` | ✅ | ❌ |
| `/topup` | ✅ | ❌ |
| `/practice` | ✅ | ❌ |
| `/assessment` | ✅ | ❌ |
| `/usage` (Penggunaan) | ✅ | ❌ |
| `/profile` | ✅ | ❌ |
| `/bantuan` (Help) | ✅ | ❌ |
| `/admin/*` (7 routes) | ✅ | ❌ |
| `/shared/:token` | ✅ | ❌ |

**24 route ada di aplikasi tapi TIDAK dipromokan di landing page.** User yang baru register atau landing visitor tidak tahu fitur apa saja yang tersedia.

### Positioning Decision: BELUM DIAMBIL

Dari `docs/ai-team/business-growth/positioning.md` (tanggal 2026-08-21):

| Option | Tagline | Status |
|--------|---------|--------|
| A: AI Academic Workspace for Indonesia | "Bikin skripsi smarter" | Pending owner choice |
| B: AI Writing Tutor, Not Just a Writer | "Belajar menulis" | Pending owner choice |
| C: AI Partner for Every Academic Journey | "Dari tugas pertama sampai skripsi terakhir" | Pending owner choice |
| D: AI Citation & Reference Intelligence | "Sitasi benar, skripsi kuat" | Pending owner choice |

**Semua 4 options BELUM dipilih owner (dokumen tanggal 2026-08-21).**

Hero saat ini paling dekat dengan **Option B** ("AI bantu Anda memahami, bukan sekadar menjawab"), tapi landing footer tidak ada pricing, tidak ada social proof, tidak ada testimonials.

### Landing Page SEO/Discovery Gaps

- Tidak ada meta description yang di-custom per page
- Tidak ada OG image
- Tidak ada sitemap.xml
- robots.txt? (belum dicek)
- Landing adalah route pertama yang dilihat search engine — tapi tidak di-optimize untuk keyword "AI akademik Indonesia"

---

## 2. FEATURE AUDIT

### 9 Fitur dari `requirements.md` vs Implementasi

| # | Fitur di Requirements | Status di Codebase | Acceptance Criteria? |
|---|----------------------|-------------------|-------------------|
| 1 | Project Management | ✅ Implemented (projects table, CRUD, status) | ❌ AC tidak ada di test |
| 2 | Document Generation (AI) | ⚠️ Write/analyze ada, outline generation perlu dicek | ❌ |
| 3 | Reference Management | ⚠️ Add/validate/bibliography ada, DOI lookup perlu dicek | ❌ |
| 4 | AI Chat | ✅ 6 mode (generate/revise/reflect/socratic/quiz/summary) | ❌ |
| 5 | Attachment Management | 🔴 Route register di App.tsx, tidak ada handler di backend? | ❌ |
| 6 | Activity Timeline | ✅ activities table + logActivity | ❌ |
| 7 | Export | ⚠️ DOCX + PDF + PPTX ada, background job perlu dicek | ❌ |
| 8 | Auth + User Management | ✅ Supabase JWT + local profile | ❌ Email verification flow tidak ada |
| 9 | Referral System | ⚠️ CRUD ada, reward mechanics perlu dicek | ❌ |

### Fitur TAMBAHAN yang tidak ada di requirements

| Fitur | Lokasi | Notes |
|-------|--------|-------|
| Practice / Learning Activities | `/practice` | MVP ada, SRS/FSRS belum |
| Assessment (Quiz) | `/assessment` | Quiz generation + rubric |
| AI Pricing page | `/ai-pricing` | 4 tier, token billing |
| Topup | `/topup` | UI ada, Midtrans belum wired |
| FinOps | `/finops` | Apakah ini user-facing atau internal? |
| Admin Dashboard | `/admin/*` (7 routes) | User management, finops, AI tiers, health |
| Help/FAQ | `/bantuan` | 7 FAQ items, Indonesian |
| Monitoring status | `/status` | Health check page |

### KERANGKA SEMENTARA: "Feature Inventory vs Requirements"

```
Requirements.md (9 fitur):
[✅] Project Management
[⚠️] Document Generation — outline generation perlu verifikasi
[⚠️] Reference Management — DOI lookup perlu verifikasi
[✅] AI Chat — 6 mode
[🔴] Attachment Management — route tanpa handler?
[✅] Activity Timeline
[⚠️] Export — PPTX ada, background job perlu dicek
[⚠️] Auth — email verification flow missing
[⚠️] Referral — CRUD ada, reward mechanics perlu dicek

TAMBAHAN (tidak ada di requirements):
[✅] Practice/Learning Activities — MVP, SRS/FSRS belum
[✅] Assessment — quiz + rubric
[✅] AI Pricing + Token Economy — billing skeleton
[⚠️] Topup — UI ada, Midtrans belum wired
[?] FinOps — unclear purpose
[✅] Admin Dashboard — 7 sub-pages
[✅] Help/FAQ
[✅] Monitoring/Status page
```

### MISSING FEATURES (di requirements tapi belum ada atau tidak lengkap)

1. **Email verification** — Auth route ada `/auth/confirm`, tapi apakah email benar-benar dikirim dan diverifikasi?
2. **Attachment upload** — Route `/projects/:id/attachments` ada di App.tsx? (tidak ada di App.tsx yang saya baca — perlu verifikasi)
3. **Background job queue** — jobs table ada, tapi job processing (queue, retry, timeout) bagaimana?
4. **Document versioning** — document_versions table ada, tapi frontend Apakah ada UI untuk history?
5. **Project sharing** — `/shared/:token` ada, tapi apakah collaboration (multi-user editing) ada?
6. **Typing indicator** — requirements.md sebut "typing indicator" — ada di frontend?
7. **AI job status polling** — ada di jobs table, perlu dicek UX

---

## 3. UX/UI AUDIT

### CRITICAL: Mobile Navigation

Dari `layout.tsx`:
- Mobile header: hanya logo + hamburger button
- Tidak ada mobile sidebar atau drawer navigation
- 7 main nav items + 5 sub-items di Akun = SEMUA tidak bisa diakses di mobile

**Ini adalah gap kritis untuk mahasiswa Indonesia yang banyak mengakses via mobile.**

### Navigation Overload

Sidebar layout.tsx punya 7 main nav items:
1. Dashboard
2. Task Mentor (collapsible)
3. Assessment
4. Practice
5. Pustaka Saya
6. Akun (collapsible, 5 sub-items)
7. ??? (tunggu, ada 7 tapi saya hanya hitung 6 — perlu verifikasi count aktual)

Dari landing page: hanya 5 fitur yang dipromokan. Tapi navigation punya 7+ item. **Cognitive overload risk** untuk user baru.

### Empty States

Perlu dicek per page:
- `/dashboard` — user baru tanpa project: apa yang ditampilkan?
- `/projects` — user tanpa project: "belum ada task"?
- `/pustaka-saya` — user tanpa referensi: empty state?
- `/practice` — user tanpa aktivitas: empty state?

### Loading States

- Skeleton components ada untuk beberapa page (usage, ai-pricing)
- Apakah semua page punya skeleton atau loading indicator?
- Apa yang terjadi saat API error di level page?

### Empty/Loading/Error States — Checklist

| Page | Empty State | Loading State | Error State |
|------|-----------|--------------|-------------|
| Dashboard | ? | ? | ? |
| Task Mentor / Projects | ? | ? | ? |
| Practice | ? | ? | ? |
| Assessment | ? | ? | ? |
| Pustaka Saya | ? | ? | ? |
| Akun sub-pages | ? | ? | ? |

### Onboarding

Tidak ada onboarding flow. User register → langsung ke dashboard. User baru tidak tahu harus mulai dari mana.

**Kebutuhan onboarding minimal:**
1. "Buat project pertama Anda" tutorial
2. Sample/demo project untuk explore
3. Tooltip tour untuk navigation

---

## 4. AI ARCHITECTURE AUDIT

### System Prompt Analysis

Dari `lib/ai.ts` — `buildSystemPrompt()` (line 354-436):

**BAIK:**
- 6 mode yang jelas: generate, revise, reflect, socratic, quiz, summary
- Bahasa Indonesia instructed
- Fictitious reference prevention: "JANGAN membuat referensi fiktif"
- Security instruction: tidak leak credentials
- Project context injection: title, subject, task type, outline, latest document

**GAP — Tidak Ada:**
1. **Grounding mechanism** — tidak ada instruksi untuk validasi fakta atau grounding terhadap referensi yang ada di project
2. **Citation enforcement** — prompt bilang "utamakan referensi Indonesia" tapi tidak ada mekaniks untuk memastikan AI hanya menggunakan referensi yang SUDAH ADA di database
3. **Hallucination mitigation** — hanya pernyataan "jangan membuat referensi fiktif", tidak ada:
   - Confidence scoring
   - Uncertainty flagging ("saya tidak yakin tentang X")
   - Self-correction loop
4. **Citation format enforcement** — AI output harus menggunakan format sitasi tertentu (APA/MLA/etc.), tapi tidak ada instruksi enforcement
5. **Length/tone constraints** — tidak ada max output length, tidak ada tone calibration per user preference
6. **No retrieval augmentation** — system prompt mengirim KONTEKS project, tapi tidak ada RAG (Retrieval Augmented Generation) — AI tidak mencari di referensi project, hanya disuplai latestDocument (3000 char max)

### AI Rate Limiting UX

- Backend punya rate limiting (aiLimiter di middleware)
- Frontend: **tidak ada user-facing message** saat rate limit tercapai
- User tidak tahu apakah mereka kena limit, limit apa, atau kapan bisa coba lagi

### AI Tier Fallback

Dari `lib/ai.ts`:
```typescript
if (!apiKey) {
  logger.warn({ tierId, envVar: tier.apiKeyEnvVar }, "AI API key not set — returning placeholder");
  return { content: `AI belum dikonfigurasi...`, ... };
}
```

**Jika API key tidak diset, user melihat pesan error placeholder, bukan graceful fallback.** Tidak ada AI provider redundancy.

### AI Cost Transparency

- Token usage displayed di `/usage` page ✅
- Tapi tidak ada estimasi SEBELUM user kirim pesan: "pesanan ini预计 menggunakan ~500 tokens (~$0.002)"
- User tidak bisa做出知情决策 tanpa before-the-fact cost estimate

---

## 5. COMPETITIVE ANALYSIS

### Posisi Teora vs Competitors

| Competitor | Kelebihan | Kekurangan | Gap Teora |
|-----------|----------|-----------|-----------|
| Jenni.ai | Established, lifetime access, good UI | English only, $15+/month, Western format | Bahasa Indonesia, lokal format |
| ChatGPT | Versatile, free tier | Tidak ada project context, tidak ada citation | Project-aware AI |
| NotebookLM | Good research, audio summaries | English, no writing | Academic writing focus |
| Khan Academy | Free, trusted brand | K-12 focus, not for thesis | College/academic level |
| Quizlet | Flashcards, widely used | Not AI-powered writing | AI + writing + references |
| Ruangguru | Bahasa Indonesia, established | K-12/parent focus, not AI writing | AI-first academic workspace |

### Unique Value Proposition Saat Ini

"AI Academic Workspace yang memahami format akademik Indonesia" — tapi:
1. Citation format management — fitur ini ada di codebase (Auto-Cite, bibliography generation) tapi apakah user-facing dan bisa dipercaya?
2. Project context awareness — AI chat mengingat outline, referensi, instruksi. Ini BEDA dari ChatGPT.
3. Bahasa Indonesia — kompetitor utama (Jenni) English only.

### Yang Membuat Teora Beda (yang SUDAH di-build tapi tidak di-communicated)

- Reference database per project
- Multi-format citation (APA, MLA, Chicago, ICMJE, dll.)
- AI chat dengan project context
- Document versioning
- Token economy (pay-per-use vs subscription)
- Practice/quiz dengan spaced repetition
- PPTX export

---

## 6. SECURITY & PRIVACY AUDIT

### Yang Sudah Ada ✅

- JWT validation via jose + Supabase JWKS
- Per-route auth middleware (authMiddleware)
- Owner-only admin routes (email whitelist)
- Rate limiting on auth endpoints
- Input validation (Zod)
- SQL injection prevention (Drizzle ORM)
- XSS prevention (React default)
- Stack trace stripping in production
- AI response sanitization (credential removal)
- AI prompt injection prevention (in system prompt)

### Yang Perlu Dicek

- **UU PDP 2022 compliance** — apakah ada consent banner? Data retention policy? Right to deletion?
- **File upload security** — apakah ada virus scanning? Max size enforcement? Malware upload prevention?
- **Project sharing security** — `/shared/:token` menggunakan random token, tapi apakah ada brute force protection?
- **Rate limit bypass** — apakah ada distributed rate limit atau hanya per-instance?
- **Admin account security** — admin whitelist hardcoded email, tidak ada MFA
- **AI output filtering** — apakah ada content moderation untuk AI-generated content?
- **API rate limit global** — hanya auth endpoints yang di-rate limit, AI endpoints per-owner?

---

## 7. DATABASE SCALABILITY AUDIT

### Schema Stats (dari audit.md)

- 17+ tables (audit.md bilang 13+, tapi feature creep mungkin menambah)
- reference_citations table ADA di DB tapi TIDAK ADA source code
- learning_activities.topics pakai `text` bukan `jsonb` — tidak bisa query JSON

### Scalability Concerns

1. **messages table** — chat messages per project. Tidak ada pagination di listMessages route? (line 26-39 messages.ts)
2. **activities table** — timeline log. Apakah ada auto-cleanup untuk old activities?
3. **ai_usage_log** — setiap request AI di-log. Apakah ada TTL atau archiving?
4. **attachments table** — file storage. Apakah ada quota per user?
5. **learning_activities.topics** — text column dengan JSON string. Query tidak bisa pakai JSON operators.

### Missing: Index Analysis

- Apakah semua foreign key punya index?
- Apakah ada composite indexes untuk common queries (misalnya: user_id + created_at)?
- Apakah ada sequential scan pada tabel besar?

---

## 8. ENGINEERING / TECHNICAL DEBT AUDIT

### Dari audit.md (sudah terdokumentasi)

| Severity | Count | Contoh |
|----------|-------|--------|
| Critical | 3 | reference_citations no source, usersTable import missing, Math.random() token |
| High | 7 | Outdated model names, no AI timeout, duplicate queries, topics text vs jsonb |
| Medium | 9 | Double JSON ops, type shadowing, stale dist, orphan files |
| Low | 5 | Outdated branding, duplicate tsconfig, package manager drift |

### Orphan Files (dari audit.md line 487-497)

| File | Action |
|------|--------|
| `_upload.js` | DELETE — old Vercel script |
| `_mcp_params.json` (2.3MB) | DELETE — MCP session data |
| `NUL` | DELETE — Windows artifact |
| `lib/api-spec/openapi.yaml.bak` | DELETE — old backup |
| `screnshoot/` (24 PNGs, ~5MB) | DELETE — debugging screenshots |
| `scripts/src/hello.ts` | DELETE — unused |

### Acceptance Criteria vs Reality

Dari `requirements.md` section "Acceptance Criteria per Feature":
- Authentication: 6 criteria — email verification CRITICAL GAP
- Projects: 5 criteria — semua perlu dicek
- Documents: 3 criteria — version history UI perlu dicek
- References: 4 criteria — DOI validation perlu dicek
- Chat: 4 criteria — typing indicator perlu dicek
- Attachments: 3 criteria — apakah backend handler ada?
- Export: 3 criteria — background job processing perlu dicek

**Tidak ada test suite yang memverifikasi acceptance criteria ini.**

---

## 9. PAYMENT / TOKEN ECONOMY AUDIT

### Yang Sudah Ada ✅

- `user_balances` table
- `ai_usage_log` table
- `aiTiersTable` dengan pricing per 1M tokens
- Deduct credit flow di backend (deductCredit)
- Usage log di backend (logAIUsage)
- Frontend: `/usage` page, `/topup` page, `/ai-pricing` page
- Low balance warning banner

### Yang Belum

- **Midtrans integration** — `/topup` page ADA, tapi apakah ada backend endpoint yang calls Midtrans API?
- **Webhook handler** — apakah ada `/api/webhooks/midtrans` route?
- **Balance topup** — apakah ada POST endpoint untuk add balance?
- **Refund policy** — tidak ada di UI
- **Spend cap** — tidak ada per-user spending limit
- **Payment receipt** — tidak ada download invoice/struk

### Token Economy Sustainability

Dari pricing page:
- Free tier: Groq llama-3.1-8b-instant (FREE)
- Standar: Groq llama-3.3-70b (Rp 100/1M tokens input)
- Premium: OpenAI gpt-4o-mini (Rp 300/1M tokens)
- Ultra: Claude 3.5 Sonnet (Rp 1.500/1M tokens)

**Margin analysis:** Provider cost vs user price perlu dihitung. Apakah margin cukup untuk sustainability?

---

## 10. COST / UNIT ECONOMICS AUDIT

### AI Cost Per Request (Estimasi)

Dari `ai.ts` MODEL_PRICING fallback:
- Groq llama-3.1-8b-instant: $0/1M (actually free)
- Groq llama-3.3-70b: $0.10 input / $0.40 output per 1M
- GPT-4o-mini: $0.15 input / $0.60 output per 1M
- Claude 3.5 Sonnet: $3.00 input / $15.00 output per 1M

**Contoh:** User chat dengan 500 tokens input + 1000 tokens output via Claude:
- Provider cost: (500/1M × $3) + (1000/1M × $15) = $0.0015 + $0.015 = $0.0165
- User charge (Rp 1.500/1M): (1500/1M × 1500) = Rp 2.25

### Missing Cost Controls

1. **Spend cap** — tidak ada max spend per day/month
2. **AI timeout** — tidak ada AbortSignal.timeout() — slow provider = hanging function = wasted cost
3. **No retry backoff** — failed requests retry immediately = double cost
4. **No usage alert** — user tidak dapat notifikasi saat spend reach threshold

---

## 11. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI hallucinates citations | High | High | Sistem prompt bilang "jangan fiktif" tapi tidak ada enforcement. User bisa submit referensi fiktif. |
| Rate limit tidak di-communicate ke user | High | Medium | Frontend tidak ada rate limit UX |
| Payment tidak jalan | High | Critical | Midtrans belum wired ke backend |
| Mobile user tidak bisa navigasi | High | High | Tidak ada mobile sidebar |
| AI provider down | Medium | High | Tidak ada fallback provider |
| Admin account compromised | Low | Critical | Email whitelist tanpa MFA |
| Data breach / PDP violation | Low | Critical | Tidak ada consent banner, tidak ada data retention policy |
| DB schema drift | Medium | Medium | reference_citations table tanpa source code |

---

## 12. MVP DEFINITION

### Minimum Viable Product (untuk public launch)

**MUST HAVE:**
1. ✅ Register + Login (Supabase JWT)
2. ✅ Landing page dengan positioning yang jelas
3. ✅ Project workspace (create + AI chat)
4. ✅ Document generation (write + export)
5. ✅ Reference management + bibliography
6. ✅ Token balance + AI usage tracking
7. ✅ Topup flow (Midtrans INTEGRATED, bukan cuma UI skeleton)
8. ✅ Mobile-responsive navigation
9. ✅ Help/FAQ
10. ✅ Bahasa Indonesia UX throughout

**SHOULD HAVE:**
11. Practice/Quiz dengan spaced repetition
12. Assessment (quiz generation)
13. Onboarding flow
14. Low balance warning banner

**NICE TO HAVE:**
15. Admin dashboard (user management)
16. Referral system dengan reward mechanics
17. Email verification flow
18. Citation validation (DOI lookup)

### Current State vs MVP

```
MVP Checklist:
[✅] Register + Login
[✅] Landing page
[⚠️] Project workspace — mostly there, needs testing
[⚠️] Document generation — write ada, outline generation perlu dicek
[⚠️] Reference management — UI ada, DOI validation perlu dicek
[✅] Token balance + AI usage
[🔴] Topup — UI ada, MIDTRANS BELUM CONNECTED
[🔴] Mobile navigation — TIDAK ADA
[✅] Help/FAQ
[✅] Bahasa Indonesia

Score: ~60% MVP ready
```

---

## 13. ROADMAP PHASES (Berdasarkan Temuan Audit)

### Phase 0: Pre-Launch Criticals (Week 1-2)
1. Kunci positioning (Option A/B/C/D)
2. Wire Midtrans ke backend (topup flow end-to-end)
3. Mobile sidebar/drawer navigation
4. Rate limit user-facing messages
5. Landing page SEO optimization

### Phase 1: Core Experience (Week 3-6)
1. Onboarding flow (3 steps)
2. Email verification flow
3. AI citation validation (ground truth references)
4. Mobile-responsive all pages
5. Empty/loading/error states for all pages

### Phase 2: Differentiation (Week 7-12)
1. Practice/Quiz dengan FSRS spaced repetition
2. Citation format enforcement
3. Assessment rubrics
4. AI cost estimation before request
5. Spend cap + usage alerts

### Phase 3: Growth (Month 4+)
1. Referral reward mechanics
2. Admin dashboard full feature
3. Institution/organization tier
4. Dosen dashboard (assignment creation)
5. Plagiarism detection integration

---

## 14. KPI METRICS

### Yang Perlu Di-track

| Metric | Target | Notes |
|--------|--------|-------|
| Registration → First Project | >30% within 7 days | Onboarding effectiveness |
| Project → First AI Chat | >50% | Engagement |
| Chat → Document Generated | >20% | Value realization |
| Topup conversion | >5% of registered users | Revenue |
| Monthly Active Users (MAU) | TBD | Growth |
| AI usage per user | Track avg tokens/month | Cost + value |
| Balance depletion rate | Track time to zero | Token economy health |
| Support ticket volume | <2% of MAU | Product quality |

### Analytics Gaps

- Tidak ada analytics integration (PostHog/Segment/Google Analytics)?
- Tidak ada funnel tracking
- Tidak ada A/B testing infrastructure

---

## 15. EXPLICITLY NOT BUILDING

Dari audit dan diskusi yang sudah ada:

| Item | Alasan |
|------|--------|
| Multiple languages (EN/ID toggle) | i18n deferred — 5 design decisions pending owner |
| Collaborative editing (real-time) | WebSockets/SSE infrastructure belum ada |
| Mobile native app | React SPA already responsive (minus sidebar) |
| Plagiarism detection (built-in) | External integration (Unicheck/Turnitin API) |
| Video/Audio content support | Out of scope untuk Phase 1 |
| API for third-party integrations | Internal use only untuk sekarang |
| White-label / custom branding | Future enterprise tier |

---

## 16. DECISION LOG (NEW)

| Decision | Status | Owner |
|----------|--------|-------|
| Positioning option (A/B/C/D) | BELUM DIPILIH | Owner |
| Mobile navigation approach | Need decision | Owner/AI |
| Midtrans vs other payment | Midtrans sudah di codebase | AI |
| Email verification requirement | Need decision | Owner |
| Free tier limits | Not defined | Owner |
| Institution/organization tier | Future | TBD |

---

## 17. DOCUMENTATION GAPS

### Docs vs Reality

| Document | Last Updated | Status |
|----------|-------------|--------|
| `project-context.md` | Unknown | Tech stack perlu update (React 19, Tailwind v4) |
| `architecture.md` | Unknown | DB count "13 tables" tapi audit bilang 17+ |
| `requirements.md` | 2026-08 | Feature creep — banyak fitur tidak ada di AC |
| `positioning.md` | 2026-08-21 | BELUM ADA keputusan |
| `business-rules.md` | ? | Perlu dicek |

### Stale/Unmaintained Docs

- `docs/ai-team/` punya 77 file markdown — banyak yang outdated atau orphan
- Tidak ada "last verified" timestamp di dokumen
- Tidak ada link checking mechanism

---

## 18. IMPLEMENTATION PRIORITY MATRIX

| | High Impact | Low Impact |
|---|---|---|
| **High Effort** | Wire Midtrans, Mobile nav, Onboarding | Email verification, Citation validation |
| **Low Effort** | Rate limit UX, Spend cap, Low balance banner | Landing SEO, Help page improvements |

---

## NEXT STEPS (Audit Phase)

1. **Owner decision needed:** Positioning option (A/B/C/D)
2. **AI team — High priority fixes:**
   - Wire Midtrans backend (topup flow)
   - Mobile drawer navigation
   - Rate limit user-facing messages
   - AI citation validation (reference grounding)
3. **Verification tasks:**
   - Test setiap acceptance criteria di requirements.md
   - Mobile UX walkthrough
   - Payment flow end-to-end test
4. **Documentation:**
   - Update project-context.md (tech stack)
   - Update architecture.md (table count)
   - Mark positioning.md dengan "OWNER ACTION REQUIRED"
