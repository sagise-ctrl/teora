# Open Discussion Topics — Tambahan Owner 2026-09-04

> **Tanggal:** 2026-09-04
> **Status:** Pending discussion — save for future reference
> **Owner input:** "tambah untuk bahan diskusi"

---

## Issue 1: Non-Owner Email Dapat Opsi Admin Dashboard

### Gejala
Saat login dengan email yang **bukan owner** (misal email biasa), user tetap melihat opsi untuk masuk ke:
- Dashboard Admin
- Dashboard User

Seharusnya: hanya user dengan email owner (sagiseainun@gmail.com) yang dapat akses admin dashboard.

### Yang Sudah Ada
- Admin whitelist check di `lib/auth.ts` atau `middleware.ts`
- Fitur admin route protection

### Yang Perlu Dicek
- Apakah whitelist check berfungsi dengan benar saat login?
- Apakah ada bypass di middleware atau route?
- Apakah UI menu Admin tetap muncul untuk non-owner?

### Status
**Bug** — perlu investigasi dan fix.

---

## Issue 2: Landing Page / Hero Section Sebelum Login

### Gejala
Saat buka URL Teora (`academic-workspace-eta.vercel.app`), langsung diarahkan ke halaman login.

Tidak ada landing page atau hero section yang menampilkan:
- Brand Teora
- Value proposition
- Screenshot/demo fitur
- CTA untuk signup/login

### Yang Seharusnya Ada
Halaman landing publik (tanpa auth) yang menampilkan:
```
┌─────────────────────────────────────────────────────┐
│  Teora: AI Academic Workspace                        │
│                                                      │
│  Bantu mahasiswa menyelesaikan tugas akademik         │
│  dengan AI yang paham konteks proyek Anda.           │
│                                                      │
│  [Mulai Gratis] [Masuk]                            │
│                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Screenshot│ │ Screenshot│ │ Screenshot│              │
│  │  Fitur 1 │ │  Fitur 2 │ │  Fitur 3 │              │
│  └─────────┘ └─────────┘ └─────────┘               │
│                                                      │
│  ─────────────────────────────────────────────     │
│  Fitur: Task Mentor · Practice · Pustaka Saya      │
└─────────────────────────────────────────────────────┘
```

### Status
**Missing feature** — landing page perlu dibangun.

### Catatan Teknis
- Landing page = public route (`/`)
- Setelah login → redirect ke `/dashboard`
- Root route `/` mungkin sudah redirect ke `/login`

---

## Issue 3: AI API Integration — Jalankan Semua Fitur AI

### Konteks
Teora punya banyak fitur AI:
- Document generation (Task Mentor)
- Quiz generation
- Rubric generation
- PPTX export
- AI Assistant chat
- Practice recommendations
- Reference search
- Citation formatting
- PDF text extraction
- OCR (masa depan)

### Tech Stack AI (yang sudah ada)
```
AI_TIERS:
├─ Gratis: Groq Llama 3.1 8B
├─ Standar: Groq Llama 3.3 70B
├─ Premium: Anthropic Claude 3.5 Sonnet
└─ Ultra: OpenAI GPT-4o
```

### Verdict: READY for use

**Schema Layer:**
- `ai_usage_log` table: full with user/project/tier, tokens, costs, request type
- `user_balances` table: balance in IDR cents, preferred tier
- `token_transactions` audit trail: deduct + topup operations

**Backend Routes (sudah ada logging + credit deduction):**
| Route | Status |
|-------|--------|
| Chat (messages.ts) | ✅ logAIUsage + deductCredit |
| Quiz (quizzes.ts) | ✅ logAIUsage + deductCredit |
| Bibliography (references.ts) | ✅ logAIUsage + deductCredit |
| Citations/Auto-Cite (references.ts) | ✅ logAIUsage + deductCredit |
| Analyze (projects.ts) | ✅ logAIUsage + deductCredit |
| Write/Generate (projects.ts) | ✅ logAIUsage + deductCredit |
| Usage stats API | ✅ GET /ai-usage, /ai-usage/stats |
| Balance API | ✅ GET /users/me/balance |
| AI Tiers | ✅ GET /ai-tiers (public) |

**Frontend:**
- `usage.tsx`: stats per period (7d/30d/all), by request type, token counts

