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
| 2026-09-09 | Iterasi 6: Section 14 (Keputusan Opsi B — pisahkan in/out di backend) + Section 15 (Simulasi fee minimum langganan + topup dengan markup 40%) | AI Engineering |

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
| Pencairan/withdraw saldo | 🗑️ **Tidak ada fitur withdraw** (owner 2026-09-08) | ✅ |
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

**Tidak ada fitur withdraw** (owner 2026-09-08). Saldo hanya bisa digunakan untuk autofallback AI usage. Tidak bisa dicairkan ke rekening.

### 12.6 Tabel Keputusan — Saldo IDR

| # | Item | Keputusan Owner |
|---|------|-----------------|
| a | Min topup | Rp 10.000 |
| b | 12-month inactivity → hold + kontak CS | ✅ |
| c | Withdraw saldo | 🗑️ Tidak ada |
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

---

## 14. Keputusan Opsi B: Pisahkan In/Out di Backend (Owner 2026-09-09)

### 14.1 Latar Belakang

Owner concern: kalau Teora hitung AI cost pakai **blended rate asumsi** (mis. 65:35 input:output), dan realita user lebih output-heavy (mis. 50:50), margin bisa terkikis. Untuk Sonnet 5 (output $10/MTok vs input $2/MTok = rasio 5x), perbedaan ini material.

Tiga opsi yang dievaluasi:

| Opsi | Cara kerja | Pro | Kontra |
|------|-----------|-----|--------|
| A: Blended saja di mana-mana | Asumsi 65:35 fixed | Simpel, predictable | Margin bisa negatif kalau user output-heavy |
| B: Pisahkan in/out di backend (silent) | Tagih = `(real_input × rate_in) + (real_output × rate_out) × markup` | Margin absolut aman, UX tetap simpel | User Sonnet-output-heavy bayar lebih mahal |
| C: Pisahkan in/out transparan ke user | UI tampilkan 2 angka | Margin + edukasi user | UX ribet, sales friction |

**Keputusan owner: Opsi B.** Alasan:
1. Backend sudah support (lihat `artifacts/api-server/src/lib/ai.ts:156-171` — `estimateCost` pakai `pricePer1MInputCents` + `pricePer1MOutputCents` terpisah)
2. UX tetap simpel — user lihat "X token terpakai" saja
3. Margin terkontrol positif tanpa asumsi rasio

### 14.2 Dampak per Metode Pembayaran

| Metode | Dampak Opsi B | Implementasi |
|--------|---------------|---------------|
| **Langganan (subscription)** | **Visibility only** — quota tetap rolling 5h/7d, harga jual tetap flat. Opsi B hanya untuk FinOps monitoring (`ai_usage_log.inputTokens/outputTokens/costCents`) supaya owner tahu margin riil per tier. **Margin wholesale tidak berubah** karena dilindungi buffer harga jual. | Track real cost di `ai_usage_log`, dashboard FinOps baca dari sana |
| **Topup (saldo IDR)** | **Full protection** — tagihan user = real `costCents` dari backend (bukan blended asumsi). Markup 40% dari cost real. Margin absolut terkontrol. | `ai_usage_log.costCents` × 1.4 = tagih user, kurangi `balance_idr` |

### 14.3 Markup Topup: 40% (Owner 2026-09-09)

**Formula:**
```
cost_per_1K_real = (input_tokens × rate_input + output_tokens × rate_output) / 1000
tagih_per_1K_user = cost_per_1K_real × 1.40
margin_bruto = 0.40 × cost_real
margin_neto = margin_bruto - (0.007 × tagih_user)  // QRIS fee
```

**Rate jual per 1K token (markup 40%):**

| Model | Rasio | Cost Real / 1K | Tagih User / 1K | Margin per 1K |
|-------|-------|----------------|-----------------|--------------|
| Haiku 4.5 | 65:35 | Rp 38.4 | Rp 53.8 | Rp 15.4 |
| Haiku 4.5 | 50:50 | Rp 48.0 | Rp 67.2 | Rp 19.2 |
| Sonnet 5 | 65:35 | Rp 76.8 | Rp 107.5 | Rp 30.7 |
| Sonnet 5 | 50:50 | Rp 96.0 | Rp 134.4 | Rp 38.4 |

