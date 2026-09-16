# Olagon — Owner-Only AI Provider

> **DECISION 020** (Owner 2026-09-15)
> **Status:** Phase 1 backend COMPLETE | Phase 2 frontend PENDING
> **Owner:** AI Engineering Team

---

## 1. Overview

**Apa itu Olagon?**

Olagon Gateway (`gateway.olagon.site`) adalah third-party AI gateway yang menyediakan akses ke model Anthropic (Opus) dengan subscription terpisah dari Teora. Owner punya subscription Olagon — ingin pakai untuk:

1. **Owner testing** — uji fitur AI di web Teora secara langsung tanpa topup saldo
2. **AI team maintenance** — bot/agent yang maintain Teora pakai Olagon supaya tidak double-billing (future scope)

**Olagon BUKAN untuk user umum.** Olagon hanya bisa diakses owner.

---

## 2. Architecture

### 2.1 How It Works

```
Production user → haiku-4.5 / sonnet-5 (Anthropic native, charged)
Owner          → opus-4-8-olagon / opus-4-6-olagon (Olagon gateway, NOT charged)
```

| Component | Configuration |
|-----------|--------------|
| Gateway URL | `https://gateway.olagon.site/anthropic` |
| Protocol | Anthropic-compatible (same API format) |
| Auth | Bearer token via `OLAGON_API_KEY` env var |
| Owner email gate | `OWNER_EMAIL = sagiseainun@gmail.com` (DECISION 014) |

### 2.2 Tier Structure

| Tier ID | Model | base_url | is_owner_only | pricePer1M |
|---------|-------|----------|---------------|------------|
| `haiku-4.5` (existing) | claude-haiku-4-5-20251001 | `https://api.anthropic.com` | ❌ | >0 |
| `sonnet-5` (existing) | claude-sonnet-5-20251001 | `https://api.anthropic.com` | ❌ | >0 |
| `opus-4-8-olagon` (NEW) | claude-opus-4-8 | `https://gateway.olagon.site/anthropic` | ✅ | 0 |
| `opus-4-6-olagon` (NEW) | claude-opus-4-6 | `https://gateway.olagon.site/anthropic` | ✅ | 0 |

**Pricing:** Olagon tiers `pricePer1M* = 0` (no charge — owner-only). `providerCostPer1M*` mirror harga resmi Anthropic untuk FinOps visibility.

### 2.3 Auto-Cascade

```
Request ke Olagon tier
  → opus-4-8-olagon (default)
      → Quota habis?
          → YA: auto-cascade ke opus-4-6-olagon
          → TIDAK: gunakan opus-4-8-olagon
      → opus-4-6-olagon
          → Quota habis?
              → YA: HTTP 402 (OLAGON_QUOTA_EXHAUSTED)
              → TIDAK: gunakan opus-4-6-olagon
```

Quota pattern: **5h cap + 7d cap** (rolling window, sama dengan subscription Teora per Section 10.1).

**Cascade trigger:** HTTP 429 atau 529 dari Olagon gateway.

---

## 3. Implementation

### 3.1 Backend Files

| File | Purpose |
|------|---------|
| `lib/db/src/schema/ai_tiers.ts` | `isOwnerOnly` field di AI tier config |
| `lib/db/src/schema/user_preferences.ts` | `aiProvider` preference per user |
| `artifacts/api-server/src/lib/ai.ts` | `getTierConfig`, `isOlagonTier`, `callAnthropicWithOlagonCascade`, `resolveOlagonTierOrFallback` |
| `artifacts/api-server/src/routes/preferences.ts` | `GET/PATCH /api/users/me/preferences` |
| `artifacts/api-server/src/routes/messages.ts` | Uses `resolveOlagonTierOrFallback` untuk AI requests |
| `artifacts/api-server/src/middlewares/owner.ts` | `isOwnerEmail()` — single source of truth |

### 3.2 Key Functions

