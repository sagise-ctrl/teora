# Admin Dashboard — Teora

> **Status:** SPEC — awaiting owner confirmation + implementation roadmap
> **Author:** AI Engineering (with owner input)
> **Date:** 2026-08-29
> **Owner email (whitelist):** `sagiseainun@gmail.com`

---

## 1. Purpose

**Admin Dashboard** adalah panel internal untuk **owner** (= admin) yang punya akses penuh ke semua data & konfigurasi Teora. Berbeda dengan **User Dashboard** yang dipakai semua user biasa.

**Bedanya dengan User Dashboard:**

| Aspek | User Dashboard | Admin Dashboard |
|-------|----------------|-----------------|
| **Siapa** | Semua user (mahasiswa/peneliti/dosen) | Hanya owner (sagiseainun@gmail.com) |
| **Tujuan** | Bikin project akademik, pakai AI, export dokumen | Monitor bisnis, manage user, config system, audit cost |
| **Data yang dilihat** | Project sendiri, balance sendiri | Semua user, semua project, semua transaksi, system health |
| **Aksi** | Bikin project, topup, pake AI | Change pricing, suspend user, manage AI tier, view CS overview, dll |
| **Payment flow** | Aktif (topup, subscribe) | **Disabled untuk owner** (test mode, lihat di bawah) |

---

## 2. Login Classification Logic

### 2.1 Flow Saat Login

```
User login (email + password atau Google OAuth)
         ↓
Backend verify JWT
         ↓
Frontend dapat user data (email, role, tier)
         ↓
┌────────────────────────────────────────────────┐
│ IF email === "sagiseainun@gmail.com"           │
│   → Redirect ke /landing-admin                  │
│   → Tampilkan 2 pilihan:                       │
│     • [Admin Dashboard]                         │
│     • [User Dashboard (Test Mode)]              │
│                                                 │
│ ELSE                                            │
│   → Redirect langsung ke / (User Dashboard)    │
└────────────────────────────────────────────────┘
```

### 2.2 Aturan Penting

| Aturan | Detail |
|--------|--------|
| **Satu akun, dua peran** | Owner login pakai akun yang sama. Tidak ada akun terpisah untuk owner. |
| **Owner email di-whitelist** | Hardcode di env var `OWNER_EMAIL` (atau config table). Backend harus baca dari server, bukan hardcode di frontend. |
| **Classification hanya muncul untuk owner** | User biasa TIDAK lihat pilihan "Admin Dashboard". Mereka langsung masuk User Dashboard. |
| **Bisa pindah peran tanpa logout** | Owner klik tombol di header/sidebar → switch mode. Refresh tidak perlu logout. |

### 2.3 Kenapa Email-based (Bukan Role-based)

Owner saat ini **tidak punya role admin formal** di database (lihat `threat-model.md` — hanya ada: anonymous, authenticated, collaborator, viewer, project owner, service role). 

**3 opsi yang dipertimbangkan:**

| Opsi | Pro | Kontra |
|------|-----|--------|
| **A. Email whitelist** (dipilih) | Simple, tidak perlu schema change, cepat | Kalau owner ganti email harus update env var |
| **B. Tambah `role` column di `users` table** | Flexible (multi-admin di masa depan) | Perlu migration, lebih banyak code path |
| **C. Hardcoded di frontend** | Paling simple | **TIDAK AMAN** — user biasa bisa bypass dengan edit frontend |

**Pilihan:** Opsi A untuk MVP. Pertimbangkan migrasi ke Opsi B saat sudah ada co-founder/admin kedua.

### 2.4 Test Mode untuk Owner (Saat Pilih "User Dashboard")

Owner boleh masuk User Dashboard untuk:
- ✅ Test alur user biasa
- ✅ Lihat UI/UX dari perspektif user
- ✅ Reproduksi bug yang dilaporkan user
- ✅ Screenshot untuk dokumentasi/marketing

**Test mode characteristics:**
- ❌ Tidak ada payment flow (tombol Topup → "disabled for owner")
- ❌ Tidak ada subscription aktif (owner selalu tier tertinggi tanpa bayar)
- ✅ Token balance unlimited — test bebas tanpa batas
- ✅ **Owner usage TETAP TERCATAT di `ai_usage_log`** — Admin Dashboard tahu "Owner: X tokens, $Y cost". Tidak ada payment, tapi cost tetap di-track untuk laporan.
- ⚠️ Semua project yang dibuat **tetap tersimpan** di database — perlu hati-hati jangan campur data real user

**Cara implement:** Backend baca `user.email === OWNER_EMAIL` → jika iya, skip payment validation, override tier ke "Ultra", **TETAP catat usage di `ai_usage_log`** dengan `userId = owner`.

---

## 3. Admin Dashboard — 7 Areas

Owner butuh lihat 7 area ini. Disusun dari yang paling kritikal (P1) ke future (P3).

### 🔴 AREA 1 — Financial Overview (P1)

