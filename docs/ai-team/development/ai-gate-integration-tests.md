# AI Gate Integration Tests — Gap #5

> **Status:** ✅ COMPLETE — 10 tests passing
> **Created:** 2026-09-11
> **Owner approval:** "setup sekarang dan buatkan file dokumentasu untuk test ini selalu lakukan simpan progres setiap langkahnya ya, biar tidak hilang"
> **File:** `artifacts/api-server/src/test/ai-gate.test.ts`

---

## Tujuan

Mengunci behavior AI gate yang sudah dikonfirmasi owner (2026-09-09/11) agar **tidak bisa berubah tanpa detection** saat refactor di masa depan. Behavior kunci yang dilindungi:

1. **Subscription path dulu** — User dengan paket aktif HAK priorotas di atas saldo.
2. **Autofallback ke saldo** — Kalau subscription exhausted ATAU out-of-package, otomatis pakai saldo (kalau autofallback enabled).
3. **Saldo free-for-all** — Saldo BISA dipakai model APAPUN, tidak terikat paket subscription (Owner 2026-09-11 koreksi).
4. **autofallback default ON** — Default baru `autofallback_enabled = true` (dari DB schema `user_balances.ts` line 54).
5. **Out-of-package pakai saldo** — Paket "lama" request Sonnet → bukan error/denied, tapi jatuh ke saldo (intentional, bukan leak).

Tanpa tests ini, setiap refactor ke `src/lib/subscription.ts` bisa diam-diam mengubah behavior tanpa ketahuan sampai user complain.

---

## 3 Fungsi yang Di-cover

| Fungsi | File | Tanggung Jawab |
|--------|------|----------------|
| `checkAIAccess(params)` | `lib/subscription.ts:587` | Dry-run: cek apakah user boleh pakai AI (subscription ATAU saldo+autofallback). TIDAK apply deduction. |
| `consumeQuotaForAIRequest(params)` | `lib/subscription.ts:648` | Apply deduction real: subscription quota ATAU saldo. Mapping tierId → modelType di sini. |
| `checkQuotaAndAccumulate(params)` | `lib/subscription.ts:271` | Quota enforcement per modelType. Dipanggil internal oleh `consumeQuotaForAIRequest` setelah subscription path ditemukan. |

**Tests fokus pada 2 fungsi publik** (`checkAIAccess` + `consumeQuotaForAIRequest`). `checkQuotaAndAccumulate` di-test secara tidak langsung lewat behavior yang muncul di `consumeQuotaForAIRequest`.

---

## 10 Test Cases

### Group A: `checkAIAccess` (dry-run, 4 tests)

| # | Skenario | Expected | Coverage |
|---|----------|----------|----------|
| T1 | Subscribe Lama + Haiku | `allowed: true, method: subscription` | Subscription path masuk |
| T2 | No sub + autofallback ON + saldo cukup | `allowed: true, method: saldo` | Saldo path (no subscription) |
| T3 | No sub + autofallback ON + saldo 0 | `allowed: false, reason: saldo_insufficient` | Deny karena saldo kurang |
| T4 | No sub + autofallback OFF + saldo cukup | `allowed: false, reason: quota_exhausted` | Deny karena autofallback safety net off |

### Group B: `consumeQuotaForAIRequest` (real deduction, 6 tests)

| # | Skenario | Expected | Coverage |
|---|----------|----------|----------|
| T5 | Subscribe Lama + Haiku | `allowed: true, method: subscription`, NO saldo deduction | Subscription path, balance utuh |
| T6 | Subscribe Lama + Sonnet + saldo cukup | `allowed: true, method: saldo`, balance 10000→9800 | **Out-of-package behavior** |
| T7 | Subscribe Baru + Haiku + saldo cukup | `allowed: true, method: saldo` | **Saldo free-for-all** (Haiku via paket "baru" → saldo) |
| T8 | Subscribe Baru + Sonnet | `allowed: true, method: subscription` | Sonnet covered by paket "baru" |
| T9 | Subscribe Lama + Sonnet + saldo 0 | `allowed: false, reason: saldo_insufficient` | Out-of-package + saldo habis |
| T10 | autofallback OFF + no sub + saldo cukup | `allowed: false, reason: quota_exhausted` | Saldo tidak dipakai tanpa autofallback |

---

## Cara Menjalankan

```bash
# Dari root monorepo:
cd artifacts/api-server
pnpm test src/test/ai-gate.test.ts

# Atau test file spesifik:
pnpm vitest run src/test/ai-gate.test.ts

# Watch mode (auto re-run on file change):
pnpm test:watch src/test/ai-gate.test.ts
```

