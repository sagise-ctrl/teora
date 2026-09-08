# Referral Program — Payment-Based Discussion

> Discussion: Owner + AI Team
> Date: 2026-09-08
> Status: OPEN — pending owner decisions on amounts

## Core Model (Owner-Proposed)

```
 REFEREE (pakai kode referral)
   └─ Bayar (subscription ATAU topup)
        └─ Payment BERHASIL (Stripe webhook)
             ├─ Referee: cashback ke saldo topup
             └─ Referrer: fee (token/credit)
```

**Mengapa payment-based lebih baik dari "first project completed":**
- Payment = value nyata (money in)
- Fake account abuse tidak dapat reward
- Aligned dengan business objective Teora

---

## 1. Referee Benefit — Cashback

### Mechanics

| Item | Detail |
|------|--------|
| Trigger | Payment berhasil (subscription ATAU topup) |
| Destination | Saldo topup (IDR) |
| Timing | Saat Stripe webhook `payment_intent.succeeded` |

### Decision Points

| # | Question | Options |
|---|----------|---------|
| 1 | Amount | Flat Rp X / Percentage X% / Hybrid (percentage capped) |
| 2 | Limit | Only first payment / Every payment |
| 3 | Withdrawal | Can withdraw cashback? (affects cost to Teora) |

### Analysis

**Amount options:**

| Option | Amount | Notes |
|--------|--------|-------|
| A | Flat Rp 5,000 | Simple, predictable |
| B | Flat Rp 10,000 | More compelling incentive |
| C | 10% of payment | Scales with purchase value |
| D | 10%, capped at Rp 5,000 | Hybrid: fair + capped |
| E | 10%, capped at Rp 10,000 | More generous |

**Limit options:**

| Option | Benefit | Risk |
|--------|---------|------|
| First payment only | Acquisition-focused, controlled cost | Teora covers cost once |
| Every payment | Repeating incentive, sticky | Unlimited cost exposure |

**AI Team Recommendation:**

```
Option: 10% cashback, capped at Rp 5,000, first payment only

Reasoning:
- 10% = compelling discount (common industry standard)
- Cap Rp 5,000 = controls Teora's cost
  - Topup minimum Rp 10,000 → cashback Rp 1,000
  - Starter Rp 29,000 → cashback Rp 2,900
  - Standar Rp 59,000 → cashback Rp 5,000 (cap)
  - Premium Rp 99,000 → cashback Rp 5,000 (cap)
- First payment only = acquisition cost, not ongoing subsidy
- Cost to Teora per referral: Rp 0-5,000 (subsidized by payment itself)
```

**Critical note on withdrawal:**

| Type | Teora Cost | Complexity |
|------|-----------|-----------|
| Platform credit only (for AI services) | Minimal (~token equivalent cost) | Low |
| Withdrawable cash | Full cash amount | High — needs tax, KYC, accounting |

**Recommendation: Platform credit only (for MVP)**
- Cashback masuk saldo topup tapi hanya bisa dipakai untuk AI services
- Tidak bisa di-withdraw
- Sederhana, tidak ada compliance issue
- Bisa ditambahkan opsi withdrawable di masa depan

---

## 2. Referrer Benefit — Fee

### Mechanics

| Item | Detail |
|------|--------|
| Trigger | Payment referred user berhasil |
| Benefit type | Tokens / IDR credit / Platform credit |
| Timing | Same as referee — payment success |

### Decision Points

| # | Question | Options |
|---|----------|---------|
| 1 | Amount | Flat X tokens / Percentage of referee's payment / Hybrid |
| 2 | Limit | Only first payment / Every payment |
| 3 | Type | Tokens (for AI) / Credit (for subscription) / Cash equivalent |

### Analysis

**Amount options:**

| Option | Amount | Notes |
|--------|--------|-------|
| A | Flat 500 tokens | ~$0.75, simple |
| B | Flat 1,000 tokens | ~$1.50, more motivating |
| C | 10% of referee's payment (in tokens) | Scales, but complex |
| D | Fixed Rp 5,000 (as tokens) | ~500 tokens, aligns with referee cashback |

**AI Team Recommendation:**

```
Option: 500 tokens, first payment only

Reasoning:
- Matches the "Give 500, Get 500" in existing mockup
- ~$0.75 cost per referral (token cost at Budget tier)
- First payment only = acquisition incentive
- Tokens lebih murah dari IDR cash equivalent
- Tidak perlu konversi USD/IDR/IDR
```

### Alternative: Recurring (Every Payment)

