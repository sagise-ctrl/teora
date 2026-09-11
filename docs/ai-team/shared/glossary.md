# Glossary

Terms and concepts specific to the Teora project.

---

## AI Context

Konteks atau memori AI tentang project yang sedang dikerjakan. AI Context memungkinkan model AI memahami latar belakang project (topik, judul, outline, referensi yang sudah ada) sehingga respons yang dihasilkan lebih relevan dan koheren. Dibangun via `buildSystemPrompt()` di backend dan disimpan/dikelola per project.

---

## Project

Workspace akademik yang menjadi unit utama Teora. Satu project berisi:
- Dokumen dan chapter
- Referensi pustaka
- Chat dengan AI
- Aktivitas/timeline
- Metadata
- Job (analyze, write, export)

Setiap project memiliki owner (user) dan bisa memiliki collaborator.

---

## Document

Dokumen atau makalah yang sedang ditulis dalam sebuah project. Dokumen memiliki:
- Judul dan konten (text/markdown)
- Outline (struktur chapter)
- Status (draft, reviewing, completed)
- Relasi ke project parent

---

## Reference

Referensi pustaka yang digunakan dalam project. Bisa berupa:
- Buku
- Jurnal akademik
- Paper / conference proceedings
- Website
- Dokumen lainnya

Setiap reference memiliki metadata: judul, penulis, tahun, DOI/URL, tipe (journal, book, conference, website, other), dan abstrak.

---

## Attachment

File lampiran yang diupload ke project atau dokumen. examples: PDF referensi, gambar, dataset. File disimpan dan bisa di-link ke dokumen atau referensi tertentu.

---

## Job

Background job untuk operasi AI yang耗时 (long-running). Contoh job types:
- `analyze` -- menganalisis instruksi/dokumen
- `write` -- generate atau menulis konten dokumen
- `export` -- export dokumen ke PDF/DOCX

Job memiliki status: `pending`, `running`, `completed`, `failed`. Frontend memonitor job via polling atau TanStack Query refetch.

---

## Activity

Log aktivitas dalam sebuah project. Setiap aktivitas mencatat:
- User yang melakukan
- Tipe aktivitas (created, updated, deleted, status_changed, dll.)
- Resource yang affected (document, reference, dll.)
- Timestamp

Activity log menyediakan timeline aktivitas project yang bisa ditampilkan ke user.

---

## Export

Hasil export dokumen project. User bisa export dokumen ke berbagai format (PDF, DOCX, Markdown, dll.). Export record menyimpan metadata: format, status, download URL, dan timestamp.

---

## Referral

Sistem referral untuk marketing. User bisa mengundang orang lain; jika orang tersebut mendaftar dan memenuhi kondisi, referrer mendapatkan reward. Referral events dicatat untuk tracking.

---

## Chat Message

Pesan dalam chat AI di project workspace. Setiap project memiliki thread percakapan dengan AI. Messages memiliki role: `user` atau `assistant`. AI context dari project digunakan untuk menghasilkan respons yang relevant.

---

## MSW (Mock Service Worker)

Mock Service Worker. Library untuk intercepting HTTP requests di browser menggunakan Service Worker. Di Teora, MSW digunakan untuk mock API calls selama frontend development, memungkinkan development tanpa backend server yang berjalan.

Setup: `pnpm exec msw init public/ --save` untuk generate worker file di `public/`.

---

## Orval

Code generator yang menghasilkan TanStack Query hooks dan Zod schemas dari OpenAPI spec. Di Teora:
- Input: `lib/api-spec/openapi.yaml`
- Output: `lib/api-zod/src/generated/` (Zod schemas) + `lib/api-client-react/src/generated/` (hooks)

Orval dijalankan via `pnpm --filter @workspace/api-spec run codegen`.

---

## Code Generation Pipeline

Pipeline yang mengubah OpenAPI spec menjadi typed code:

```
lib/api-spec/openapi.yaml
         |
         v (pnpm --filter @workspace/api-spec run codegen)
         |
         +---> lib/api-zod/src/generated/ (Zod schemas)
         |           TypeScript type safety for runtime validation
         |
         +---> lib/api-client-react/src/generated/ (TanStack Query hooks)
                     React hooks for data fetching in components
```

