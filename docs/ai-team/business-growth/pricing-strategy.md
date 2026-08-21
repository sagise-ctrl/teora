# Pricing Strategy — Teora

## Pricing Philosophy

Pricing must balance three forces:
1. **Accessible to Indonesian students** — price-sensitive market
2. **Sustainable for Teora** — must cover AI costs + operations
3. **Differentiating** — pricing communicates value

## Market Benchmarks

| Competitor | Student Price | In USD | In IDR (estimate) |
|-----------|--------------|--------|-------------------|
| Jenni AI | $12/mo | $12 | ~Rp 190K |
| Wordtune | $7/mo | $7 | ~Rp 110K |
| Scite | $20/mo | $20 | ~Rp 320K |
| Grammarly Edu | Institutional | N/A | N/A |

**Indonesian context:**
- Minimum wage Indonesia: ~Rp 4-5 juta/bulan
- Student allowance: typically Rp 1-3 juta/bulan dari ortu
- $5/mo = ~Rp 80K/mo = feasible untuk pelajar
- $12/mo = ~Rp 190K/mo = borderline mahal

## Pricing Tier Options

### Option A: Student-First (Recommended)

Designed for B2C Indonesian student market.

| Tier | Price | Tokens | Value |
|------|-------|--------|-------|
| **Free** | Rp 0 | 1,000/month | Entry — coba tanpa risiko |
| **Lite** | Rp 29,000/mo | 10,000/month | Light user — 1-2 tugas/bulan |
| **Academic** | Rp 59,000/mo | 50,000/month | Typical student — skripsi full |
| **Pro** | Rp 99,000/mo | 150,000/month | Heavy user — multiple projects |

**Notes:**
- Annual billing: 2 months free (Rp 290K vs Rp 348K)
- Student discount (30%): Rp 41,300/mo Academic via .edu email
- Pay-per-use: Rp 2,000 per 1,000 tokens

**Pros:**
- Affordable untuk pelajar Indonesia
- Tier naming "Lite/Academic/Pro" resonates dengan audience
- Annual discount incentivizes retention

**Cons:**
- Margin sangat thin — Rp 59K/mo vs cost AI ~Rp 8K/mo = 7.4x markup
- Need high volume untuk sustainable revenue

---

### Option B: Institutional (B2B)

Designed for university licensing.

| Tier | Price | Seats | Features |
|------|-------|-------|----------|
| **Basic Institution** | Rp 500,000/mo | 50 users | Core features |
| **Standard Institution** | Rp 1,500,000/mo | 200 users | Full features + admin dashboard |
| **Enterprise** | Custom | Unlimited | Custom integrations, SLA, support |

**Notes:**
- Average Indonesian university: 5,000-50,000 students
- Pricing comparable to Grammarly Edu model
- Need sales team untuk institutional deals

**Pros:**
- High LTV (lifetime value) per institution
- Predictable recurring revenue
- Institution handles payment, not individual students

**Cons:**
- Long sales cycle (weeks to months)
- Need dedicated sales/marketing untuk institusi
- Competitor Grammarly sudah established di institusi

---

### Option C: Hybrid (B2C + B2B)

B2C as user acquisition funnel, B2B as revenue engine.

| Channel | Target | Price | Acquisition |
|---------|--------|-------|-------------|
| **B2C (students)** | Individual | Rp 29-99K/mo | Self-serve, online marketing |
| **B2C (educators)** | Individual pengajar | Rp 59-99K/mo | Same as above |
| **B2B (universitas)** | Institution | Rp 500K-2M/mo | Sales outreach, partnership |

**Notes:**
- Students yang puas refer ke dosen → institutional upsell
- Educators yang puas refer ke institusi
- Viral loop: "bagi ke teman sekelas" = organic acquisition

**Pros:**
- Diversified revenue
- Lower CAC via word-of-mouth

**Cons:**
- Complex to manage
- Need both B2C marketing AND B2B sales

---

## AI Cost Analysis

Using Budget tier model (GPT-4o-mini):

| Action | Est. Cost | At Rp 59K/mo (50K tokens) |
|--------|-----------|--------------------------|
| 1x Analyze | Rp 0.40 | 147,500 actions |
| 1x Generate outline | Rp 0.43 | 137,000 actions |
| 1x Chapter (1,000 words) | Rp 1.23 | 48,000 actions |
| 1x Chat response | Rp 0.22 | 268,000 actions |
| 1x Bibliography | Rp 0.25 | 236,000 actions |

**Full thesis estimate:** 1 analyze + 1 outline + 5 chapters + 20 chats + 1 export = ~Rp 18 = 3,270x markup ✅

**Margin healthy even at Rp 29K Lite tier** (10K tokens).

---

## Recommendation

**Option C (Hybrid) is strategically strongest**, but **Option A (Student-First) is easiest to start.**

| Phase | Recommended | Why |
|-------|------------|-----|
| MVP / Launch | **Option A** | Fastest time-to-market, self-serve, low ops |
| Post-launch (3-6 mo) | **Option B** pilot | Start approaching 1-2 universities |
| Growth phase | **Option C** | Both channels, referral loop |

---

## Owner Decision Needed

1. **Which pricing option?** A, B, or C?
2. **Initial pricing tier?** Rp 29K, Rp 49K, atau Rp 59K untuk Academic?
3. **Payment integration?** DANA/OVO/GoPay needed at launch?
4. **Annual discount?** 2 months free (standard) or more aggressive?

---

## Last Updated

2026-08-21
