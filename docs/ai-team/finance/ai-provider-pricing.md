# AI Provider Pricing Reference

> Source of truth untuk harga provider AI. Owner input harga provider di dashboard. AI team kalkulasi margin dan update sistem.

**Last updated:** 2026-09-13
**Reviewed by:** AI Engineering Team
**Status:** ⚠️ OBSOLETE — per DECISION 017 (2026-09-09), hanya Haiku 4.5 + Sonnet 5 yang aktif. Groq dan OpenAI sudah dihapus.

---

> **Note:** File ini adalah snapshot lama yang belum diupdate. Pricing aktual ada di sistem (`ai_tiers` table di database). Update file ini setelah pricing final ditentukan owner.

---

## Provider Pricing (Source of Truth — Owner Input)

Owner menginput harga provider di dashboard admin. Sistem membaca dari tabel `ai_tiers` di database.

### Anthropic (ACTIVE — DECISION 017)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Haiku 4.5 | $0.00/1M | $0.00/1M | **Gratis tier** — aktif per DECISION 017 |
| Sonnet 5 | $0.00/1M | $0.00/1M | **Premium tier** — aktif per DECISION 017 |

> ⚠️ Harga $0.00/1M adalah pricing awal. Owner perlu update dengan harga aktual per 1K tokens dari dashboard Anthropic.

**API:** Anthropic API (OpenAI-compatible endpoint)
**Format:** OpenAI-compatible
**Data Privacy:** Tidak dipakai untuk training

**Status:** ✅ ACTIVE — satu-satunya provider AI yang digunakan
**Owner Cost:** Tergantung usage. Untuk estimasi, cek dashboard Anthropic.

---

## Tier Definitions (Per DECISION 017)

| Tier | Model | Cost to Owner | Target User |
|------|-------|---------------|-------------|
| **Gratis** | Haiku 4.5 | Per usage | User coba-coba |
| **Premium** | Sonnet 5 | Per usage | Kualitas akademik max |

> ⚠️ Tier "Standar" dan "Ultra" sudah dihapus per DECISION 017.

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

Example (Premium tier — Sonnet 5):
- Provider cost: sesuai pricing aktual
- Op cost: $0.05/1M
- Total cost: (provider + $0.05)/1M
- Sell price: Total cost × 1.20
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

---

## Owner Dashboard Fields

Admin dashboard perlu fields berikut untuk setiap tier:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tierKey` | string | Yes | Unique key: "free", "premium" |
| `name` | string | Yes | Display name: "Gratis", "Premium" |
| `provider` | string | Yes | "anthropic" |
| `model` | string | Yes | Model ID: "haiku-4.5", "sonnet-5" |
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
| 2026-09-13 | Major cleanup — remove Groq + OpenAI, keep only Haiku 4.5 + Sonnet 5 (DECISION 017) | AI Engineering Team |