Setiap perubahan pada OpenAPI spec harus menjalankan codegen sebelum code compilable.

---

## Saldo

Saldo is Teora's prepaid credit system — a virtual IDR balance that users top up to pay for AI requests when their subscription quota is exhausted. Unlike subscription (which is periodic/monthly), saldo is pay-as-you-go. Balance is stored in IDR cents (`balanceCents` in `user_balances` table). Can be used alone or as autofallback on top of subscription.

**Related:** [Autofallback](#autofallback), [Subscription Quota](#subscription-quota)

---

## Autofallback

Autofallback is a hybrid billing mode where a user's AI request first attempts to use their subscription quota window. If the subscription window is exhausted, the system automatically deducts from their [Saldo](#saldo) balance instead of blocking the request.

- Controlled by `autofallbackEnabled` boolean (default: `true` — owner decision 2026-09-11)
- Enabled per user in `user_balances.autofallbackEnabled`
- When enabled: seamless experience — user never hits a dead-end after quota exhaust
- When disabled: user must explicitly top up or wait for next window reset
- Minimum saldo deduction per request: Rp0 (no floor)

**Related:** [Saldo](#saldo), [Subscription Quota](#subscription-quota)

---

## Subscription Quota

Periodic AI allocation granted to subscribers. Each subscription tier (Standard/Pro/Premium) provides a monthly window of tokens — some quota pools are model-specific (Haiku 4.5-only, Sonnet 5-only) and some are mixed. Quota is consumed per AI request via `consumeQuotaForAIRequest()` and tracked per `usage_window` period.

- Schema: `subscription_windows` table with `tokensUsed`, `tokensLimit`, `modelType`, `windowType`
- Exposed in response as `{ method: "subscription" | "saldo", saldoUsedCents?: number }`
- When exhausted, [Autofallback](#autofallback) kicks in if enabled

**Related:** [Autofallback](#autofallback), [Tier](#tier), [usageWindow](#usagewindow)

---

## Tier

Pricing tier that defines AI model access, quota amounts, and price for a subscription period. Teora uses 3 tiers (Haiku 4.5 + Sonnet 5 model lineup per `ai_tiers` table):

| Tier | Model | Use Case |
|------|-------|----------|
| Standard | Haiku 4.5 | Formatting, grammar, simple lookup |
| Pro | Sonnet 5 | Analysis, synthesis, complex reasoning |
| Premium | Sonnet 5 (larger quota) | High-volume research |

Each tier has `pricePer1MInputCents` and `pricePer1MOutputCents` for saldo-per-token billing, plus fixed quota pools per `usageWindow`.

**Related:** [usageWindow](#usagewindow), [modelType](#modeltype)

---

## modelType

Classification of which AI model a quota window applies to. Defined in `ai_tiers` table as `modelType`:

- `"haiku"` — Haiku 4.5 (fast, cheap, good for formatting/grammar/simple tasks)
- `"sonnet"` — Sonnet 5 (slower, expensive, good for analysis/synthesis/writing)
- `"mixed"` — pool can be used with either model type

Quota windows with `"haiku"` modelType consume only from Haiku quota; `"sonnet"` from Sonnet quota; `"mixed"` pools can be split across both.

**Related:** [Tier](#tier), [Subscription Quota](#subscription-quota)

---

## windowType

Defines the reset period for a subscription quota window. Defined in `subscription_windows` table as `windowType`:

- `"weekly"` — 7-day rolling window
- `"monthly"` — 30-day rolling window
- `"unlimited"` — no expiry

Each subscription tier may have multiple windows (e.g., 75K Haiku tokens per 7 days + 20K Sonnet tokens per 7 days).

**Related:** [Tier](#tier), [Subscription Quota](#subscription-quota)

---

## usageWindow

The active quota window for a given user + tier + model combination. Tracked in `subscription_windows` table with fields: `windowStart`, `windowEnd`, `tokensUsed`, `tokensLimit`, `modelType`, `windowType`. The system checks `consumeQuotaForAIRequest()` against the current active window (or creates a new one if none exists and within billing period).

**Related:** [Subscription Quota](#subscription-quota), [windowType](#windowtype)
