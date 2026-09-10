# Referral Program — Payment-Based Discussion

> Discussion: Owner + AI Team
> Date: 2026-09-08 (initial), 2026-09-09 (updated)
> Status: FINALIZED — all decisions made

---

## Ringkasan Keputusan (2026-09-09)

| # | Item | Keputusan |
|---|------|----------|
| 1 | Referee cashback | **Flat Rp 5,000** — dari subsidi owner, bukan dari revenue |
| 2 | Referee cashback scope | **Semua metode** (subscription + topup), **first payment only** (satu kali seumur hidup akun — bukan per metode) |
| 3 | Referrer reward type | **Percentage (%) dari payment amount** — bukan token |
| 4 | Referrer reward % | **3%** dari payment amount |
| 5 | Referrer reward limit | **5 transaksi pertama** referee (subscription renewal + topup) |
| 6 | Withdrawal | **Tidak ada** untuk referee cashback maupun referrer reward |
| 7 | Trigger | Payment berhasil via Stripe webhook |
| 8 | Refund policy | **Tidak ada refund otomatis.** Special case handled manual by CS. CS-refunded payment pertama: cashback tetap di saldo (no clawback) — owner subsidy keluar tanpa revenue balik |

---

## Mekanisme Final

```
 REFEREE (pakai kode referral)
   └─ First payment berhasil (subscription ATAU topup)
        └─ Referee: cashback Rp 5,000 ke saldo (dari owner subsidy)

 REFERER
   └─ Setiap payment berhasil dari referee (subscription + topup)
        └─ Payment ke-1 s/d ke-5: referrer dapat 3% × payment amount
```

**Beda dari model awal:**
- Reward referrer = **percentage**, bukan flat token
- Reward referrer berlaku untuk **5 transaksi**, bukan hanya pertama
- Subscription renewal dan topup **sama-sama qualify**

---

## 1. Referee Cashback — Flat Rp 5,000 (dari Subsidi Owner)

### Spec

| Item | Detail |
|------|--------|
| Amount | **Flat Rp 5,000** |
| Scope | **First payment only** (subscription + topup) |
| Destination | Saldo IDR (bukan withdrawable) |
| Timing | Saat Stripe webhook `payment_intent.succeeded` |
| Cost bearer | **Owner pribadi** — tidak dipotong dari revenue Teora |
| Withdrawal | Tidak ada |

### Catatan Penting

Cashback Rp 5,000 ini adalah **subsidi langsung dari owner**, bukan cost-of-goods. Ini keluar dari pocket owner per referee yang berhasil activate. Di-hitung sebagai:

- Customer Acquisition Cost (CAC)
- Marketing spend

Tidak masuk laporan revenue Teora.

### Handling Payment Failures

| Scenario | Referee Cashback |
|----------|-----------------|
| Payment fails / refund | No cashback |
| Referee cancel subscription | Cashback stays in saldo |
| Referee use saldo for AI | Already spent, no clawback |

---

## 2. Referrer Reward — 3% × Payment, 5 Transaksi

### Spec

| Item | Detail |
|------|--------|
| Amount | **3% × payment amount** |
| Scope | 5 transaksi pertama referee (subscription + topup) |
| Calculation | Per transaksi: `payment_amount × 0.03` |
| Max transactions counted | **5** (reset per referral code use) |
| Tracking | `referral_events.transaction_count` per (referrer, referee) |
| Destination | Reward balance (non-withdrawable, untuk AI usage) |
| Withdrawal | Tidak ada |

### Kalkulasi Fee Minimum Owner (untuk validasi %)

Dari Section 15 dokumen pricing (30 SKU, setelah QRIS 0.7%):

#### Langganan 15 Hari

