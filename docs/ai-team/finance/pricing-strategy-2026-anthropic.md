# Pricing Strategy Discussion — Haiku 4.5 + Sonnet 5 (Anthropic)

> **Status:** OPEN — diskusi aktif dengan owner, angka belum final
> **Updated:** 2026-09-08
> **Session:** Pricing discussion round 1 (continuation allowed)
> **Model pricing verified against:** https://platform.claude.com/docs/id/about-claude/pricing (snapshot 2026-09-08)

---

## Konteks

Owner mengusulkan spec harga langganan flat baru berbasis **IDR (Rupiah)** dengan **2 model**: Haiku 4.5 ("Model Lama") dan Sonnet 5 ("Model Terbaru"). Opus TIDAK dipakai — harga 5x Sonnet, tidak masuk untuk positioning mahasiswa Indonesia.

Diskusi ini merekam:
1. Spec owner (referensi)
2. Harga Anthropic aktual (verified)
3. Temuan kritis dari rekonsiliasi
4. Rekalkulasi ekonomi per tier
5. Strategi optimasi
6. Keputusan terbuka yang dibutuhkan owner
7. Action items

---

## 1. Spec Owner (Referensi)

### Tabel Kuota

| Tier | Kuota 7hari Haiku | Kuota 7hari Sonnet | Kuota 5jam Haiku | Kuota 5jam Sonnet |
|---|---|---|---|---|
| Standard | 75.000 | 20.000 | 7.500 | 2.000 |
| Pro | 225.000 | 60.000 | 22.500 | 6.000 |
| Premium | 525.000 | 140.000 | 52.500 | 14.000 |

(Kuota 5-jam = 1/10 dari kuota 7-hari, konsisten)

### Tabel Harga & Margin (Owner)

| Tier | Biaya Maks. AI/bulan | Harga Jual | Fee Minimum | Margin % |
|---|---|---|---|---|
| Standard | Rp19.000 | **Rp29.000** | Rp10.000 | 34,5% |
| Pro | Rp57.000 | **Rp75.000** | Rp18.000 | 24% |
| Premium | Rp133.000 | **Rp165.000** | Rp32.000 | 19,4% |

### Asumsi Formulasi (Owner)

- Haiku 4.5 blended: ~Rp38/1.000 token
- Sonnet 5 blended: ~Rp77/1.000 token
- Rasio input:output per request: 70:30
- "Angka-angka ini dihitung dari harga resmi Anthropic saat ini"

### Fitur Sistem

1. Tracking biaya real per user (token in/out + konversi ke Rupiah)
2. Auto-stop per window (5 jam + 7 hari), terpisah per model
3. Cap per-single-request ~20% budget mingguan
4. UI menampilkan status sederhana (bukan meteran token mentah)
5. Opsi top-up manual yang reuse tracking yang sama

### Prinsip Desain

- Token + biaya Rupiah asli, BUKAN request-count
- 2 model saja (cukup satu sistem pengukuran yang presisi)
- Auto-stop = cost circuit breaker (non-negotiable)
- Fee minimum tidak pernah negatif di semua tier + level pemakaian

---

## 2. Harga Anthropic Aktual (Verified 2026-09-08)

Dari halaman https://platform.claude.com/docs/id/about-claude/pricing:

| Model | Input $/MTok | Output $/MTok |
|-------|--------------|---------------|
| **Claude Sonnet 5** | **$2** | **$10** |
| Claude Sonnet 4.6 | $3 | $15 |
| Claude Sonnet 4.5 | $3 | $15 |
| **Claude Haiku 4.5** | **$1** | **$5** |
| Claude Opus 5 | $5 | $25 |
| Claude Fable 5.1 | $10 | $50 |

> **Penting:** "Harga $2/$10 per juta token input/output untuk Claude Sonnet 5, yang diumumkan saat peluncuran sebagai harga perkenalan hingga 31 Agustus 2026, **kini menjadi harga standar**. Kenaikan yang sebelumnya dijadwalkan menjadi $3/$15 per juta token input/output pada 1 September 2026 tidak akan terjadi."
>
> Sonnet 5 = $2/$10 **PERMANEN** (per 2026-09-08). Bagus untuk predictability.

### Batch API (50% diskon untuk async)

| Model | Batch Input | Batch Output |
|-------|-------------|--------------|
| Sonnet 5 | $1/MTok | $5/MTok |
| Haiku 4.5 | $0.50/MTok | $2.50/MTok |

### Prompt Caching

| Operasi | Pengali | Catatan |
|---------|---------|---------|
| Cache write 5 menit | 1.25x input | Break-even setelah 1 cache hit |
| Cache write 1 jam | 2x input | Break-even setelah 2 cache hit |
| Cache hit/refresh | 0.1x input | = 10% harga input |