**Pertanyaan owner:** "Apakah bisnis untung hari ini?"

| Sub-fitur | Deskripsi | Sumber Data |
|-----------|-----------|-------------|
| Revenue today/week/month | Total pembayaran masuk | `ai_usage_log` + Stripe (future) |
| AI cost breakdown per model | Haiku 4.5 / Sonnet 5 per request | `ai_usage_log.cost_usd` |
| Gross margin % | (Revenue - Cost) / Revenue | Calculated |
| Cost anomaly alerts | User/feature dengan lonjakan biaya | Real-time threshold |
| Tier distribution | Berapa user di Free/Lite/Pro/Team | `users.tier` |
| Pay-per-use purchases | Token bundle sales | DB |

**Compliance:**
- Immutable Rule #2 (`financial-rules.md`): owner TIDAK boleh kasih token gratis manual. Token gratis HANYA dari AI provider yang memang gratis (Haiku 4.5 per DECISION 017).
- Immutable Rule #5: setiap AI request di-track cost-nya

---

### 🔴 AREA 2 — User & Account Management (P1)

**Pertanyaan owner:** "Siapa user saya, siapa yang berisiko, siapa yang abuse?"

| Sub-fitur | Deskripsi | Status |
|-----------|-----------|--------|
| All users list (search/filter by email/tier/status) | Tabel dengan pagination | ✅ Backend ada |
| Detail per user | Project count, AI usage, referrals, login history | ✅ Aggregate |
| Manual tier upgrade/downgrade | Owner override tier (audit-logged) | ⚠️ Perlu endpoint |
| ~~Manual token grant~~ | ~~Form: pilih user, jumlah, alasan → audit log~~ | ❌ **TIDAK ADA** — token gratis HANYA dari AI provider yang memang gratis (Haiku 4.5). Owner tidak kasih token manual per DECISION 017. |
| Suspend/ban user | Untuk fraud/abuse (audit-logged) | ⚠️ Perlu endpoint |
| Referral status per user | pending/verified/qualified/rewarded | ✅ Backend ada |

---

### 🟡 AREA 3 — AI Tier & Pricing Configuration (P2)

**Pertanyaan owner:** "Tier mana yang masih layak, mana yang rugi?"

| Sub-fitur | Status |
|-----------|--------|
| Set AI provider prices (per token) | ✅ Ada di `admin-ai-tiers.tsx` |
| Enable/disable model per tier | ✅ Ada |
| Rate limit per tier | ⚠️ Config di env, belum UI |
| Circuit breaker thresholds | ⚠️ Logic ada, belum UI |
| Pricing tier preview (apa user lihat) | ✅ Ada |
| Margin simulation ("kalau harga diturun 10%") | ❌ Belum |

**Referensi:** `finance/ai-provider-pricing.md` line 11-12: "Owner menginput harga provider di dashboard admin. Sistem membaca dari tabel `ai_tiers`"

---

### 🟡 AREA 4 — System Health & Incidents (P2)

**Pertanyaan owner:** "Sistem sehat? Ada masalah?"

| Sub-fitur | Threshold (per `monitoring.md`) | Status |
|-----------|--------------------------------|--------|
| API error rate | < 0.5% normal, > 2% critical | ⚠️ Perlu real-time data |
| API latency p95 | < 200ms normal | ⚠️ Belum |
| Database connection health | - | ⚠️ Belum UI |
| Recent incidents list (P0-P3) | - | ❌ Web belum expose `.ai/incidents/` |
| Active SEV1/SEV2 banner | Red banner di top | ❌ |
| Uptime stats (24h/7d/30d) | - | ⚠️ Perlu integration Vercel |

**Referensi:** `production-operations/incident-management.md` → P0 immediate notify, P1 15 min

---

### 🟡 AREA 5 — Customer Support Overview (P2 — OWNER: perlu sekarang)

**Pertanyaan owner:** "Tim CS sehat? Masalah yang belum di-eskalate?"

| Sub-fitur | Status |
|-----------|--------|
| Ticket volume | ❌ CS belum deployed production |
| T1 resolution ratio | ❌ |
| Pending escalations (perlu owner) | ❌ |
| Top complaint categories | ❌ |
| Churn signals (user diam > X hari) | ❌ |

**Catatan:** CS Overview perlu dibangun SEKARANG (bukan setelah CS AI deployed) — owner perlu tahu volume ticket dan eskalasi meskipun sistem CS belum full automated. Minimal tampilkan placeholder + stats manual.

---

### � AREA 6 — Audit Log & Decisions (P2)

**Pertanyaan owner:** "Audit trail untuk compliance & debugging"

| Sub-fitur | Why |
|-----------|-----|
| All admin actions (who/when/what) | Compliance, debugging |
| ~~All token grants~~ | ~~Immutable rule #2~~ | ❌ **TIDAK ADA** — owner tidak kasih token manual |
| Pricing change history | Transparency |
| Tier override history | Audit |
| Login history per user | Security |