```typescript
// Cek apakah tier owner-only
getTierConfig(tierId, userEmail): AITierConfig | null
// → Returns null kalau tier.isOwnerOnly && !isOwnerEmail(userEmail)

// Semua tier aktif (non-owner tidak lihat Olagon tiers)
getAllActiveTiers(userEmail?): AITierConfig[]
// → Filter: !t.isOwnerOnly || isOwnerEmail(userEmail)

// Pilih tier dengan Olagon preference
resolveOlagonTierOrFallback(userId, preferredTierId?, userEmail?): AITierConfig | null
// → Kalau aiProvider='olagon' && !preferredTierId → return opus-4-8-olagon

// Cek apakah tier adalah Olagon (oleh baseUrl)
isOlagonTier(tier): boolean
// → return tier.baseUrl.includes("olagon.site")

// Cascade wrapper
callAnthropicWithOlagonCascade(messages, tier, mode, userEmail): AIResponse
// → On 429/529: retry dengan fallback tier → terminal: throw OLAGON_QUOTA_EXHAUSTED
```

### 3.3 Preferences API

```
GET  /api/users/me/preferences  → { aiProvider: "anthropic" | "olagon" }
PATCH /api/users/me/preferences → { aiProvider: "anthropic" | "olagon" }
```

**Authorization:**
- `aiProvider='anthropic'` — semua user boleh
- `aiProvider='olagon'` — hanya owner (email === OWNER_EMAIL), 403 kalau non-owner

### 3.4 Database

**`ai_tiers`** — tambahan kolom:

```sql
is_owner_only BOOLEAN NOT NULL DEFAULT FALSE
```

**`user_preferences`** — tabel baru:

```sql
CREATE TABLE user_preferences (
  user_id      TEXT PRIMARY KEY,
  ai_provider  TEXT NOT NULL DEFAULT 'anthropic',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Security

| Concern | Mitigation |
|---------|-----------|
| Non-owner akses Olagon | `isOwnerOnly` check di `getTierConfig` + 403 di PATCH preferences |
| Olagon token bocor | `OLAGON_API_KEY` hanya di env var, tidak di-repo |
| Owner email salah | `isOwnerEmail()` dari `middlewares/owner.js` — single source of truth |
| Cascade bocor | Cascade forward `userEmail` ke fallback tier (supaya owner-only check juga pass) |
| Token usage tidak terlihat | `ai_usage_log` tetap ditulis dengan token count + cost nominal |

---

## 5. Phase Status

### Phase 1: Backend ✅ COMPLETE

- [x] DB migration: `is_owner_only`, `user_preferences`, seed Olagon tiers
- [x] Drizzle schema update
- [x] `lib/ai.ts` helpers + owner-only check
- [x] `routes/preferences.ts` (GET + PATCH)
- [x] Unit tests (`olagon.test.ts`)
- [x] Typecheck + build pass
- [ ] **Owner manual:** set `OLAGON_API_KEY` di Vercel Dashboard

### Phase 2: Frontend UI ✅ COMPLETE

- [x] AI Provider toggle di `/akun` (Anthropic vs Olagon) — owner-only render
- [x] Wire ke `/api/users/me/preferences`
- [x] `/ai-tiers` endpoint filter — Olagon tiers hidden dari non-owner
- [x] Admin panel `/admin/ai-tiers` tetap show semua tier (owner-only endpoint)
- [x] Typecheck + build pass

### Phase 3: AI Maintenance Agent ⏸️ FUTURE

Diskusi terpisah. Olagon tiers ready untuk agent integration nanti.

---

## 6. Owner Action Required

**Setup Olagon di Vercel:**

1. Buka Vercel Dashboard → project `teora-backend`
2. Environment Variables → Add:
   - Name: `OLAGON_API_KEY`
   - Value: `[Olagon token dari dashboard Olagon]`
   - Environments: Production + Preview + Development
3. Redeploy production

**Verify setup:**

```
curl -X POST https://teora.vercel.app/api/messages \
  -H "Authorization: Bearer <owner_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "...", "content": "test"}'
```

Kalau dapat HTTP 200 dengan response dari model Opus → Olagon aktif.

---

## 7. References

- **DECISION 020** — `.ai/decisions.md` entry
- **Backup discussion** — `.ai-backup-step-D-post-20260915/discussions/2026-09-15-olagon-as-owner-provider.md`
- **DECISION 014** — `OWNER_EMAIL = sagiseainun@gmail.com`
- **Section 12.3** `pricing-strategy-2026-anthropic.md` — autofallback cascade pattern
- **Section 10.1** `pricing-strategy-2026-anthropic.md` — subscription quota 5h/7d

---

## 8. Revision History

| Date | Change | By |
|------|--------|-----|
| 2026-09-16 | Initial documentation (Phase 1 complete) | AI Engineering |