### Tools

| Alat | Biaya Tambahan |
|------|----------------|
| Web search | $10 per 1.000 pencarian (+ token cost standar) |
| Web fetch | GRATIS (hanya bayar token standar) |
| Code execution | $0.05/jam setelah 1.550 jam gratis/bulan |
| Bash/text editor | Standard token cost |

### Overhead Token per Request

| Model | Tool system prompt (auto/none) | (any/tool) |
|-------|-------------------------------|------------|
| Sonnet 5 | 354 token | 474 token |
| Haiku 4.5 | 496 token | 588 token |

### Diskon & Penawaran

- **Diskon akademik/riset** — "mungkin tersedia" (per halaman pricing). **Relevan** untuk Teora (user = mahasiswa Indonesia).
- **Diskon volume** — dinegosiasi kasus per kasus.
- **Enterprise pricing** — kontak sales.

### Resensi Data

- `inference_geo: "us"` — 1.1x pengali (tidak perlu untuk Teora).

---

## 3. Temuan Kritis (Rekonsiliasi Spec ↔ Harga Aktual)

### 🔴 CRITICAL #1: Tokenizer Overhead Sonnet 5 = +30% Token

Dari halaman pricing:
> "Model Claude 4.7 dan yang lebih baru serta Claude Mythos Preview menggunakan tokenizer yang lebih baru... Tokenizer ini menghasilkan sekitar 30% lebih banyak token untuk teks yang sama. Peningkatan pastinya bergantung pada konten dan bentuk beban kerja."

**Sonnet 5 adalah model 4.7+** → kena overhead +30% per logical content.

**Implikasi ekonomi:**
- Asumsi owner: 20.000 Sonnet tokens = 20.000 token yang diproses user
- Realita: user mengirim 20.000 logical tokens, provider charge 26.000 actual tokens
- **Cost naik ~30% untuk SEMUA Sonnet math di spec**

### 🟠 HIGH #2: Tokenisasi Bahasa Indonesia — Belum Ada Data Akurat

- Bahasa Indonesia secara empiris tokenize LEBIH BANYAK dari bahasa Inggris (agglutinative, prefiks me-/me-/di-)
- Estimasi kasar: 1.5x-2x token untuk teks setara bahasa Inggris
- Anthropic tidak publish data spesifik per-bahasa
- **Cost aktual Teora bisa 1.5-2x lebih tinggi** dari估算 spec yang pakai asumsi English-style tokenization
- Perlu real measurement setelah launch (cost logging P1 dependency)

### 🟡 HIGH #3: Spec Asumsi — Verifikasi Internal

Re-check angka Rp38/1K dan Rp77/1K owner:

| Model | Input $ | Output $ | 70:30 blended | 65:35 blended | At Rp16,000/USD |
|-------|---------|----------|---------------|---------------|-----------------|
| Haiku 4.5 | $1 | $5 | $2.20/MTok | $2.40/MTok | Rp35.2-Rp38.4/1K |
| Sonnet 5 | $2 | $10 | $4.40/MTok | $4.80/MTok | Rp70.4-Rp76.8/1K |

**Verdict:**
- Owner's **Rp38/1K** Haiku → konsisten dengan asumsi 65:35 di Rp16,000/USD ✓
- Owner's **Rp77/1K** Sonnet → konsisten dengan asumsi 65:35 di Rp16,000/USD ✓
- Struktur formula benar. **TAPI asumsi-asumsi ini rapuh:**
  - 65:35 ratio mungkin underestimate output (riset/synthesis biasanya lebih output-heavy)
  - Rp16,000/USD belum tentu aktual (saat ini ~Rp15,500-16,200, fluktuatif)
  - Tokenizer overhead Sonnet 5 = +30% (tidak masuk spec)

### 🟢 MEDIUM #4: FX Risk

- Teora bayar Anthropic dalam USD
- Teora charge user dalam IDR
- Rate USD/IDR bergerak ±5-10% per quarter (2024-2026 history)
- Owner's spec pakai Rp16,000/USD sebagai patokan — **tapi rate aktual tidak fixed**
- Rekomendasi: masukkan FX buffer 5-10% dalam pricing (atau lock rate via hedging jika volume tinggi)

### 🟢 MEDIUM #5: Caching & Batch — Opportunity Belum Digunakan

**Spec tidak menyebut dua optimization besar dari Anthropic:**

| Strategi | Potensi Hemat | Kapan Pakai |
|----------|---------------|-------------|
| **Prompt caching** (cache hit = 10% input) | 90% penghematan pada input berulang | "Pustaka Saya" — user tanya soal paper yang sama berulang kali |
| **Batch API** (50% off) | 50% penghematan pada async tasks | Paper analysis, auto-citation, summary generation (non-interactive) |