**Compliance:** `decision-rights.md` line 70-75: "All significant decisions must be documented"

---

### 🟢 AREA 7 — Reports Archive & Business Analytics (P3)

**Pertanyaan owner:** "Tren bisnis, KPI, growth"

| Sub-fitur | Status |
|-----------|--------|
| Daily/weekly/monthly report archive | ❌ Sekarang hanya di Telegram |
| North Star Metric tracker | ❌ (per `finops/data-analytics.md`) |
| Conversion funnel (free → paid) | ⚠️ |
| Project status distribution | ✅ `useGetProjectStats` |
| Feature usage stats | ✅ `ai_usage_log.byRequestType` |
| Top referral sources | ⚠️ |

---

## 4. Implementation Roadmap

### Phase 1 — Fondasi (P1, ~3-4 hari kerja)

**Tujuan:** Owner punya akses admin + bisa manage user/finance dasar.

| Task | File | Effort |
|------|------|--------|
| Backend: tambah endpoint `GET /admin/me` return role flag | `api-server/src/routes/admin.ts` (new) | S |
| Backend: tambah `OWNER_EMAIL` env var + middleware cek role | `api-server/src/middlewares/auth.ts` | S |
| Frontend: route guard untuk `/admin/*` | `academic-workspace/src/hooks/use-auth.tsx` | S |
| Frontend: `/landing-admin` page (pilih Admin atau User) | `academic-workspace/src/pages/landing-admin.tsx` (new) | M |
| Frontend: layout pisah untuk `/admin/*` | `academic-workspace/src/components/admin-layout.tsx` (new) | M |
| Database: tambah `admin_audit_log` table | `lib/db/src/schema/admin-audit-log.ts` (new) | S |
| Backend: endpoint `GET /admin/users` (list + search) | `api-server/src/routes/admin-users.ts` (new) | M |
| ~~Backend: endpoint `POST /admin/token-grant`~~ | ~~`api-server/src/routes/admin-token-grant.ts` (new)~~ | ❌ **HAPUS** — tidak ada fitur token grant |
| Frontend: Area 1 + Area 2 (consolidate dari `finops.tsx` + `admin.tsx`) | `academic-workspace/src/pages/admin/` (new dir) | L |
| OpenAPI spec update + codegen | `lib/api-spec/openapi.yaml` | S |

### Phase 2 — Config & Audit + CS Overview (P2, ~2-3 hari)

| Task | Effort |
|------|--------|
| Area 3 — lengkapi AI tier config (rate limit, circuit breaker UI) | M |
| Area 5 — CS overview (placeholder + manual stats) | M |
| Area 6 — audit log viewer | M |
| Test mode untuk owner di User Dashboard (skip payment, override tier, **track usage**) | M |

### Phase 3 — Real-time Monitoring (P2, ~3-4 hari)

| Task | Effort |
|------|--------|
| Area 4 — Vercel runtime errors API integration | L |
| Area 4 — incident list dari `.ai/incidents/` (atau tabel baru) | M |
| Area 4 — SEV1/SEV2 banner | S |

### Phase 4 — Analytics & Reports (P3, ~2-3 hari)

| Task | Effort |
|------|--------|
| Area 7 — reports archive UI | M |

---

## 5. Jawaban Owner (2026-08-29)

| Q# | Pertanyaan | Jawaban Owner | Implikasi |
|----|-----------|--------------|-----------|
| Q1 | Simpan email owner di mana? | **A — env var** | `process.env.OWNER_EMAIL` |
| Q2 | Multi-admin di masa depan? | **A — satu owner dulu** | Tidak ada `role` column untuk sekarang |
| Q3 | Test mode token cap? | **A — unlimited, tapi tercatat** | Owner tetap tercatat di `ai_usage_log`. Admin Dashboard menampilkan "Owner: X tokens, $Y cost". Tidak ada payment, tapi cost tetap di-track untuk laporan. |
| Q4 | CS Overview perlu sekarang? | **Ya — perlu sekarang** | Area 5 naik priority dari P3 → P2. Bangun placeholder + manual stats. |
| Q5 | System Health pakai cara mana? | **A — hybrid** | Vercel API untuk infra metrics + custom untuk business logic |

---

## 6. File-First Principle (per Company Principles)

Sebelum nambah fitur baru, semua keputusan di atas **harus** tercermin di:
- ✅ `docs/ai-team/product/admin-dashboard.md` (this file) — spec & roadmap
- ✅ `.ai/decisions.md` — Decision 005 untuk owner classification
- ✅ `lib/api-spec/openapi.yaml` — semua endpoint baru didefinisikan dulu sebelum code
- ✅ `lib/db/src/schema/` — schema admin_audit_log + users.role (kalau migrasi)

**Update setiap milestone.** Jangan biarkan doc vs code divergen.

---

## 7. Last Updated

2026-08-29 — initial spec from owner-AI discussion

Next review: setelah Phase 1 selesai atau ada perubahan strategi dari owner.
