# Financial Rules - Teora

## Immutable Rules

Berikut aturan yang TIDAK BOLEH dilanggar dalam implementasi finance:

### 1. Margin Protection
```
Harga Jual per 1K tokens > Harga Beli per 1K tokens + Operational Cost per 1K tokens

Operational costs (per 1K tokens):
- Server compute: $0.01
- Bandwidth: $0.005
- Storage: $0.005
- Payment processing: $0.03
Total operational: $0.05 per 1K tokens

Margin minimum: 20% (bukan 30% seperti di perencanaan awal — disesuaikan agar kompetitif)

Verify sebelum pricing change:
  if (selling_price <= cost_per_token):
    BLOCK: "Pricing tidak boleh menyebabkan rugi"
```

### 2. No Free Token Grant Without Approval
```
Token grants (bonus, referral reward, compensation) HARUS di-approve
oleh owner sebelum di-apply ke user balance.

Reason: mencegah abuse dan memastikan margin tetap positif.
```

### 3. Stripe First
```
SEMUA pembayaran HARUS melewati Stripe.
Tidak ada direct transfer, cash, atau metode lain.

Reason: audit trail, compliance, automatic receipt.
```

### 4. Idempotency
```
Semua payment webhook HARUS idempotent.
Jika event sama diproses dua kali, efeknya harus sama dengan satu kali.

Reason: Stripe retry webhooks. Tanpa idempotency, double-charge.
```

### 5. Cost Attribution
```
Setiap AI request HARUS di-track dengan cost yang tepat.
Tidak boleh ada AI usage yang tidak di-record.

Reason: margin calculation akurat, deteksi abuse.
```

### 6. Refund Policy
```
Refund hanya diproses jika:
- User request dalam 7 hari pertama subscription
- Bukti error teknis dari sisi Teora (bukan karena user tidak suka)
- Amount sesuai kebijakan refund (full/partial)

Refund TIDAK diproses untuk:
- User yang tidak gunakan tokens
- User yang subscribe lebih dari 7 hari
- User yang gunakan lebih dari 10% tokens dari paket
```

### 7. Audit Trail
```
Semua financial transaction HARUS logged dengan:
- user_id
- timestamp
- amount (tokens + USD)
- type (purchase, usage, refund, bonus)
- payment_provider_reference (Stripe ID)
- balance_before
- balance_after

Reason: audit compliance, dispute resolution.
```

### 8. No Negative Balance
```
tokens_balance TIDAK BOLEH negatif.

Check:
  if (tokens_balance - requested > 0):
    allow_request()
  else:
    reject_request(402, "Insufficient tokens")

Edge case (overdraft dari request yang sudah berjalan):
  tokens_balance = max(0, tokens_balance - used)
```

### 9. Pricing Change Notification
```
Perubahan harga HARUS di-notify user minimal 30 hari sebelum berlaku.

Applies to:
- Tier price increase
- Token quota reduction
- New fee addition

Grace period: existing subscribers grandfathered untuk 6 bulan.
```

## Configurable Parameters (Owner-Set)

Berikut bisa diubah owner, tapi harus melalui Finance review:

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| Tier prices | $9.99-$79.99 | Owner discretion | Margin check required |
| Pay-per-use price | $1.50/1K | > $0.425/1K | Margin check |
| AI model tier | Budget | Budget/Standard/Premium | Affects cost |
| Referral reward | $5 credit | Owner discretion | < LTV |
| Refund window | 7 days | 0-30 days | Owner discretion |
| Minimum top-up | 1,000 tokens | 100-10,000 | UX consideration |

## Cost Verification (Harus Dicek Setiap Implementation)

```
1. Cost per AI request (cents):
   cost = (input_tokens / 1000) * provider_input_rate
        + (output_tokens / 1000) * provider_output_rate

2. Margin per subscription tier (per month):
   revenue = tier_price_cents
   expected_cost = avg_tokens_per_user * cost_per_token
   margin = revenue - expected_cost
   if margin < 0: BLOCK tier

3. Break-even point per tier:
   break_even_tokens = tier_price / (selling_price_per_token - cost_per_token)
   if break_even_tokens > tier_quota: warning (may run at loss)
```

## Reporting Requirements

Owner harus bisa lihat laporan:

1. **Daily token usage** — total tokens consumed per day
2. **Monthly revenue** — gross, net (after Stripe fees)
3. **Margin per tier** — actual margin vs target
4. **Churn rate** — subscribers who cancelled
5. **Top-up conversion** — free users who became paying
6. **Cost breakdown** — AI provider costs by model tier
