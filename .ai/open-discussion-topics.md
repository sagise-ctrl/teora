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
~~**Missing feature**~~ — **RESOLVED** ✅ Landing page sudah live di production (`academic-workspace-eta.vercel.app/iterasi-terbaru`). Hero section, brand, value proposition, dan CTA semua visible tanpa login. Commit `37df517`.

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

### Yang Sudah Ada (per DECISION 017, 2026-09-09)
- Schema: `ai_usage_log`, `user_balances`, `token_transactions` tables ✅
- Backend: `/ai-usage`, `/ai-usage/stats`, `/users/me/balance`, `/ai-tiers` ✅
- Frontend: `usage.tsx` stats per period ✅
- **AI tiers changed** (DECISION 017): Groq Llama → **Haiku 4.5** (Gratis) + **Sonnet 5** (Premium)

### Yang Perlu Dicek/Dibangun
- [ ] Export routes (PPTX/DOCX/PDF): AI usage logging
- [ ] Rubric generation: AI usage logging
- [ ] Writing style: AI usage logging
- [ ] AI provider fallback (Haiku 4.5 down → graceful error vs 500)
- [ ] User-facing rate limit message (429 response)
- [ ] Admin usage dashboard

### Status
~~**Missing feature**~~ — **PARTIAL** ✅ Schema + core backend + frontend stats live. 3 export routes perlu dicek. AI fallback + rate limit message needed.

---

## Summary — 4 Topik untuk Discussion

| # | Topik | Tipe | Prioritas | Status |
|---|-------|------|-----------|--------|
| 1 | Non-owner dapat opsi Admin Dashboard | Bug | High | Open |
| 2 | Landing page sebelum login | Missing Feature | Medium | ✅ **RESOLVED** — live in production |
| 3 | AI API integration verification | Audit/Verify | High | Partial — 3 routes perlu dicek |
| 4 | Token limit & usage management | Feature | High | ✅ **RESOLVED** — schema + backend + frontend live (DECISION 017) |

---

## Related

- AI Provider Pricing: `docs/ai-team/finance/ai-provider-pricing.md`
- AI Usage Log: `artifacts/api-server/src/routes/ai-usage.ts`
- User Balances: `lib/db/src/schema/user_balances.ts`
- Token Economy: `docs/ai-team/finance/token-economy.md`
