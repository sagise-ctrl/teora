# Token Economy - Teora

## Overview

Teora menggunakan sistem token-based billing. Pengguna membeli paket langganan atau token yang dihitung berdasarkan penggunaan AI (input tokens + output tokens).

## Aliran Token

```
Owner (Teora)
  └─ Membeli AI Credits dari Provider (OpenAI-compatible API)
       └─ Biaya per 1K tokens: sesuai provider pricing (e.g., $0.01-0.10 per 1K tokens)
       
Subscriber (Pengguna)
  └─ Membeli Paket Langganan dari Teora
       └─ Mendapat X tokens per bulan
       └─ Menggunakan tokens untuk AI features
       
Prinsip: Harga jual LEBIH TINGGI dari harga beli
Margin = Harga jual - Harga beli - biaya operasional
Margin harus selalu POSITIF
```

## AI Token Cost Structure

### Provider Costs (Harga Beli)

Provider: Anthropic (OpenAI-compatible API) — per DECISION 017 (2026-09-09)

Biaya dihitung per 1,000 tokens:

| Model Tier | Model | Input Cost/1K | Output Cost/1K | Average/1K |
|-----------|-------|---------------|----------------|------------|
| Gratis | Haiku 4.5 | $0.00 | $0.00 | $0.00 |
| Premium | Sonnet 5 | $0.00 | $0.00 | $0.00 |

> ⚠️ Harga aktual per 1K tokens lihat `ai-provider-pricing.md`. Table ini留着 untuk cost modeling reference.

**Cost formula per AI request:**
```
cost = (input_tokens / 1000) * input_cost + (output_tokens / 1000) * output_cost
```

**Average tokens per feature:**

| Feature | Est. Input Tokens | Est. Output Tokens | Est. Total |
|---------|-------------------|--------------------|------------|
| Analyze instructions | 500 | 800 | 1,300 |
| Generate outline | 800 | 600 | 1,400 |
| Write chapter (1,000 words) | 1,500 | 2,500 | 4,000 |
| Chat response | 400 | 300 | 700 |
| Bibliography generation | 300 | 500 | 800 |
| Export document | 200 | 200 | 400 |

> ⚠️ Cost estimation per feature tergantung provider pricing aktual — lihat `ai-provider-pricing.md` untuk Haiku 4.5 + Sonnet 5 cost per 1K tokens.

**Average tokens per project (estimate):**
```
1x Analyze + 1x Outline + 5x Chapter + 10x Chat + 1x Export
= 1,300 + 1,400 + 20,000 + 7,000 + 400
= 30,100 tokens per project
```
> Cost actual tergantung provider pricing per 1K tokens — lihat `ai-provider-pricing.md`.

## Token Package (Harga Jual ke Subscriber)

### Struktur Perhitungan Margin

```
Harga Jual (per 1K tokens) > Harga Beli (per 1K tokens) + Operational Cost (per 1K tokens)

Operational costs per 1K tokens:
- Server compute (estimated): $0.01
- Storage (estimated): $0.005
- Bandwidth (estimated): $0.005
- Payment processing fee (estimated): $0.03 (Stripe 2.9% + $0.30 per transaction)
Total operational: ~$0.05 per 1K tokens

Minimum margin: 30% of selling price
```

### Initial Pricing Tiers (Belum Final — Perlu Test)

| Tier | Nama | Tokens/Bulan | Harga/Bulan | Est. Cost/1K | Margin/1K | Margin % |
|------|------|--------------|-------------|----------|-----------|---------|
| Free | Starter | 1,000 | $0 | ~$0.00 | ~$0.00 | — Free tier disubsidi |
| Basic | Lite | 10,000 | $9.99 | ~$0.00 | ~$0.00 | — Periksa pricing aktual |
| Pro | Academic | 50,000 | $29.99 | ~$0.00 | ~$0.00 | — Periksa pricing aktual |
| Team | Research | 200,000 | $79.99 | ~$0.00 | ~$0.00 | — Periksa pricing aktual |
| Pay-per-use | Pay As You Go | 1,000 | $1.50 | ~$0.00 | ~$0.00 | — Periksa pricing aktual |

> ⚠️ Semua kolom "Cost/1K" dan "Margin" perlu diupdate dengan pricing aktual dari `ai-provider-pricing.md` (Haiku 4.5 + Sonnet 5).

**Catatan Penting:**
- Tier "Team" (200K tokens) memiliki margin sangat tipis (6.25%) — hati-hati dengan overuse
- Tier "Pro" (50K) adalah sweet spot dengan margin 37.5%
- Free tier DISUBSIDI oleh owner — biaya hosting server masih ditanggung owner
- Semua harga dalam USD, bisa disesuaikan per mata uang lokal

## Token Tracking

Tokens di-track per user:

```
User table additions needed:
- subscription_tier: enum (free, basic, pro, team, pay_as_you_go)
- subscription_status: enum (active, cancelled, expired, trial)
- tokens_balance: integer (remaining tokens this billing period)
- tokens_used: integer (total tokens used this billing period)
- subscription_start_date: timestamp
- subscription_end_date: timestamp
- stripe_customer_id: string (payment provider)
- stripe_subscription_id: string

Project table additions needed:
- tokens_consumed: integer (total tokens used for this project)
```

## Token Consumption Tracking per Feature

Setiap AI request HARUS di-track:

```
AI request log table (jobs table already exists — extend):
- tokens_used: integer
- tokens_breakdown: JSON { input_tokens, output_tokens, model_used }
- cost_calculated: decimal (calculated cost in USD cents)
- tokens_deducted_from: FK to user
```

## Recharge & Top-up

Pay-per-use users dapat membeli token tambahan:
- Minimum purchase: 1,000 tokens
- Price: sesuai tier "Pay As You Go" ($1.50 per 1K)
- Tokens tidak expire selama subscription aktif
- Tokens reset saat renewal (untuk paket bulanan)

## Billing Cycle

| Tipe | Cycle | Tokens Reset |
|------|-------|-------------|
| Free | Perpetual | 1,000 tokens/month |
| Monthly | Monthly | Ya, reset setiap 30 hari |
| Pay-per-use | Perpetual | Tidak reset |

## Key Decisions

1. **Token-based (bukan feature-based)** — lebih fleksibel untuk user
2. **Monthly subscription + pay-per-use** — recurring revenue + one-time purchase
3. **Disubsidi free tier** — user baru bisa coba sebelum subscribe
4. **Minimum margin 30%** — prioritas bisnis, bukan sekadar covering cost

## Unknown / To Be Determined

- Exact provider pricing (tergantung AI_PROVIDER config, perlu dicek actual cost)
- Stripe integration cost (2.9% + $0.30 flat per transaction)
- Refund policy
- Currency conversion untuk non-USD markets
- Overdraft handling (user melebihi quota — block atau charge extra?)
- Referral reward amount (ditentukan product owner)