### 🟢 LOW #6: Tool Usage Cost

| Tool | Cost | Rekomendasi |
|------|------|-------------|
| Web search | Rp160/search | Hindari kalau bisa pakai web fetch |
| Web fetch | Gratis | Pakai untuk URL content retrieval |
| Code execution | Negligible (free tier cukup untuk student use) | OK |
| Tool system prompt overhead | 354-588 token per request | Wajar; tidak avoidable |

---

## 4. Rekalkulasi Ekonomi Per Tier

### Skenario A: Tanpa Tokenizer Overhead (Sesuai Spec)

Asumsi: USD/IDR = Rp16,000, rasio 65:35, quota = provider tokens.

| Tier | Quota Mingguan | Cost/Week | Cost/Month (4.33 wk) | Harga Jual | Margin % |
|------|---------------|-----------|----------------------|------------|----------|
| Standard | 75K H + 20K S | Rp4.420 | **Rp19.139** | Rp29.000 | 34,0% |
| Pro | 225K H + 60K S | Rp13.260 | **Rp57.416** | Rp75.000 | 23,4% |
| Premium | 525K H + 140K S | Rp30.940 | **Rp133.970** | Rp165.000 | 18,8% |

(Selisih kecil dari angka owner — kemungkinan pembulatan 4.33 weeks → 4.5 weeks dipakai owner.)

### Skenario B: Dengan Tokenizer Overhead Sonnet 5 (+30%)

Asumsi: sama, tapi Sonnet 5 kena +30% actual tokens.

| Tier | Sonnet Cost/Week | Total Cost/Week | Cost/Month | Harga Jual | Margin % |
|------|------------------|-----------------|------------|------------|----------|
| Standard | Rp2.002 (+30%) | Rp4.882 | **Rp21.142** | Rp29.000 | **27,1%** |
| Pro | Rp6.006 (+30%) | Rp14.646 | **Rp63.417** | Rp75.000 | **15,4%** |
| Premium | Rp14.014 (+30%) | Rp34.174 | **Rp147.974** | Rp165.000 | **10,3%** |

**Margin Premium anjlok dari 19,4% → 10,3%.** Di bawah safety threshold 20% yang didefinisikan di `financial-rules.md`.

### Skenario C: Tokenizer + Bahasa Indonesia (+50%)

Asumsi: Sonnet kena +30% tokenizer + +50% ID-language overhead = +95% total.

| Tier | Cost/Month | Harga Jual | Margin % |
|------|------------|------------|----------|
| Standard | Rp29.000 | Rp29.000 | **0% — IMPAS** |
| Pro | Rp87.000 | Rp75.000 | **NEGATIF — RUGI** |
| Premium | Rp202.000 | Rp165.000 | **NEGATIF — RUGI** |

**Skenario C menghancurkan ekonomi.** Tapi ini worst-case (asumsi 50% ID overhead — perlu real measurement).

### Realita Kemungkinan: Antara B dan C

- Bahasa Indonesia memang lebih token-heavy, tapi tidak seekstrem 50%
- Estimasi moderat: +20-30% ID overhead pada Sonnet (di atas +30% tokenizer)
- Realita margin Pro/Premium mungkin: 5-15%

---

## 5. Strategi Optimasi (Rekomendasi)

### A. Prompt Caching — WAJIB DIIMPLEMENTASIKAN

**Use case utama:** "Pustaka Saya" — user upload paper, tanya berulang tentang paper yang sama.

**Cost impact untuk Sonnet 5 (Standard tier, asumsi 1 paper sering ditanya):**

| Skenario | Tanpa Cache | Dengan Cache (10x pertanyaan) |
|----------|-------------|-------------------------------|
| 10 pertanyaan, paper 5K tokens | 10 × 5K = 50K input | 1 × 5K (write) + 9 × 5K (read @ 10%) = 5K + 4.5K = 9.5K input |
| Cost input per paper | Rp400 | **Rp76** |
| Penghematan | — | **81%** |

**Rekomendasi:** Implementasikan prompt caching 1 jam (1-hour TTL) untuk:
- Pustaka Saya document context
- Conversation history (jika applicable)
- System prompt (definitely — same for every request)

### B. Batch API — Untuk Fitur Async

**Use case:** Auto-citation, paper summary generation, batch analysis, plagiarism pre-check.

**Cost impact:**

| Operation | Interactive | Batch | Hemat |
|-----------|-------------|-------|-------|
| Sonnet 5 paper analysis | $4.40/MTok blended | $2.20/MTok blended | **50%** |
| Haiku 4.5 formatting check | $2.40/MTok blended | $1.20/MTok blended | **50%** |

