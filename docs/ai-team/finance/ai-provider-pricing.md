# AI Provider Pricing Reference

> Source of truth untuk harga provider AI. Owner input harga provider di dashboard. AI team kalkulasi margin dan update sistem.

**Last updated:** 2026-08-25
**Reviewed by:** AI Engineering Team

---

## Provider Pricing (Source of Truth — Owner Input)

Owner menginput harga provider di dashboard admin. Sistem membaca dari tabel `ai_tiers` di database.

### Groq (Free Tier)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Llama 3.1 8B Instant | $0 | $0 | Free tier, rate limited |
| Llama 3.3 70B Versatile | ~$0.10/1M | ~$0.40/1M | Paid tier |

**Rate Limit Free Tier:**
- 30 requests / menit
- 200.000 tokens / hari
- **Per organisasi** — semua user berbagi pool yang sama

**Status:** ✅ Recommended untuk tier Gratis
**Owner Cost:** $0 (free tier)

### Anthropic

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Claude 3.5 Sonnet | $3.00/1M | $15.00/1M | Best for academic documents |
| Claude 3.5 Haiku | $0.80/1M | $4.00/1M | Faster, cheaper |

**API:** `https://api.anthropic.com/v1/messages`
**Format:** Custom (bukan OpenAI-compatible)
**Data Privacy:** Tidak dipakai untuk training

**Status:** ✅ Recommended untuk tier Premium
**Owner Cost:** ~$3.00-15.00/1M token

### OpenAI

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| GPT-4o | $2.50/1M | $10.00/1M | General purpose |
| GPT-4o-mini | $0.15/1M | $0.60/1M | Budget option |

**API:** `https://api.openai.com/v1/chat/completions`
**Format:** OpenAI standard

**Status:** ✅ Backup tier
**Owner Cost:** ~$0.15-10.00/1M token

### Google (Future Consideration)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Gemini 1.5 Flash | $0.075/1M | $0.30/1M | Cheapest option |
| Gemini 1.5 Pro | $1.25/1M | $5.00/1M | Long context |

**Status:** ⚠️ Pertimbangkan untuk cost-sensitive tier
**Notes:** Kualitas lebih rendah untuk dokumen akademik panjang

---

## Tier Definitions

| Tier | Provider | Model | Cost to Owner | Target User |
|------|----------|-------|---------------|-------------|
| **Gratis** | Groq | Llama 3.1 8B | $0 | User coba-coba, rate limited |
| **Standar** | Groq | Llama 3.3 70B | Per usage | Revisi substantif |
| **Premium** | Anthropic | Claude 3.5 Sonnet | Per usage | Kualitas akademik max |
| **Ultra** | OpenAI | GPT-4o | Per usage | Fallback / preference |

---

## Margin Calculation

```
Harga Jual = Harga Provider + Margin + Operational Cost

Operational Cost per 1M tokens:
- Server compute: $0.01
- Bandwidth: $0.005
- Storage: $0.005
- Payment processing: $0.03
Total: $0.05/1M

Margin target: 20% minimum

Example (Premium tier):
- Provider cost: $3.00/1M input
- Op cost: $0.05/1M
- Total cost: $3.05/1M
- Sell price (input): $3.05 × 1.20 = $3.66/1M
- Sell price (output): $15.00 × 1.20 = $18.00/1M
```

---

## Maintenance Responsibilities (AI Team)

### When to Update

| Trigger | Action |
|---------|--------|
| Provider mengubah harga | Update `ai_tiers` table, notify owner |
| Provider memperkenalkan model baru | Evaluasi, recommend tier, update docs |
| Rate limit berubah | Update frontend display, notify user |
| Model deprecated | Migrate user preference, update docs |

### Provider Price Change Notification

```
1. AI team monitor billing dari provider
2. Jika ada perubahan harga:
   a. Verify di dashboard provider
   b. Update `ai_tiers.pricePer1MInput` dan `pricePer1MOutput`
   c. Recalculate margin
   d. Notify owner jika margin < 20%
   e. Update dokumentasi ini
3. Perubahan harga user: min 30 hari notice
```

### Rate Limit Monitoring

- **Groq free tier** pakai shared org limit — monitor apakah user sering kena 429
- Jika terlalu sering, pertimbangkan naikkan ke Groq paid tier atau kurangi user Gratis
- Report ke owner setiap bulan: rate limit hit rate

---

## Owner Dashboard Fields

Admin dashboard perlu fields berikut untuk setiap tier:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tierKey` | string | Yes | Unique key: "free", "standard", "premium", "ultra" |
| `name` | string | Yes | Display name: "Gratis", "Standar", "Premium" |
| `provider` | string | Yes | "groq", "anthropic", "openai" |
| `model` | string | Yes | Model ID: "llama-3.1-8b-instant" |
| `baseUrl` | string | Yes | API endpoint |
| `pricePer1MInput` | number | Yes | Harga jual per 1M input token (IDR cents) |
| `pricePer1MOutput` | number | Yes | Harga jual per 1M output token (IDR cents) |
| `rateLimitRpm` | number | No | Requests per minute |
| `rateLimitTpd` | number | No | Tokens per day |
| `isFree` | boolean | Yes | True jika $0 |
| `isActive` | boolean | Yes | Visible di UI |
| `description` | string | Yes | Deskripsi untuk user |

---

## Revision History

| Date | Change | By |
|------|--------|-----|
| 2026-08-25 | Initial document | AI Engineering Team |