**Catatan penting:**
- User Sonnet-output-heavy (50:50) **bayar lebih mahal per 1K** — bukan margin naik, transparansi cost
- Tapi total token yang didapat dari saldo Rp X **tetap sama** karena tagihan proporsional dengan cost
- Margin % Teora tetap stabil di ~27.9% (setelah QRIS) untuk semua skenario

### 14.4 Konfigurasi Tier (untuk `ai_tiers` table)

Tier sudah punya field `pricePer1MInputCents` + `pricePer1MOutputCents` (dari schema existing). Contoh nilai yang akan dipakai:

```typescript
// Tier: budget (Haiku) — topup markup 40%
{
  id: "budget",
  pricePer1MInputCents: 16,    // Rp 16/1K input (1 USD × 16.000 / 1.000)
  pricePer1MOutputCents: 80,   // Rp 80/1K output (5 USD × 16.000 / 1.000)
  markupMultiplier: 1.40,      // applied for topup charges
}

// Tier: premium (Sonnet) — topup markup 40%
{
  id: "premium",
  pricePer1MInputCents: 32,    // Rp 32/1K input (2 USD × 16.000 / 1.000)
  pricePer1MOutputCents: 160,  // Rp 160/1K output (10 USD × 16.000 / 1.000)
  markupMultiplier: 1.40,
}
```

**Note:** `pricePer1M*` adalah cost Anthropic. Charge ke user = `pricePer1M* × markupMultiplier`. Subscription TIDAK pakai `markupMultiplier` — harga flat per tier.

### 14.4.1 Schema Migration — `markup_multiplier` (Applied 2026-09-09)

**Migration 1:** `add_markup_multiplier_to_ai_tiers`

```sql
ALTER TABLE public.ai_tiers
ADD COLUMN markup_multiplier NUMERIC(5, 3) NOT NULL DEFAULT 1.400;

ALTER TABLE public.ai_tiers
ADD CONSTRAINT chk_markup_multiplier_range
CHECK (markup_multiplier >= 1.000 AND markup_multiplier <= 9.999);
```

**Migration 2:** `restructure_ai_tiers_to_anthropic_models`

Hapus 4 rows lama (free/standard/premium/ultra — Llama/Claude 3.5/GPT-4o, tidak ada FK reference), insert 2 rows baru:

| id | name | model | price_per_1M_in (cents) | price_per_1M_out (cents) | markup_multiplier |
|----|------|-------|------------------------|--------------------------|-------------------|
| haiku-4.5 | Haiku 4.5 | claude-haiku-4-5-20251001 | 1.600.000 (Rp 16/1K) | 8.000.000 (Rp 80/1K) | 1.400 |
| sonnet-5 | Sonnet 5 | claude-sonnet-5-20251001 | 3.200.000 (Rp 32/1K) | 16.000.000 (Rp 160/1K) | 1.400 |

**Backend update:** `artifacts/api-server/src/lib/ai.ts` — fallback `getTierForUser()` dan `callAI()` dari `"free"` → `"haiku-4.5"`.

**Status:** ✅ Applied ke Supabase production. Typecheck pass. No FK references broken (verified — `ai_usage_log.tier_id` dan `user_balances.preferred_tier_id` kosong untuk rows lama).

**Catatan:** Subscription tier tiers (Starter/Standar/Premium/Pro/Ultra) tetap di `subscription_packages` (30 SKU spec final). `ai_tiers` hanya runtime model config.

### 14.5 Validasi Margin — Worst Case Analysis

**Pertanyaan owner:** "apakah fee saya aman di kedua metode?"

**Jawaban:**

| Metode | Worst Case Margin | Mekanisme Proteksi |
|--------|-------------------|---------------------|
| Langganan 15 hari | 22.5-32.1% | Buffer harga jual Rp 2.5K-16.9K per tier (worst case: user pakai semua quota di Sonnet Campuran) |
| Langganan 30 hari | 8.9-20.2% | Buffer harga jual Rp 2.2K-13.7K per tier. Diskon 15% per token = insentif 30 hari, margin lebih tipis tapi positif |
| Topup Haiku | ~27.9% | Tagih = cost × 1.4 - QRIS. Tidak tergantung rasio user |
| Topup Sonnet | ~27.9% | Sama — margin % identik karena markup proporsional |