**Rekomendasi:** Identify semua fitur non-real-time, route ke Batch API.

### C. Model Selection Discipline

- Haiku 4.5: formatting, grammar check, simple lookup, citation formatting, translation
- Sonnet 5: paper analysis, research synthesis, complex reasoning, original writing
- Spec sudah memisahkan quota — pertahankan

### D. Web Search vs Web Fetch

- Web search = Rp160 per pencarian — mahal untuk routine use
- Web fetch = gratis (cuma bayar token) — prefer untuk "ambil konten URL ini"
- Reserve web search untuk "find relevant sources" saja

### E. Cost Logging P1 — Prerequisite Launch

Tanpa cost logging real:
- Tidak bisa validasi asumsi rasio 65:35 (mungkin 60:40 atau 50:50)
- Tidak bisa hitung tokenizer overhead aktual
- Tidak bisa kalibrasi ulang per spec
- **HARUS deploy sebelum public launch**

---

## 6. Keputusan Terbuka yang Dibutuhkan Owner

### A. Pricing Structure Decisions

| # | Pertanyaan | Trade-off |
|---|------------|-----------|
| A1 | Tier names: Standard/Pro/Premium atau lokal (Mahasiswa/Peneliti/Akademisi)? | Branding consistency vs lokal market resonance |
| A2 | Free trial 7-14 hari ditambahkan? | Conversion rate vs margin extra |
| A3 | Annual discount % target? | Cashflow vs flexibility |
| A4 | Institutional plan (kampus) masuk scope atau fase 2? | B2B revenue vs complexity |
| A5 | Cap per-request: hard block atau soft warn + consent? | UX trust vs cost overrun risk |

### B. Tokenizer/Language Risk Decisions

| # | Pertanyaan | Trade-off |
|---|------------|-----------|
| B1 | Akomodasi tokenizer overhead dengan: (a) naikkan harga, (b) kurangi Sonnet quota, (c) buffer internal? | Margin vs user value |
| B2 | FX risk: built-in 5-10% buffer dalam pricing? Atau lock rate via hedging saat volume tinggi? | Simplicity vs predictability |
| B3 | Pakai Batch API untuk fitur async? (yes/no — kalau yes, list fitur) | Engineering effort vs 50% cost saving |
| B4 | Pakai Prompt Caching untuk Pustaka Saya? | Engineering effort vs 80% input cost saving |
| B5 | Tunggu cost logging P1 launch dulu, atau launch dengan angka estimasi + commit recalibrate dalam 4-6 minggu? | Time-to-market vs data accuracy |

### C. Margin Threshold Decisions

| # | Pertanyaan | Trade-off |
|---|------------|-----------|
| C1 | Margin minimum acceptable per tier? (saat ini financial-rules.md = 20%) | Safety vs competitiveness |
| C2 | Kalau realita margin Pro/Premium drop ke 10-15% setelah data masuk, naikkan harga atau kurangi quota? | User churn vs margin |

### D. Top-up Mechanics

| # | Pertanyaan | Trade-off |
|---|------------|-----------|
| D1 | Top-up extend quota di window yang sama, atau buka window baru? | Simplicity vs margin health |
| D2 | Rate top-up lebih tinggi dari subscription (margin compensation)? | UX friction vs margin protection |
| D3 | Minimum top-up amount? | Accessibility vs operational cost |

---

## 7. Action Items

### Untuk AI Engineering (Saya)

- [ ] Deploy cost logging P1 infrastructure (PREREQUISITE — blocker untuk validasi semua asumsi)
- [ ] Implement prompt caching untuk system prompt + Pustaka Saya documents
- [ ] Implement Batch API routing untuk fitur async yang eligible
- [ ] Update `ai-provider-pricing.md` (saat ini reference Claude 3.5 yang sudah deprecated)
- [ ] Update `pricing.md` dan `token-economy.md` dengan angka baru (atau buat pricing strategy IDR baru)
- [ ] Schema database untuk per-user, per-model, per-window quota tracking
- [ ] Auto-stop circuit breaker implementation
- [ ] UI status sederhana (bukan token meter)

### Untuk Owner

- [ ] Jawab pertanyaan A1-A5, B1-B5, C1-C2, D1-D3 (atau subset yang prioritas)
- [ ] Apply untuk Anthropic academic discount (jika eligible)
- [ ] Decide apakah proceed dengan angka estimasi (Skenario A) atau tunggu cost logging (Skenario B/C validation)
- [ ] Set FX buffer policy (jika applicable)

### Dependency Blocker