**Expected output:** `Tests 10 passed (10)` + `Test Files 1 passed (1)`.

Untuk verifikasi full suite (termasuk pre-existing tests):
```bash
pnpm test
# Expected: 149 tests, 138 passed, 11 pre-existing failures (auth/integration/citation — TIDAK terkait AI gate)
```

---

## Bagaimana Test Bekerja (untuk non-programmer)

Test ini **tidak connect ke database beneran**. Pakai **mock** (tiruan) yang mensimulasikan respons database. Itu artinya:

- ✅ Bisa jalan offline (tidak butuh internet)
- ✅ Tidak affect data production
- ✅ Cepat (10 tests selesai dalam <100ms)
- ✅ Tidak butuh API key Anthropic atau Supabase credentials
- ✅ Bisa dijalankan berkali-kali tanpa side effect

Cara kerjanya seperti **tukang tes quality control** yang punya **boneka percakapan**:

1. **Set skenario** — `setScenario({ activeSubscription: ..., usageWindow: ... })` = "boneka database saya prepare dengan data ini"
2. **Panggil fungsi real** — `consumeQuotaForAIRequest(...)` = "jalankan logika beneran"
3. **Cek hasilnya** — `expect(result.method).toBe("saldo")` = "apakah hasilnya sesuai yang kita mau?"
4. **Verifikasi side effect** — `expect(getBalanceUpdates().length).toBeGreaterThan(0)` = "apakah saldo beneran dipotong?"

---

## Mock Pattern yang Dipakai

Pattern ini reusable untuk test lain yang involve Drizzle ORM chain.

### Symbol-keyed Table Identification

```typescript
vi.mock("@workspace/db", () => ({
  db: hoisted.DB_MOCK,
  subscriptionsTable: { [Symbol.for("drizzle:tableName")]: "subscriptions" },
  packagesTable: { [Symbol.for("drizzle:tableName")]: "subscription_packages" },
  // ...
}));
```

`Symbol.for("drizzle:tableName")` adalah cara Drizzle identify tabel secara global. Mock dispatch query berdasarkan tabel mana yang sedang di-`.from()`.

### Join vs Flat Query Dispatch

```typescript
innerJoin: {
  value: vi.fn().mockImplementation(function (this: typeof chain) {
    _joined = true; // Flag: subsequent .where() returns join shape
    return this;
  }),
},
```

Drizzle return shape berbeda untuk query dengan `.innerJoin()` vs tanpa. Mock harus dispatch based on flag ini, otherwise test gagal diam-diam.

### State Tracking

Mock track semua writes (`balanceUpdates`, `transactions`, `usageWindowUpdates`) agar test bisa verify side effects.

---

## Lessons Learned (untuk engineer berikutnya)

1. **`windowEndAt` harus far-future** — `getActiveUsageWindow()` cek `isAfter(now, windowEndAt)` dan mark exhausted kalau true. Pakai `2030-01-01` atau lebih agar tidak depend on real-time Date.now().
2. **Package quota caps harus match modelType** — Paket "lama" → `quota5hSonnetTokens = 0`, paket "baru" → `quota5hHaikuTokens = 0`. Kalau pakai caps yang sama untuk semua modelType, test "out-of-package" akan false-positive (lewat sebagai subscription).
3. **Drizzle mock perlu 2-shape dispatch** — Tanpa tracking `_joined` flag, mock selalu return flat shape dan `getUserActiveSubscription` akan return `subscription: undefined` (silent failure).

---

## Future Test Ideas (backlog)

1. **`expireOldWindows()`** — Test window rollover logic (window 1 expired → create window 2).
2. **`resetAutofallback()`** — Test autofallback toggle (off → on, then on → off).
3. **Quota pool caps** — Test 5h window exhausted → fall through to 7d window.
4. **`getUsageWindowSummary()`** — Test summary computation across multiple windows.
5. **Tier price integration** — Test that actual costCents computation matches ai_tiers.providerCost.

---

## Referensi

- **Source code:** `artifacts/api-server/src/lib/subscription.ts`
- **Test file:** `artifacts/api-server/src/test/ai-gate.test.ts`
- **Schema:** `lib/db/src/schema/subscriptions.ts`, `user_balances.ts`, `usage_windows.ts`, `token_transactions.ts`
- **Pricing strategy:** `docs/ai-team/finance/pricing-strategy-2026-anthropic.md` (Section 10.9, Section 12)
- **Decision log:** `.ai/decisions.md` (DECISION 014, 016)
- **Pattern reference:** `artifacts/api-server/src/test/routes.integration.test.ts` (similar mock pattern for HTTP routes)