| SKU | Price | Owner Fee (no referral) | 3% Reward | Owner Fee (dengan referral) | Margin % |
|-----|-------|----------------------|----------|---------------------------|----------|
| Starter | Rp 8,000 | Rp 2,568 | Rp 240 | **Rp 2,328** | 29.1% |
| Standar | Rp 15,000 | Rp 3,605 | Rp 450 | **Rp 3,155** | 21.0% |
| Premium | Rp 27,000 | Rp 6,459 | Rp 810 | **Rp 5,649** | 20.9% |
| Pro | Rp 45,000 | Rp 10,816 | Rp 1,350 | **Rp 9,466** | 21.0% |
| Ultra | Rp 75,000 | Rp 18,027 | Rp 2,250 | **Rp 15,777** | 21.0% |

#### Langganan 30 Hari

| SKU | Price | Owner Fee (no referral) | 3% Reward | Owner Fee (dengan referral) | Margin % |
|-----|-------|----------------------|----------|---------------------------|----------|
| Starter | Rp 13,600 | Rp 2,753 | Rp 408 | **Rp 2,345** | 17.2% |
| **Standar Campuran** | **Rp 25,500** | **Rp 1,742** | **Rp 765** | **Rp 977** | **3.8%** |
| Standar Lama | Rp 25,500 | Rp 2,282 | Rp 765 | **Rp 1,517** | 5.9% |
| Premium Campuran | Rp 45,900 | Rp 4,875 | Rp 1,377 | **Rp 3,498** | 7.6% |
| Pro Campuran | Rp 76,500 | Rp 8,227 | Rp 2,295 | **Rp 5,932** | 7.8% |
| Ultra Campuran | Rp 127,500 | Rp 13,712 | Rp 3,825 | **Rp 9,887** | 7.8% |

#### Topup (Markup 40%)

| Amount | Owner Fee (margin 27.9%) | 3% Reward | Owner Fee (dengan referral) |
|--------|--------------------------|----------|---------------------------|
| Rp 10,000 | Rp 2,787 | Rp 300 | **Rp 2,487** |
| Rp 50,000 | Rp 13,936 | Rp 1,500 | **Rp 12,436** |
| Rp 100,000 | Rp 27,871 | Rp 3,000 | **Rp 24,871** |
| Rp 200,000 | Rp 55,743 | Rp 6,000 | **Rp 49,743** |

### Constraint Terberat

**Standar Campuran 30 hari: fee owner = Rp 977 per transaksi** (paling kecil dari semua SKU).

Ini adalah **3.8% margin** — positif, owner tidak rugi.

### Safe Zone Analysis

Dari constraint Rp 977 (Standar Campuran 30d):

| % | Reward per tx | Owner fee | Status |
|---|-------------|-----------|--------|
| 1% | Rp 255 | Rp 1,487 | ✅ Aman |
| 2% | Rp 510 | Rp 1,232 | ✅ Aman |
| **3%** | **Rp 765** | **Rp 977** | ✅ **Aman — DIPILIH** |
| 4% | Rp 1,020 | Rp 722 | ✅ Aman |
| 5% | Rp 1,275 | Rp 467 | ✅ Aman |
| 6% | Rp 1,530 | Rp 212 | ✅ Aman |
| **7%** | **Rp 1,785** | **-Rp 43** | ❌ **Rugi** |

**3% = batas atas safe zone** (margin 3.8% di constraint terberat).

---

## 3. Total Referrer Reward (5 Transaksi)

### Langganan

| SKU | 1x tx (3%) | 5x tx Total | Owner Fee 5tx |
|-----|------------|------------|--------------|
| Starter 15d | Rp 240 | **Rp 1,200** | Rp 11,640 |
| Starter 30d | Rp 408 | **Rp 2,040** | Rp 11,725 |
| Standar 15d | Rp 450 | **Rp 2,250** | Rp 15,775 |
| Standar 30d | Rp 765 | **Rp 3,825** | Rp 4,885 |
| Premium 30d | Rp 1,377 | **Rp 6,885** | Rp 17,490 |
| Pro 30d | Rp 2,295 | **Rp 11,475** | Rp 29,660 |
| Ultra 30d | Rp 3,825 | **Rp 19,125** | Rp 49,435 |