Jika ingin referrer mendapat reward setiap kali referred user bayar:
- Bisa % dari payment (misal 5% dari subscription)
- Tapi: infinite potential payout, perlu cap

**Recommendation: First payment only untuk MVP**
- Simpler to implement and audit
- Acquisition-focused program
- Bisa diekspansi ke recurring di fase growth

---

## 3. Economics — Cost to Teora

### Scenario: Referee buys Standar (Rp 59,000/month)

| Item | Amount | Notes |
|------|--------|-------|
| Gross payment | Rp 59,000 | |
| Stripe fee | -Rp 1,911 | 2.9% + Rp 200 |
| Net revenue | Rp 57,089 | |
| Referee cashback (10%, cap Rp 5,000) | -Rp 5,000 | Platform credit only |
| Referrer reward (500 tokens) | -~Rp 375 | At Budget tier cost ($0.375/1K) |
| **Net to Teora** | **Rp 51,714** | |
| Without referral | Rp 57,089 | |
| **Referral cost ratio** | **~9.4%** | Reasonable for acquisition |

### Scenario: Referee topup minimum (Rp 10,000)

| Item | Amount | Notes |
|------|--------|-------|
| Gross payment | Rp 10,000 | |
| Stripe fee | -Rp 490 | 2.9% + Rp 200 |
| Net revenue | Rp 9,510 | |
| Referee cashback (10%) | -Rp 1,000 | Platform credit only |
| Referrer reward (500 tokens) | -~Rp 375 | |
| **Net to Teora** | **Rp 8,135** | |
| Without referral | Rp 9,510 | |
| **Referral cost ratio** | **~14.4%** | Higher ratio for small payments |

### Observation

Referral cost ratio lebih tinggi di topup kecil. Ini masih acceptable untuk acquisition (customer acquisition cost), tapi owner perlu aware.

---

## 4. Handling Payment Failures & Cancellations

| Scenario | Referee cashback | Referrer reward |
|----------|-----------------|-----------------|
| Payment fails / refund | No cashback | No fee |
| Subscription cancelled | Cashback stays (platform credit) | Fee stays (already credited) |
| Referee requests refund (within 7 days) | Clawback? | Clawback? |

**Recommendation:**
- Referee cashback: tidak di-clawback jika sudah digunakan untuk AI services
- Referrer reward: tidak di-clawback (sudah diberikan saat payment success)
- Owner review clause: jika ada fraud, manual review

---

## 5. Outstanding Questions

| # | Question | Owner Decision |
|---|----------|---------------|
| 1 | Referee cashback: flat, percentage, hybrid? | PENDING |
| 2 | Referee cashback cap? (if percentage) | PENDING |
| 3 | Referrer reward: how many tokens? | PENDING |
| 4 | First payment only, atau setiap payment? | PENDING |
| 5 | Cashback withdrawable atau platform credit only? | ✅ **Credit only — tidak ada withdraw** (owner 2026-09-08) |
| 6 | Subscription renewal: qualifies for referral reward? | PENDING |

---

## 6. Proposed Spec (for Reference)

### Recommended Configuration (AI Team)

```
REFERRAL_PROGRAM = {
  referee: {
    benefit: "cashback_platform_credit",
    trigger: "first_payment_success",
    calculation: "min(payment_amount * 0.10, 5000)",  // 10%, capped at Rp 5,000
    currency: "IDR",
    withdrawable: false,
  },
  referrer: {
    benefit: "tokens",
    trigger: "first_payment_success",
    amount: 500,  // tokens
    withdrawable: false,
  },
  exclusions: {
    refund_window_days: 0,  // no clawback
    fraud_review_required_above: null,  // manual review threshold (TBD)
  }
}
```

### Cost Summary (Recommended Config)

| Payment | Referee Cashback | Referrer Tokens | Teora Cost |
|---------|-----------------|-----------------|------------|
| Topup Rp 10,000 | Rp 1,000 | 500 tokens | ~Rp 1,375 |
| Starter Rp 29,000 | Rp 2,900 | 500 tokens | ~Rp 3,275 |
| Standar Rp 59,000 | Rp 5,000 | 500 tokens | ~Rp 5,375 |
| Premium Rp 99,000 | Rp 5,000 | 500 tokens | ~Rp 5,375 |

---

## 7. Next Steps

1. Owner decide: amounts (Section 5)
2. AI team implement backend trigger (Stripe webhook → credit logic)
3. AI team update frontend `/referral` page
4. AI team add `referral_events` logging for all payment transitions
5. Test with staging transactions
6. Monitor referral conversion rate post-launch