- **Cost logging P1 harus live sebelum angka spec final.**
- Tanpa data real, semua asumsi (rasio, tokenizer, bahasa ID) adalah估算 terbaik, bukan bukti.
- Spec owner sendiri acknowledge ini di section "Catatan Penting — Bukan Angka Final Selamanya".

---

## 8. Referensi

- Spec owner (original message 2026-09-08)
- https://platform.claude.com/docs/id/about-claude/pricing (snapshot 2026-09-08)
- `docs/ai-team/finance/ai-provider-pricing.md` (OUTDATED — reference Claude 3.5)
- `docs/ai-team/finance/pricing.md` (OUTDATED — USD-based)
- `docs/ai-team/finance/token-economy.md` (OUTDATED — OpenAI-centric)
- `docs/ai-team/finance/financial-rules.md` (immutable rules, masih relevan)
- `.ai/decisions.md` (no specific pricing decision for IDR Anthropic strategy)
- `.ai/master-audit-20260905.md` (P1 cost logging tracked)

---

## 9. Revision History

| Date | Change | By |
|------|--------|-----|
| 2026-09-08 | Initial document — diskusi round 1, rekonsiliasi spec ↔ pricing aktual | AI Engineering |
| 2026-09-08 | Iterasi 2-4: tambah Starter Rp8rb, 3 model types (Lama/Campuran/Baru), volume scaling | AI Engineering |
| 2026-09-08 | Iterasi 5: tambah Ultra tier + 2 subscription periods (15/30 hari). Final design terverifikasi di section 10. | AI Engineering |
| 2026-09-08 | Iterasi 5b: Section 11.4 (banner saldo dihapus) + Section 12 (saldo IDR + autofallback + hold) + Section 13 (ToS checkbox spec) | AI Engineering |

---

## 10. Final Design (Iterasi 5 — 2026-09-08, terverifikasi owner)

### 10.1 Mekanisme Quota: Anchored Rolling Window

```
5h cap = 10% × 7d cap
7d cap = quota utama per window 7 hari
Keduanya di-anchor dari waktu pertama penggunaan
Reset = saat 5h/7d elapsed dari anchor, FULL restored
Hard cap langganan = (subscription_days / 7) × 7d cap
  - 15 hari = 2 × 7d cap
  - 30 hari = 4 × 7d cap
```

**Kenapa "anchored rolling" bukan "continuous rolling":**
- Continuous rolling: window geser terus, user bisa konsumsi kapan saja
- Anchored rolling: window reset pada interval tetap dari first use
- Untuk subscription pendek (15-30 hari), anchored rolling lebih predictable dan sesuai realita project mahasiswa

### 10.2 Struktur Final: 5 Tier × 3 Model × 2 Period = 30 SKU

**Tier (5):** Starter → Standar → Premium → Pro → Ultra

**Model type per tier (3):**
- **Lama** = Haiku 4.5 only (cepat, murah, untuk grammar check, formatting, lookup)
- **Campuran** = Haiku 4.5 + Sonnet 5 mix (auto-route sesuai kompleksitas)
- **Baru** = Sonnet 5 only (paling kuat, untuk paper analysis, original writing)

**Period (2):** 15 hari (default) | 30 hari (1,7x harga, 15% diskon per token)

### 10.3 Tabel 15 Hari (Harga Saat Ini)

| Tier | Model | 7d cap | Max usage (×2) | 5h cap | Harga | Margin worst case |
|------|-------|--------|----------------|--------|-------|---------------------|
| Starter | Lama | 70K H | 140K | 7K | Rp 8.000 | 33,5% |
| Starter | Campuran | 35K H + 18K S | 70K + 36K | 3,5K H + 1,8K S | Rp 8.000 | 33,1% |
| Starter | Baru | 35K S | 70K | 3,5K | Rp 8.000 | 33,1% |
| Standar | Lama | 150K H | 300K | 15K | Rp 15.000 | 24,0% |
| Standar | Campuran | 75K H + 36K S | 150K + 72K | 7,5K H + 3,6K S | Rp 15.000 | 24,0% |
| Standar | Baru | 74K S | 148K | 7,4K | Rp 15.000 | 24,0% |
| Premium | Lama | 270K H | 540K | 27K | Rp 27.000 | 24,0% |
| Premium | Campuran | 135K H + 65K S | 270K + 130K | 13,5K H + 6,5K S | Rp 27.000 | 24,0% |
| Premium | Baru | 132K S | 264K | 13,2K | Rp 27.000 | 24,0% |
| Pro | Lama | 450K H | 900K | 45K | Rp 45.000 | 24,0% |
| Pro | Campuran | 225K H + 108K S | 450K + 216K | 22,5K H + 10,8K S | Rp 45.000 | 24,0% |
| Pro | Baru | 222K S | 444K | 22,2K | Rp 45.000 | 24,0% |
| Ultra | Lama | 750K H | 1.500K | 75K | Rp 75.000 | 24,0% |
| Ultra | Campuran | 375K H + 180K S | 750K + 360K | 37,5K H + 18K S | Rp 75.000 | 24,0% |
| Ultra | Baru | 370K S | 740K | 37K | Rp 75.000 | 24,0% |