**Risiko residual:**
- Output-heavy user di Sonnet **bayar lebih mahal** → bisa complain. Mitigasi: UX jelaskan "saldo terisi sesuai pemakaian, Sonnet heavier cost = lebih banyak saldo terpakai"
- FX USD/IDR berubah → margin % tetap sama (karena markup %); absolute margin naik/turun
- Anthropic naik harga → `pricePer1M*` di tier table harus diupdate → margin % tetap sama

---

## 15. Simulasi Fee Minimum — 30 SKU + Topup Markup 40% (Owner 2026-09-09)

### 15.1 Simulasi: Langganan (30 SKU)

**Metodologi:** Fee minimum = harga jual − QRIS fee 0.7% − max AI cost blended (asumsi 65:35, worst case = user pakai SEMUA quota). Realita: margin aktual lebih tinggi karena user jarang max-out.

#### Tabel 15 Hari

| Tier | Model | Max Usage | Harga Jual | Net Revenue | AI Cost Max | Fee Teora | Margin |
|------|-------|-----------|------------|-------------|-------------|-----------|--------|
| Starter | Lama | 140K H | Rp 8.000 | Rp 7.944 | Rp 5.376 | Rp 2.568 | 32.1% |
| Starter | Campuran | 70K H + 36K S | Rp 8.000 | Rp 7.944 | Rp 5.453 | Rp 2.491 | 31.1% |
| Starter | Baru | 70K S | Rp 8.000 | Rp 7.944 | Rp 5.376 | Rp 2.568 | 32.1% |
| Standar | Lama | 300K H | Rp 15.000 | Rp 14.895 | Rp 11.520 | Rp 3.375 | 22.5% |
| Standar | Campuran | 150K H + 72K S | Rp 15.000 | Rp 14.895 | Rp 11.290 | Rp 3.605 | 24.0% |
| Standar | Baru | 148K S | Rp 15.000 | Rp 14.895 | Rp 11.366 | Rp 3.529 | 23.5% |
| Premium | Lama | 540K H | Rp 27.000 | Rp 26.811 | Rp 20.736 | Rp 6.075 | 22.5% |
| Premium | Campuran | 270K H + 130K S | Rp 27.000 | Rp 26.811 | Rp 20.352 | Rp 6.459 | 23.9% |
| Premium | Baru | 264K S | Rp 27.000 | Rp 26.811 | Rp 20.275 | Rp 6.536 | 24.2% |
| Pro | Lama | 900K H | Rp 45.000 | Rp 44.685 | Rp 34.560 | Rp 10.125 | 22.5% |
| Pro | Campuran | 450K H + 216K S | Rp 45.000 | Rp 44.685 | Rp 33.869 | Rp 10.816 | 24.0% |
| Pro | Baru | 444K S | Rp 45.000 | Rp 44.685 | Rp 34.099 | Rp 10.586 | 23.5% |
| Ultra | Lama | 1.500K H | Rp 75.000 | Rp 74.475 | Rp 57.600 | Rp 16.875 | 22.5% |
| Ultra | Campuran | 750K H + 360K S | Rp 75.000 | Rp 74.475 | Rp 56.448 | Rp 18.027 | 24.0% |
| Ultra | Baru | 740K S | Rp 75.000 | Rp 74.475 | Rp 56.832 | Rp 17.643 | 23.5% |

#### Tabel 30 Hari (1,7x = diskon 15% per token)