### Topup

| Amount | 1x (3%) | 5x Total | Owner Fee 5tx |
|--------|----------|----------|--------------|
| Rp 10,000 | Rp 300 | **Rp 1,500** | Rp 12,435 |
| Rp 50,000 | Rp 1,500 | **Rp 7,500** | Rp 62,180 |
| Rp 100,000 | Rp 3,000 | **Rp 15,000** | Rp 124,355 |

### Motivating?

Dengan **5 transaksi**, total reward referrer:

| Scenario | Total Reward | Worth it? |
|----------|------------|----------|
| Referee aktif topup Rp 50rb × 5 | **Rp 7,500** | ✅ Menarik |
| Referee langganan Standar 30d × 5 | **Rp 3,825** | ✅ Cukup menarik |
| Referee langganan Starter 15d × 5 | **Rp 1,200** | 🟡 Kurang |
| Referee langganan Ultra 30d × 5 | **Rp 19,125** | ✅ ✅ Sangat menarik |

5 transaksi bisa berupa:
- 5x langganan (subscription renewal)
- 5x topup
- Mix langganan + topup

---

## 4. Handling Payment Failures & Cancellations

| Scenario | Referee Cashback | Referrer Reward |
|----------|-----------------|----------------|
| Payment fails / refund | No cashback (first payment belum berhasil) | No fee |
| Subscription cancelled | Cashback stays in saldo | Fee already credited stays |
| Referee use saldo for AI | Already spent | Already credited, no clawback |
| Fraud detected | Manual review | Manual review |
| **CS-initiated refund (special case)** | **Cashback stays in saldo — tidak ada clawback otomatis.** Owner subsidy keluar tanpa revenue balik. Untuk awareness finance, log manual di luar sistem. | Fee already credited stays |

---

## 5. Reward Balance — Non-Withdrawable

Referrer reward (3% × payment) masuk ke **reward balance** di akun referrer. Sifat:

| Property | Value |
|-----------|-------|
| Can use for AI services | ✅ Yes |
| Can withdraw to bank | ❌ No |
| Can convert to saldo IDR | ❌ No |
| Expires | TBD (use it or lose it — atau bisa set expiry) |
| Displayed where | `/referral` page — "Reward Balance" |

**Catatan UX:** Reward balance ini terpisah dari Saldo IDR (topup). User lihat dua angka berbeda di halaman `/referral`.

---

## 6. Konfigurasi Final

```
REFERRAL_PROGRAM = {
  referee: {
    benefit: "cashback_saldo",
    trigger: "first_payment_success",
    transaction_limit: 1,         // first payment only
    amount: 5000,              // flat Rp 5,000
    subsidy_source: "owner_personal", // dari pocket owner, bukan revenue
    withdrawable: false,
  },
  referrer: {
    benefit: "reward_balance",
    trigger: "every_payment_success",
    transaction_limit: 5,          // 5 transaksi pertama referee
    calculation: "payment_amount × 0.03",  // 3%
    withdrawable: false,
  },
  exclusions: {
    refund_window_days: 0,         // no clawback
    fraud_review_required_above: null,  // manual review threshold (TBD)
  }
}
```

---

## 7. Cost Summary (Owner's Perspective)

### Cost Per Successful Referral

> **Referee cashback = one-time (first payment only). Referrer reward = up to 5 transactions.**