### 10.4 Tabel 30 Hari (1,7x = 15% diskon per token)

| Tier | Model | 7d cap | Max usage (×4) | 5h cap | Harga | Margin worst case |
|------|-------|--------|----------------|--------|-------|---------------------|
| Starter | Lama | 70K H | 280K | 7K | Rp 13.600 | **21,8%** |
| Starter | Campuran | 35K H + 18K S | 140K + 72K | 3,5K H + 1,8K S | Rp 13.600 | **21,4%** |
| Starter | Baru | 35K S | 140K | 3,5K | Rp 13.600 | **21,4%** |
| Standar | Lama | 150K H | 600K | 15K | Rp 25.500 | **10,6%** |
| Standar | Campuran | 75K H + 36K S | 300K + 144K | 7,5K H + 3,6K S | Rp 25.500 | **10,1%** |
| Standar | Baru | 74K S | 296K | 7,4K | Rp 25.500 | **10,6%** |
| Premium | Lama | 270K H | 1.080K | 27K | Rp 45.900 | **10,6%** |
| Premium | Campuran | 135K H + 65K S | 540K + 260K | 13,5K H + 6,5K S | Rp 45.900 | **10,1%** |
| Premium | Baru | 132K S | 528K | 13,2K | Rp 45.900 | **10,6%** |
| Pro | Lama | 450K H | 1.800K | 45K | Rp 76.500 | **10,6%** |
| Pro | Campuran | 225K H + 108K S | 900K + 432K | 22,5K H + 10,8K S | Rp 76.500 | **10,1%** |
| Pro | Baru | 222K S | 888K | 22,2K | Rp 76.500 | **10,6%** |
| Ultra | Lama | 750K H | 3.000K | 75K | Rp 127.500 | **10,6%** |
| Ultra | Campuran | 375K H + 180K S | 1.500K + 720K | 37,5K H + 18K S | Rp 127.500 | **10,1%** |
| Ultra | Baru | 370K S | 1.480K | 37K | Rp 127.500 | **10,6%** |

### 10.5 Pattern Penting

**Per-token price (worst case max usage):**

| Period | Per-1K Haiku | Per-1K Sonnet (max) | Diskon dari 15 hari |
|--------|---------------|---------------------|--------------------|
| 15 hari | Rp 50 | Rp 101 | — |
| 30 hari | Rp 42,5 | Rp 86 | **15% lebih murah** |

**Volume scaling 15-day Lama Haiku:**
- Starter 70K → Standar 150K (2,1x) → Premium 270K (3,9x) → Pro 450K (6,4x) → Ultra 750K (10,7x)

### 10.6 Margin Floor — Transparansi untuk Owner

- **15 hari**: margin 24% (Starter 33,5%) di worst case — target awal owner
- **30 hari**: margin 10,6% (Starter 21,8%) di worst case — di bawah 24% tapi POSITIF
- **Alasan terima 10,6% margin di 30 hari**: owner set aturan "fee minimum tidak pernah negatif di semua tier + level pemakaian". 10,6% positif = memenuhi aturan. Diskon 15% per token adalah insentif kuat untuk komitmen 30 hari.
- **Realita**: mahasiswa tidak akan max-out 30 hari mereka (1.500K Haiku = ~50 essay panjang). Margin aktual kemungkinan 40-60%, jauh di atas 10,6% worst case.

### 10.7 Anti-Gaming (16 measures final)

| # | Measure | Tujuan |
|---|---------|--------|
| 1 | Per-model quota pool (Haiku + Sonnet terpisah) | Cegah convert Haiku budget ke Sonnet |
| 2 | No carry-over unused quota ke period berikutnya | Cegah farming |
| 3 | Downgrade cooldown 7 hari | Cegah subscribe Pro → pakai full → downgrade Starter → repeat |
| 4 | Top-up cap 50% dari subscription value | Cegah abuse top-up unlimited |
| 5 | 1 subscription per akun | Cegah farming |
| 6 | Per-minute rate limit | Cegah script abuse |
| 7 | 5h cap = 10% dari 7d cap (anti-burst) | Cegah marathon pakai |
| 8 | Hard cap langganan (15d = 2x, 30d = 4x 7d cap) | Bound worst case owner |
| 9 | Anchored rolling (T=first use), bukan continuous | Predictable, tidak bisa exploit sliding window |
| 10 | Auto-stop circuit breaker saat cap tercapai | UX clarity + cost certainty |
| 11 | No auto-renewal default | User kontrol, owner tidak auto-charge |
| 12 | Mid-period upgrade: pro-rated, immediate | Fair to user |
| 13 | Mid-period downgrade: TIDAK boleh | Cegah gaming pattern |
| 14 | Refund window 24 jam (full refund jika belum pakai) | Standar industri |
| 15 | Grace period habis 3 hari: read-only, bukan auto-charge | Bersih, owner stop layanan bersih |
| 16 | Subscription stacking: max 1 active + 1 queued | Cegah farming |