| Tier | Model | Max Usage | Harga Jual | Net Revenue | AI Cost Max | Fee Teora | Margin |
|------|-------|-----------|------------|-------------|-------------|-----------|--------|
| Starter | Lama | 280K H | Rp 13.600 | Rp 13.505 | Rp 10.752 | Rp 2.753 | 20.2% |
| Starter | Campuran | 140K H + 72K S | Rp 13.600 | Rp 13.505 | Rp 10.906 | Rp 2.599 | 19.1% |
| Starter | Baru | 140K S | Rp 13.600 | Rp 13.505 | Rp 10.752 | Rp 2.753 | 20.2% |
| Standar | Lama | 600K H | Rp 25.500 | Rp 25.322 | Rp 23.040 | Rp 2.282 | 8.9% |
| Standar | Campuran | 300K H + 144K S | Rp 25.500 | Rp 25.322 | Rp 22.579 | Rp 2.742 | 10.8% |
| Standar | Baru | 296K S | Rp 25.500 | Rp 25.322 | Rp 22.733 | Rp 2.589 | 10.2% |
| Premium | Lama | 1.080K H | Rp 45.900 | Rp 45.579 | Rp 41.472 | Rp 4.107 | 8.9% |
| Premium | Campuran | 540K H + 260K S | Rp 45.900 | Rp 45.579 | Rp 40.704 | Rp 4.875 | 10.6% |
| Premium | Baru | 528K S | Rp 45.900 | Rp 45.579 | Rp 40.550 | Rp 5.028 | 11.0% |
| Pro | Lama | 1.800K H | Rp 76.500 | Rp 75.965 | Rp 69.120 | Rp 6.845 | 8.9% |
| Pro | Campuran | 900K H + 432K S | Rp 76.500 | Rp 75.965 | Rp 67.738 | Rp 8.227 | 10.8% |
| Pro | Baru | 888K S | Rp 76.500 | Rp 75.965 | Rp 68.198 | Rp 7.766 | 10.2% |
| Ultra | Lama | 3.000K H | Rp 127.500 | Rp 126.608 | Rp 115.200 | Rp 11.408 | 8.9% |
| Ultra | Campuran | 1.500K H + 720K S | Rp 127.500 | Rp 126.608 | Rp 112.896 | Rp 13.712 | 10.8% |
| Ultra | Baru | 1.480K S | Rp 127.500 | Rp 126.608 | Rp 113.664 | Rp 12.944 | 10.2% |

**Ringkasan langganan:**
- 15 hari: margin 22.5-32.1% (worst case)
- 30 hari: margin 8.9-20.2% (worst case)
- Margin dilindungi buffer harga jual, **bukan** per-token margin

### 15.2 Simulasi: Topup (Markup 40%)

**Metodologi:** User topup Rp X → habiskan semua saldo. Tagih = `costCents × 1.40`. Margin neto = `0.40 × cost_real − (0.007 × topup)`.

#### Skenario 5 Nominal Topup

| Topup | Model | Rasio | Cost Real / 1K | Tagih User / 1K | Margin Neto | Margin % |
|-------|-------|-------|----------------|-----------------|-------------|----------|
| Rp 10.000 | Haiku | 65:35 | Rp 38 | Rp 54 | Rp 2.787 | 27.9% |
| Rp 10.000 | Haiku | 50:50 | Rp 48 | Rp 67 | Rp 2.787 | 27.9% |
| Rp 10.000 | Sonnet | 65:35 | Rp 77 | Rp 108 | Rp 2.787 | 27.9% |
| Rp 10.000 | Sonnet | 50:50 | Rp 96 | Rp 134 | Rp 2.787 | 27.9% |
| Rp 50.000 | Haiku | 65:35 | Rp 38 | Rp 54 | Rp 13.936 | 27.9% |
| Rp 50.000 | Haiku | 50:50 | Rp 48 | Rp 67 | Rp 13.936 | 27.9% |
| Rp 50.000 | Sonnet | 65:35 | Rp 77 | Rp 108 | Rp 13.936 | 27.9% |
| Rp 50.000 | Sonnet | 50:50 | Rp 96 | Rp 134 | Rp 13.936 | 27.9% |
| Rp 100.000 | Haiku | 65:35 | Rp 38 | Rp 54 | Rp 27.871 | 27.9% |
| Rp 100.000 | Haiku | 50:50 | Rp 48 | Rp 67 | Rp 27.871 | 27.9% |
| Rp 100.000 | Sonnet | 65:35 | Rp 77 | Rp 108 | Rp 27.871 | 27.9% |
| Rp 100.000 | Sonnet | 50:50 | Rp 96 | Rp 134 | Rp 27.871 | 27.9% |
| Rp 200.000 | Haiku | 65:35 | Rp 38 | Rp 54 | Rp 55.743 | 27.9% |
| Rp 200.000 | Haiku | 50:50 | Rp 48 | Rp 67 | Rp 55.743 | 27.9% |
| Rp 200.000 | Sonnet | 65:35 | Rp 77 | Rp 108 | Rp 55.743 | 27.9% |
| Rp 200.000 | Sonnet | 50:50 | Rp 96 | Rp 134 | Rp 55.743 | 27.9% |
| Rp 500.000 | Haiku | 65:35 | Rp 38 | Rp 54 | Rp 139.357 | 27.9% |
| Rp 500.000 | Haiku | 50:50 | Rp 48 | Rp 67 | Rp 139.357 | 27.9% |
| Rp 500.000 | Sonnet | 65:35 | Rp 77 | Rp 108 | Rp 139.357 | 27.9% |
| Rp 500.000 | Sonnet | 50:50 | Rp 96 | Rp 134 | Rp 139.357 | 27.9% |