| Referee Action | Owner Cashback (referee) | Referrer Reward (5tx) | Owner's Total Cost |
|----------------|------------------------|----------------------|-------------------|
| Langganan Starter 15d × 5 | **Rp 5,000** (one-time) | Rp 1,200 | **Rp 6,200** |
| Langganan Standar 30d × 5 | **Rp 5,000** (one-time) | Rp 3,825 | **Rp 8,825** |
| Langganan Premium 30d × 5 | **Rp 5,000** (one-time) | Rp 6,885 | **Rp 11,885** |
| Langganan Ultra 30d × 5 | **Rp 5,000** (one-time) | Rp 19,125 | **Rp 24,125** |
| Topup Rp 50rb × 5 | **Rp 5,000** (one-time) | Rp 7,500 | **Rp 12,500** |
| Topup Rp 100rb × 5 | **Rp 5,000** (one-time) | Rp 15,000 | **Rp 20,000** |

**Catatan:** Cashback referee Rp 5,000 × 5 transaksi = Rp 25,000. Owner subsidy di-hitung per transaksi, bukan one-time.

### Owner's Revenue Per Referral

| Scenario | Owner Fee (5 tx, dari tabel Section 2) | Gross Revenue (5 tx) | Referrer Cost | Net Revenue |
|----------|----------------------------------------|--------------------|------------|------------|
| Standar 30d × 5 | Rp 4,885 | Rp 127,500 | Rp 3,825 | **Rp 123,675** |
| Premium 30d × 5 | Rp 17,490 | Rp 229,500 | Rp 6,885 | **Rp 222,615** |
| Topup 100rb × 5 | Rp 124,355 | Rp 500,000 | Rp 15,000 | **Rp 485,000** |

### Referrer Reward to Owner's CAC Ratio

| Scenario | CAC (total owner cost) | Referrer Reward Total | % of Owner's CAC |
|----------|----------------------|---------------------|-----------------|
| Standar 30d × 5 | Rp 28,825 | Rp 3,825 | 13.3% |
| Premium 30d × 5 | Rp 31,885 | Rp 6,885 | 21.6% |
| Topup 100rb × 5 | Rp 40,000 | Rp 15,000 | 37.5% |

---

## 8. Perbandingan: Before vs After

| Aspek | Model Lama (token-based) | Model Baru (final) |
|-------|------------------------|--------------------|
| Referee benefit | N/A ( belum ada ) | Flat Rp 5,000 cashback |
| Referee cashback source | — | Owner subsidy |
| Referee scope | — | Semua metode (sub + topup) |
| Referee limit | — | 5 transaksi |
| Referrer benefit | N/A ( belum ada ) | 3% × payment |
| Referrer limit | — | 5 transaksi pertama referee |
| Reward type | — | IDR (non-withdrawable balance) |
| Withdrawal | — | Tidak ada |
| Subscription renewal qualifies | — | ✅ Ya |
| Topup qualifies | — | ✅ Ya |

---

## 9. Revision History

| Date | Change | By |
|------|--------|-----|
| 2026-09-08 | Initial: payment-based model discussion, open questions | AI Engineering |
| 2026-09-09 | Session 2: All decisions finalized — 3% × 5 tx, flat Rp 5,000 referee cashback | AI Engineering + Owner |
| 2026-09-09 | Session 3: Clarified — referee cashback first payment only (satu kali seumur hidup akun, bukan per metode). No refund policy — special case handled manual by CS, cashback stays (no clawback) | AI Engineering + Owner |

---

## 10. Next Steps

### Untuk AI Engineering

- [ ] Update `referral.tsx` frontend: reward balance display + "3% × payment" wording + "5 transaksi pertama"
- [ ] Update OpenAPI spec: `referral_events` table schema
- [ ] Implement Stripe webhook: trigger cashback + reward on `payment_intent.succeeded`
- [ ] Track transaction count per (referrer, referee) pair
- [ ] Cap referee cashback at 5 transactions (stop crediting after tx #5)
- [ ] Cap referrer reward at 5 transactions per referee

### Untuk Owner

- [ ] Set budget untuk referee cashback subsidy (Rp 5,000 × estimated referrals)
- [ ] Monitor referral conversion rate post-launch
- [ ] Decide reward balance expiry policy (use it or lose it? 12 months?)