**Gaps (minor):**
- Export routes (PPTX/DOCX/PDF): perlu dicek apakah ada AI usage logging
- Rubric generation: perlu dicek
- Writing style: perlu dicek
- No AI provider fallback (jika Groq/OpenAI down, user dapat 500)
- No user-facing rate limit message

**Status: Partial** — core pipeline lengkap, 3 route belum dicek (export, rubric, writing style).

### Konteks
Teora punya banyak fitur AI:
- Document generation (Task Mentor)
- Quiz generation
- Rubric generation
- PPTX export
- AI Assistant chat
- Practice recommendations
- Reference search
- Citation formatting
- PDF text extraction
- OCR (masa depan)

### Yang Perlu Dicek
Semua fitur AI tersebut:
1. **Sudah jalan di production?** — test setiap fitur
2. **AI provider integration?** — Groq / OpenAI / Anthropic / Gemini?
3. **Credit/token deduction?** — apakah biaya tercatat per user?
4. **Error handling?** — apa yang terjadi kalau AI API error?

### Tech Stack AI (yang sudah ada)
```
AI_TIERS:
├─ Gratis: Groq Llama 3.1 8B
├─ Standar: Groq Llama 3.3 70B
├─ Premium: Anthropic Claude 3.5 Sonnet
└─ Ultra: OpenAI GPT-4o
```

### Yang Perlu Dibangun/Dicek
- [ ] AI usage logging per user per request
- [ ] Credit deduction logic
- [ ] Fallback kalau AI provider down
- [ ] Rate limiting per tier
- [ ] Cost monitoring dashboard

### Status
**Partial** — backend AI routes sudah ada, perlu verifikasi semua fitur jalan.

---

## Issue 4: Token Limit, Sisa Token, AI Usage Management

### Konteks
User bisa pilih AI tier (Gratis/Standar/Premium/Ultra). Setiap tier punya:
- Limit token per bulan
- Rate limit per request
- Credit/saldo

### Fitur yang Dibutuhkan

#### A. User-Facing: Lihat Sisa Token
```
┌─────────────────────────────────┐
│ 💰 Saldo Anda                   │
│                                  │
│  Standar (Groq Llama 3.3 70B) │
│  ├─ Sisa: 8,500 / 10,000 tok  │
│  ├─ Expires: 30 Sep 2026       │
│  └─ [Upgrade]                  │
│                                  │
│  Gratis (Groq Llama 3.1 8B)    │
│  ├─ Unlimited (rate limited)     │
│  └─ [Upgrade]                  │
└─────────────────────────────────┘
```

#### B. Admin-Facing: Usage Per User
```
┌─────────────────────────────────────────┐
│ AI Usage Dashboard (Admin)              │
│                                          │
│ User          │ Token Used │ Credit Left │
│───────────────┼───────────┼─────────────│
│ user1@email  │  45,000  │  Rp 15,000  │
│ user2@email  │   8,500   │  Rp 85,000  │
│ user3@email  │  12,000   │  Rp 75,000  │
│                                          │
│ Total Cost This Month: Rp 175,000        │
└─────────────────────────────────────────┘
```

#### C. Real-Time Tracking
- Setiap AI request → catat input/output tokens
- Hitung cost berdasarkan `harga_per_1M * (input_tokens + output_tokens)`
- Update user balance/credit

### Schema yang Mungkin Sudah Ada
```
ai_usage_log
├─ user_id
├─ project_id
├─ request_type (quiz/generate/chat/etc)
├─ input_tokens
├─ output_tokens
├─ cost_cents
├─ tier_id
└─ created_at

user_balances
├─ user_id
├─ balance_cents
└─ updated_at
```

### Status
**Partial** — `ai_usage_log` dan `user_balances` tables sudah ada, perlu verifikasi UI dan logic lengkap.

---

## Summary — 4 Topik untuk Discussion

| # | Topik | Tipe | Prioritas |
|---|-------|------|-----------|
| 1 | Non-owner dapat opsi Admin Dashboard | Bug | High |
| 2 | Landing page sebelum login | Missing Feature | Medium |
| 3 | AI API integration verification | Audit/Verify | High |
| 4 | Token limit & usage management | Feature | High |

---

## Related

- AI Provider Pricing: `docs/ai-team/finance/ai-provider-pricing.md`
- AI Usage Log: `artifacts/api-server/src/routes/ai-usage.ts`
- User Balances: `lib/db/src/schema/user_balances.ts`
- Token Economy: `docs/ai-team/finance/token-economy.md`