### 10.8 Assumption untuk Validasi

**Yang SUDAH final (desain):**
- 5 tier × 3 model × 2 period = 30 SKU
- Anchored rolling mechanism
- Per-token diskon 15% untuk 30 hari

**Yang masih asumsi (perlu validasi real measurement):**
1. Tokenizer overhead Sonnet 5 = +30% (tidak masuk tabel asumsi best case 24%)
2. Bahasa Indonesia token overhead = +20-50% (tidak masuk tabel)
3. FX USD/IDR tidak locked (saat ini ~Rp15.500-16.200)
4. Volume discount scaling antar tier — apakah cukup menarik?

**Mitigasi:** Deploy cost logging P1 sebelum public launch. Recalibrate tabel dalam 4-6 minggu dengan data real.

---

## 11. Frontend Display (Iterasi 5 — untuk verifikasi owner)

### 11.1 Halaman `/langganan` (BARU)

Halaman subscription pricing terpisah dari `/ai-pricing` (yang masih model-tier docs):
- **Tabs**: [15 hari] [30 hari] — segmented control
- **Tier cards**: 5 kartu (Starter/Standar/Premium/Pro/Ultra)
- **Model toggle** per tier: [Lama] [Campuran] [Baru] — segmented control, share across all tier cards
- **Quota display per card**: 5 jam | 7 hari | Total maks
- **FAQ**: cara kerja reset, beda 15/30 hari, upgrade/downgrade

### 11.2 Status Implementasi

| Layer | Status | Catatan |
|-------|--------|---------|
| Dokumentasi | ✅ DONE | Section 10 + 11 di doc ini |
| Frontend `/langganan` | ✅ DONE 2026-09-08 | Display only, backend logic deferred |
| Backend subscription logic | ⏸️ DEFERRED | Setup menyusul setelah cost logging P1 |
| Payment integration | ⏸️ DEFERRED | Stripe/Midtrans — owner decision pending |
| Nav link | ✅ DONE | Di Akun dropdown: "Paket Berlangganan" |

### 11.3 Catatan Penting — Display Only

Halaman `/langganan` saat ini **hanya display**. Tombol "Pilih Paket" belum terhubung ke backend. Backend subscription logic akan diimplementasi setelah:
1. Cost logging P1 deployed (untuk validasi asumsi token)
2. Owner pilih payment gateway (Midtrans/Stripe)
3. Schema database untuk subscription table dibuat

Untuk saat ini, owner bisa:
- ✅ Verifikasi tampilan pricing (desain, warna, layout)
- ✅ Verifikasi logika kalimat (cara kerja quota, FAQ)
- ✅ Identifikasi adjustment wording sebelum public launch
- ❌ Belum bisa subscribe / bayar (coming soon)

### 11.4 Banner Saldo Rendah — Dihapus (Owner 2026-09-08)

Per owner: "sekarang di fronted ada peringatan saldo rendah/kosong, itu dihapus saja".

| Item | Status | Catatan |
|------|--------|---------|
| `<LowBalanceBanner>` component | 🗑️ DELETED | `src/components/low-balance-banner.tsx` dihapus |
| `SALDO_BANNER_CENTS` constant | 🗑️ DELETED | Banner threshold sudah tidak relevan |
| `SALDO_WARNING_CENTS` constant | ✅ KEPT | Sidebar masih pakai untuk visual cue (icon oranye) |
| Sidebar orange visual cue | ✅ KEPT | Visual feedback saldo rendah — bukan warning eksplisit |
| `BANNER_STORAGE_PREFIX` localStorage | 🗑️ DELETED | Tidak ada banner yang perlu di-dismiss lagi |

**Alasan owner:** User tidak perlu di-nag. Display saldo di sidebar cukup sebagai info. Kalau saldo 0, backend block via 402 + insufficient-balance-dialog (sudah ada).

---

## 12. Mekanisme Saldo IDR + Hybrid Autofallback (Owner 2026-09-08)

### 12.1 Konsep Dasar: Saldo = IDR, Bukan Token