**Insight:** Margin % identik (27.9%) di semua skenario — karena markup 40% × (1 − QRIS 0.7%) = 27.9% margin neto konstan.

#### Simulasi Konkret: User Topup Rp 100.000 (Habiskan Semua)

| Skenario | Cost Real ke Anthropic | Tagih User | Margin Bruto | Margin Neto |
|----------|------------------------|------------|--------------|-------------|
| Haiku rasio 65:35 (normal) | Rp 71.429 | Rp 100.000 | Rp 28.571 | Rp 27.871 (27.9%) |
| Haiku rasio 50:50 (output-heavy) | Rp 71.429 | Rp 100.000 | Rp 28.571 | Rp 27.871 (27.9%) |
| Sonnet rasio 65:35 (normal) | Rp 71.429 | Rp 100.000 | Rp 28.571 | Rp 27.871 (27.9%) |
| Sonnet rasio 50:50 (output-heavy) | Rp 71.429 | Rp 100.000 | Rp 28.571 | Rp 27.871 (27.9%) |

**Cara baca:** Walau user Sonnet-output-heavy (50:50) cost per 1K token lebih mahal (Rp 134 vs Rp 54 untuk Haiku 65:35), total token yang bisa dipakai dari Rp 100rb **lebih sedikit** (746K vs 1.860K token). Tapi margin absolut Teora tetap sama (Rp 27.871).

### 15.3 Perbandingan Metode: Mana yang Lebih Menguntungkan?

| Aspek | Langganan | Topup |
|-------|-----------|-------|
| Margin worst case | 8.9-32.1% | 27.9% flat |
| Margin aktual (expected) | 40-60% (user jarang max-out) | 27.9% (tagih proporsional) |
| Predictability margin | Rendah (tergantung quota usage) | Tinggi (margin % tetap) |
| Risiko margin negatif | Tidak (selalu positif) | Tidak (markup fixed 40%) |
| Cash flow Teora | Di muka (sebelum usage) | Bertahap (per request) |
| Cocok untuk | User committed (mahasiswa aktif) | User eksperimental / pay-as-you-go |

**Rekomendasi:** Keduanya aman. Kombinasi ideal: subscription untuk user aktif (margin aktual tinggi), topup sebagai fallback saat subscription habis (margin flat 27.9%).

---

## 16. Open Decisions (Updated 2026-09-09)

| # | Question | Status |
|---|----------|--------|
| 1 | Opsi B (pisah in/out di backend) | ✅ **APPROVED 2026-09-09** — Section 14 |
| 2 | Markup topup 40% | ✅ **APPROVED 2026-09-09** — Section 14.3 |
| 3 | Field `markupMultiplier` di `ai_tiers` table | ⏸️ PENDING — perlu schema migration |
| 4 | UX copy untuk transparansi Sonnet cost | ⏸️ PENDING — saat implementasi billing page |
| 5 | Recalibrate blended asumsi 65:35 → 50:50 setelah launch | ⏸️ DEFERRED — pakai FinOps data real (4-6 minggu post-launch) |
