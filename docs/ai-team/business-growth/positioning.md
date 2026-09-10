# Brand Positioning — Teora

## Current State

Teora sudah final memilih dual-segment positioning (Option E) per 2026-09-09 — mahasiswa DAN pengajar, fokus pada menemani proses belajar dan mengajar (bukan output). DECISION 017 di `.ai/decisions.md`.

## Positioning Options

### Option A: "AI Academic Workspace for Indonesia"

**Tagline:** "Bikin skripsi smarter, bukan harder"

**Positioning statement:**
"Teora adalah AI workspace pertama di Indonesia yang memahami format skripsi lokal — dari outline sampai sitasi, semua dalam satu tempat."

| Dimension | Positioning |
|-----------|-------------|
| Target | Pelajar Indonesia (skripsi, tesis, paper) |
| Differentiation | Thesis-specific + lokal format + bahasa Indonesia |
| Competitor distance | Far from Jenni (Western), Ruangguru (K-12) |
| Emotional hook | "Nggak lagi sendirian lawan skripsi" |

**Pros:**
- Specific niche, underserved
- Indonesian-specific differentiates from global tools
- Thesis emotional pain point is strong

**Cons:**
- Narrow scope — limits expansion
- Requires localization investment

---

### Option B: "AI Writing Tutor, Not Just a Writer"

**Tagline:** "Belajar menulis, bukan cuma hasil akhir"

**Positioning statement:**
"Teora nggak cuma menulis untukmu — ia mengajarimu menulis. Dengan Socratic hints, self-reflection, dan progress tracking."

| Dimension | Positioning |
|-----------|-------------|
| Target | Pelajar yang mau improve, bukan cuma submit |
| Differentiation | Learning-first vs output-first |
| Competitor distance | Far from all competitors (none do this) |
| Emotional hook | "Duduk, belajar, grow" |

**Pros:**
- True differentiation — no competitor does this
- Appeals to academic integrity (learning, not cheating)
- Differentiation is defensible

**Cons:**
- Positioning is abstract
- "Learning" harder to measure than "hours saved"

---

### Option C: "AI Partner for Every Academic Journey"

**Tagline:** "Dari tugas pertama sampai skripsi terakhir"

**Positioning statement:**
"Teora menemani perjalanan akademik dari awal sampai akhir — mengerjakan tugas, mengelola referensi, menulis paper, dan menyusun skripsi."

| Dimension | Positioning |
|-----------|-------------|
| Target | Broad academic audience |
| Differentiation | Full journey, not one-off tool |
| Competitor distance | Not as far (Jenni has "lifetime" narrative) |
| Emotional hook | "Dari awal sampai lulus, Teora di sisimu" |

**Pros:**
- Broad appeal
- Encourages long-term usage

**Cons:**
- Positioning too broad
- Loses differentiation

---

### Option D: "AI Citation & Reference Intelligence"

**Tagline:** "Sitasi benar, skripsi kuat"

**Positioning statement:**
"Teora memastikan setiap referensi valid, setiap sitasi sesuai format, dan setiap bibliografi siap submit."

| Dimension | Positioning |
|-----------|-------------|
| Target | Pelajar yang struggle dengan referensi |
| Differentiation | Citation-first, bukan writing-first |
| Competitor distance | Medium (Scite does this for research, not students) |
| Emotional hook | "Sitasi benar, dospem senang" |

**Pros:**
- Specific pain point
- Citation validation is a proven value prop (Scite validates it)

**Cons:**
- Narrow
- Citation alone may not justify subscription

---

### ✅ Option E: "Asisten AI untuk Belajar dan Mengajar" — FINAL 2026-09-09

**Tagline:**
"Asisten AI yang menemani proses belajar dan mengajar: dari memahami materi sampai menyiapkan penilaian."

**Positioning statement (paragraf lengkap):**
"Teora adalah asisten akademik berbasis AI yang menemani proses belajar dan mengajar. Untuk mahasiswa, Teora membantu memahami materi dan menyusun tugas hingga karya ilmiah lewat bimbingan bertahap, sambil mencatat riwayat belajar supaya bantuannya makin memahami kebutuhanmu. Untuk pengajar, Teora membantu menyiapkan soal, rubrik penilaian, dan materi ajar lebih cepat: supaya waktu bisa lebih banyak dipakai untuk hal yang memang butuh sentuhan pengajar sendiri."

| Dimension | Positioning |
|-----------|-------------|
| Target | Dual: mahasiswa Indonesia + pengajar (dosen/guru) |
| Differentiation | Process-focused (bukan output), bahasa Indonesia, dual-segment |
| Competitor distance | Far — tidak ada tool yang layani kedua segmen sekaligus |
| Emotional hook | "Menemani proses" — untuk mahasiswa: bimbingan bertahap, bukan hasil jadi. Untuk pengajar: "waktu bisa lebih banyak dipakai untuk hal yang memang butuh sentuhan pengajar sendiri" |
| Tier 3 hook | Pengajar = pintu masuk institusi (Tier 3 feature) |

**Pros:**
- **Dual segment eksplisit** — tidak ada opsi A/B/C/D yang menyebut pengajar. Ini pembeda unik yang juga menyiapkan jalan ke Tier 3 (institusi)
- **Process-focused** — pegang elemen dari Option B (menemani proses, bukan hasil akhir) yang paling sustainable
- **Emotional hook untuk pengajar** — "waktu bisa lebih banyak dipakai untuk hal yang memang butuh sentuhan pengajar sendiri" = USP yang tidak ada di tool manapun
- **Terbuka untuk Tier 3** — dosen = pintu masuk institusi

**Cons:**
- Lebih panjang dari tagline tunggal — perlu penyesuaian visual (hero bisa pakai 2 baris)
- "Menemani proses" butuh bukti UX (riwayat belajar, version history) untuk jadi kredibel — saat ini sudah ada tapi perlu di-promosikan

---

## Recommendation

**Option E (final 2026-09-09)** — dipilih owner untuk menjawab strategi multi-segment (pelajar + pengajar + implisit institusi).

| If Owner wants... | Choose |
|-------------------|--------|
| Single niche, fokus skripsi | ~~Option A~~ (rejected) |
| Writing tutor, learning-first | ~~Option B~~ (rejected) |
| Broad journey | ~~Option C~~ (rejected) |
| Citation intelligence | ~~Option D~~ (rejected) |
| **Dual segment + Tier 3 preparation** | **Option E** ✅ FINAL |

**AI Team recommendation: Option E** — menyelesaikan gap utama (tidak ada opsi existing yang eksplisit dual-segment) dan menyiapkan jalan ke Tier 3.

---

## Brand Identity Notes

Setelah Option E final, brand identity:

| Element | Teora Concept |
|---------|--------------|
| Tone | Supportive, process-oriented, Indonesian |
| Colors | (existing brand token — `brand` di index.css) |
| Voice | "Menemani proses" — bukan "selesaikan tugasmu" |
| Visual | Academic warmth, partner (bukan tool) |

---

## Last Updated

2026-09-09 — Option E dipilih owner sebagai positioning final. Apply di landing page (`artifacts/academic-workspace/src/pages/landing.tsx`) + meta tags (`index.html`). Lihat DECISION 017 di `.ai/decisions.md`.