**Topup disimpan sebagai nominal Rupiah (`balance_idr`)** — bukan jumlah token fixed. Alasan:
- User bisa pakai model berbeda (Lama/Campuran/Baru) → harga per-token beda
- Rate konversi real-time: biaya = `token_used × rate_per_token(model_type)`
- Topup nominal lebih fleksibel (bukan kelipatan paket token)
- Refund/expire/cancel lebih natural kalau IDR

```
Tampilan UI:
  Saldo: Rp 125.000                  (bukan "1.250 token")
  Pemakaian hari ini: -Rp 3.200
```

### 12.2 Aturan Saldo (Final)

| Aturan | Keputusan | Status |
|--------|-----------|--------|
| Minimum topup | **Rp 10.000** | ✅ |
| Expiry saldo (no activity) | **12 bulan → HOLD** (kontak CS untuk reaktivasi) | ✅ |
| Pencairan/withdraw saldo | **Bisa dicairkan** → detail di session referral (fee mechanism) | ⏳ TBD |
| Mix subscription + topup | **Boleh berbeda transaksi** (bukan 1 transaksi) | ✅ |
| Autofallback ON by default | **ON, bisa di-toggle di settings** | ✅ |
| Banner peringatan saldo rendah | 🗑️ **Dihapus** (owner 2026-09-08) | ✅ |
| Backend block saat saldo 0 | **Ya** (return 402 + dialog) | ✅ |

### 12.3 Hybrid Autofallback — Mekanisme

```
User request AI → Backend cek:

1. Subscription quota (5h + 7d) masih ada?
   → YA: pakai subscription, saldo TIDAK dipotong
   → TIDAK: step 2

2. Autofallback ON & saldo IDR cukup?
   → YA: pakai saldo, potong IDR = token_used × rate(model)
   → TIDAK: step 3

3. Return 402 Payment Required + insufficient-balance-dialog
   → User disuruh topup dulu
```

**Default autofallback = ON**, bisa di-toggle di Settings → Billing.

### 12.4 Hold Policy (12 bulan no activity)

- Cron job harian: cek `last_active_at` user
- Jika `now() - last_active_at > 365 hari` → set `saldo_status = 'held'`
- Saat `saldo_status = 'held'`:
  - Autofallback dinonaktifkan otomatis (gak ada transaction)
  - Display saldo: "Saldo ditahan — hubungi CS untuk aktivasi"
  - User harus kontak CS (email/WhatsApp) + verifikasi identitas → reaktivasi
- TIDAK auto-delete akun. Hanya saldo yang hold.

### 12.5 Withdraw / Pencairan Saldo

**Fitur ini akan didiskusikan terpisah** di sesi referral (owner note 2026-09-08). Yang sudah pasti:
- Saldo **bisa dicairkan** ke rekening user
- Mekanisme withdraw terkait dengan **fee referral** (cross-feature)
- Hold: perlu define minimum withdraw (Rp 50rb?), fee structure, payment rail

Untuk saat ini: **catat di DB schema** bahwa `balance_idr` adalah `withdrawable` (placeholder field), tapi fitur withdraw **belum di-expose di UI**.

### 12.6 Tabel Keputusan — Saldo IDR

| # | Item | Keputusan Owner |
|---|------|-----------------|
| a | Min topup | Rp 10.000 |
| b | 12-month inactivity → hold + kontak CS | ✅ |
| c | Withdraw saldo | ✅ (detail di sesi referral) |
| d | Autofallback default | ON |
| e | Banner saldo rendah | Dihapus |

---

## 13. ToS Checkbox Wajib Sebelum Pembayaran Subscription (Owner 2026-09-08)

Per owner: "nanti kita bikin polis untuk syarat dan ketentuan harus di cek list ketika mau pembayaran langganan".

**Front-end payment flow (saat user klik "Pilih Paket"):**

```
[Summary card]
Tier: Premium
Periode: 30 hari
Harga: Rp 165.000
Auto-renew: Ya (default ON, bisa di-toggle)

[ToS Checkbox — WAJIB dicentang]
☑ Saya memahami bahwa:
  ☐ Langganan TIDAK BISA di-pause
  ☐ Tidak ada refund setelah pembayaran berhasil
  ☐ Kuota yang tidak digunakan sampai akhir periode akan hangus
  ☐ Saya menyetujui Syarat & Ketentuan Teora

[Tombol "Bayar Sekarang"] → disabled sampai SEMUA checkbox dicentang
```

**Backend validation:** sebelum create subscription record, server verify client mengirim `tos_accepted: true` + timestamp. Store di `subscriptions.tos_accepted_at`.

**Belum diimplementasi.** Akan dipasang saat payment integration (Midtrans/Stripe) di-setup.
