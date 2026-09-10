# AI Team Discussion Report: Practice Upload — Kuis Multi-Parameter dengan Progress Tracking

> **Tanggal:** 2026-09-04
> **Participants:** AI Engineering Team (claude-opus-4-8, model research agents)
> **Request:** Owner asked: "fitur kuis yang menarik dengan parameter penilaian dan hasil yang memperlihatkan beberapa parameter pemahaman, serta riwayat quiz serta ada semacam riwayat progres perkembangan user di suatu materi"
> **Research basis:** 2 agent完成 — quiz scoring best practices (Bloom's taxonomy, spaced repetition, learning analytics) + OCR tech stack (Google Vision, Gemini Flash, Tesseract.js, unpdf)

---

## 1. Vision — Apa yang Membuat Fitur Ini Berbeda

**Posisi:** Bukan ChatGPT dengan upload file. Bukan Quizizz dengan gamifikasi.

**Differentiator utama:**

> **"Teora mengingat apa yang sudah kamu pelajari dan menunjukkan di mana kamu越来越 kuat atau justru需要 lebih latihan."**

User upload materi (PDF, foto catatan, screenshot buku) → Teora generate kuis otomatis → jawab → lihat hasil bukan sekadar "8/10 benar" tapi **"Pemahaman Konsep: 90%, Penerapan: 60%, Analisis: 30%"** → lihat progression seiring waktu per materi →哪天 perlu review,哪天 sudah kuasai.

Ini berbeda dari:
- **Quizizz/Kahoot** — gamifikasi live, bukan self-paced progress tracking
- **Anki** — flashcards tanpa multi-parameter scoring, tanpa visualisasi progres
- **NotebookLM** — quiz + flashcard, tapi tanpa riwayat per-materi jangka panjang
- **ChatGPT** — upload file, tanya apa aja, tidak ada scoring, tidak ada progres

---

## 2. Sistem Penilaian Multi-Dimensi

### 2.1 Dimensi yang Dianyam (Simplified Bloom's Taxonomy)

Dari riset, **6 level Bloom terlalu kompleks** untuk MVP — AI generation quality drop tajam di level tinggi (Analyze/Evaluate/Create). Pakai **3 dimensi** yang work untuk auto-grading dan reliable generation:

| Dimensi UI | Level Bloom | Artinya | Contoh | Tipe Auto-Grade |
|------------|-------------|---------|--------|-----------------|
| **Pemahaman Konsep** | Remember + Understand | Recall definisi, teori, fakta | "Apa itu triangulasi?" | Multiple Choice |
| **Penerapan** | Apply | Hitung, implementasi, kasus baru | "Hitung p-value dari data berikut" | MC + Numeric |
| **Analisis** | Analyze + Evaluate | Bandingkan, kritik, identifikasi | "Mana desain riset yang lebih valid? Justifikasi." | MC + Short Answer (LLM-judge) |

**Mengapa 3 dimensi (bukan 6):**
- AI generation paling reliable untuk level rendah-menengah
- User-facing UX lebih clean — radar chart 3-axis readable, 6-axis overwhelm
- Schema extensible: enum `bloom_level` di database sudah support semua 6 level jika nanti mau expand

**Output yang user lihat setelah kuis:**

```
┌─────────────────────────────────────────────┐
│  Kuis: Metodologi Riset Kualitatif         │
│                                             │
│  📊 Skor Anda: 7/10  (70%)                 │
│                                             │
│  Pemahaman Konsep    ████████████░░  90%   │
│  Penerapan           ██████░░░░░░░░  60%   │
│  Analisis            ███░░░░░░░░░░░  30%   │
│                                             │
│  💡 Insight: "Kemampuan Analisis Anda        │
│     paling perlu diasah. Coba pelajari       │
│     lagi Bab 3 tentang validitas."           │
│                                             │
│  [Ulas Pengerjaan]  [Coba Lagi]  [Materi] │
└─────────────────────────────────────────────┘
```

### 2.2 Schema Database yang Dibutuhkan

Extending sistem yang sudah ada:

```typescript
// practice_materials (tabel baru) — uploaded source material
practiceMaterialsTable = {
  id: serial PK,
  userId: text FK → users,
  title: text,
  fileUrl: text,           // Supabase Storage URL
  fileType: text,          // 'pdf' | 'image'
  extractedText: text,     // hasil OCR/parsing, max ~100KB
  ocrBackend: text,        // 'google_vision' | 'gemini_flash' | 'unpdf'
  ocrConfidence: number,    // 0-1, untuk tracking quality
  topics: text,             // JSON array, auto-extracted atau user-defined
  pageCount: integer,       // untuk estimasi
  createdAt: timestamp,
}

// practice_quizzes (extends existing) — hasil kuis dari material
practiceQuizzesTable = {
  id: serial PK,
  materialId: integer FK → practice_materials,
  title: text,
  questionCount: integer,
  difficulty: enum('easy','medium','hard'),
  // existing schema: questions JSONB dengan bloom_level tag
  createdAt: timestamp,
}

// practice_attempts (extends existing) — attempt per user per quiz
practiceAttemptsTable = {
  id: serial PK,
  userId: text FK,
  quizId: integer FK,
  startedAt: timestamp,
  completedAt: timestamp,
  totalScore: number,
  maxScore: number,
  // dimensi scoring baru
  perDimensionScore: jsonb, // {concept: 0.9, application: 0.6, analysis: 0.3}
  timeSpentSeconds: integer,
  answers: jsonb, // [{questionId, userAnswer, isCorrect, dimension}]
}

// practice_progress (tabel baru) — agregasi per user per topic/materi
practiceProgressTable = {
  id: serial PK,
  userId: text FK,
  materialId: integer FK,
  // agregasi
  attemptsCount: integer,
  averageScore: number,
  perDimensionAvg: jsonb,    // running average per dimensi
  masteryLevel: enum('belum','belajar','terbiasa','menguasai'),
  // spaced repetition
  nextReviewAt: timestamp,   // FSRS schedule
  easeFactor: number,        // FSRS param, default 2.5
  stability: number,        // FSRS param — memory strength
  lastAttemptAt: timestamp,
  streakDays: integer,      // consecutive days practice
  masteredAt: timestamp,
}
```

### 2.3 Mastery Levels (Khan Academy-inspired)

| Level | Kondisi |
|-------|---------|
| **Belum Belajar** | 0 attempt |
| **Sedang Belajar** | 1-2 attempts, accuracy masih naik-turun |
| **Terbiasa** | 3+ attempts, average accuracy ≥ 70% |
| **Menguasai** | 5+ consecutive attempts, accuracy ≥ 80% per dimensi |

**Mastery Challenge (Khan style):** Saat user sudah "Terbiasa" tapi belum "Menguasai" — muncul challenge otomatis untuk membuktikan mastery. Meningkatkan engagement tanpa gamification berlebihan.

---

## 3. Upload Pipeline — Teknis End-to-End

### 3.1 Alur Upload

```
[User klik "Upload Materi"]
        │
        ├── Pilih file: PDF / JPG / PNG / foto catatan
        │     max 10MB per file
        │
        ├── Upload langsung ke Supabase Storage
        │     (bypass Vercel 4.5MB body limit)
        │     signed URL dari backend
        │
        ├── Backend trigger: extract text
        │     │
        │     ├── PDF (text-based) → unpdf (pure JS, zero native deps)
        │     ├── PDF (scanned/image) → Google Cloud Vision API
        │     ├── JPG/PNG → Google Cloud Vision API
        │     │     confidence < 0.7? → Gemini 2.5 Flash Vision fallback
        │     │
        │     └── Tesseract.js (optional, browser-side preview)
        │           → tampilkan "best effort" instantly, free
        │
        ├── User review extracted text
        │     "Teks sudah sesuai? Ya / Koreksi manual"
        │
        ├── AI extract topics dari text
        │     (Groq Llama 3.3 70B, ~500 token input)
        │
        ├── User pilih: "Generate Kuis" + atur difficulty + jumlah soal
        │
        └── AI generate quiz
              chunk per 2000 token, prompt dengan Bloom distribution
              validate output (LLM-as-Judge pass kedua)
              save to database
```

### 3.2 Teknis Extraction Detail

**PDF Text (printable text):**
- Library: `unpdf` (UnJS, pure JS, aktif dimaintain, Vercel-compatible)
- Bukan `pdf-parse` (unmaintained) atau `pdfjs-dist` (browser-first, complex setup)
- Zero native deps — cold start cepat

**OCR untuk Image / Scanned PDF:**
- Primary: **Google Cloud Vision API** — $1.50/1,000 images, supports Bahasa Indonesia, native handwriting detection, sync API (0.5-2s latency)
- Fallback: **Gemini 2.5 Flash Vision** — $0.34/1,000 images, multimodal (tangan berantakan + glare + perspektif), lebih murah tapi perlu context
- Skip: Tesseract.js (bundle ~50MB → Vercel Function limit exceeded), AWS Textract (Indonesian support lemah), Azure (async polling → UX buruk)

**Critical Vercel constraint:**
- Vercel Function body limit: **4.5MB** per request
- Solusi: **Direct upload ke Supabase Storage** (bypass Vercel body) → backend terima signed URL → process async

**Optional Tesseract.js preview:**
- Browser-side only, ~200KB core + ~5MB Indonesian trained data
- Tampilkan "best effort" text instantly (gratis, tanpa nunggu API)
- Tetap proses Google Vision untuk akurasi final

### 3.3 AI Quiz Generation Pipeline

```
Extracted text (~2,000-50,000 token tergantung materi)
        │
        ├── Chunk: per 2,000 token, 200 token overlap (preserve context)
        │     metadata: heading, page number, chapter
        │
        ├── Per chunk → AI prompt:
        │   "Generate 5 pertanyaan pilihan ganda dari teks berikut.
        │    Distribusi:
        │    - 2 Pemahaman Konsep (definisi, teori)
        │    - 2 Penerapan (hitung, contoh kasus)
        │    - 1 Analisis (bandingkan atau kritik)
        │    JSON: {questions: [{prompt, options A-D, correct_index,
        │         bloom_level, difficulty, explanation}]}
        │    Bahasa: Indonesia"
        │
        ├── Aggregate semua chunk → deduplicate similar questions
        │
        ├── Quality gate (LLM-as-Judge pass kedua):
        │   - Exactly 1 correct answer?
        │   - 4 distinct options?
        │   - Correct answer match source text?
        │   - Indonesian naturalness?
        │   → Regenerate if fail
        │
        └── Save quiz + questions to DB
```

**LLM choice:**
- Free tier: Groq Llama 3.3 70B (sufficient untuk structured MCQ generation)
- Premium tier: Claude 3.5 Sonnet (lebih reliable untuk complex reasoning + structured output)
- Gemini 2.5 Flash bisa sebagai alternative (cheapest, cukup good)

---

## 4. Progress Tracking & Riwayat

### 4.1 Riwayat Quiz per User

Setiap attempt tersimpan dengan:
- Waktu attempt (tanggal, jam)
- Quiz yang diambil (dari materi apa)
- Total score + per-dimension breakdown
- Waktu pengerjaan
- Jawaban per soal + benar/salah

**UI:** Halaman "Riwayat Quiz" di Practice menu:
- List semua attempt, newest first
- Filter: per materi, per dimensi, per tanggal range
- Klik attempt → review jawaban + explanation

### 4.2 Progress per Materi

**Per-materi page:**
```
┌──────────────────────────────────────────────────────────┐
│ 📚 Metodologi Riset Kualitatif                           │
│ Uploaded 2026-09-01 · 12 attempt                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📈 Perkembangan Skor (30 hari)                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │    ╱╲        ╱╲         ╱╲                        │  │
│  │   ╱  ╲╱╲    ╱  ╲╱╲     ╱  ╲                       │  │
│  │  ╱       ╲╱╱       ╲╱╲╱     ╲╱╲╱                   │  │
│  │ 8/10    6/10    9/10    7/10                       │  │
│  └────────────────────────────────────────────────────┘  │
│  Sep 1   Sep 5   Sep 10   Sep 15   Sep 20               │
│                                                          │
│  📊 Profil Dimensi (rata-rata semua attempt)             │
│  ┌────────────────────────────────────────────────────┐  │
│  │      Konsep    Appl    Anal                      │  │
│  │         \     /│\     /                         │  │
│  │          \   / │ ╲   /                          │  │
│  │           \ /  │  ╲ /                           │  │
│  │            X    │   X                            │  │
│  │           / \   │  / ╲                           │  │
│  │          /   \  │ /   ╲                          │  │
│  │         /     \ │/     ╲                         │  │
│  │ Konsep 70%   Appl 65%   Anal 40%                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🔥 Streak: 7 hari berturut-turut                         │
│  🎯 Mastery: Terbiasa (avg 72%)                         │
│  ⏰ Review berikutnya: Besok (FSRS schedule)             │
│                                                          │
│  [Mulai Kuis Baru]  [Review Lemah]  [Lihat Detail]       │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Spaced Repetition (FSRS)

**FSRS (Free Spaced Repetition Scheduler)** — state-of-the-art, lebih efisien 20-30% dari SM-2 (Anki lama):

- Setiap item kuis yang user jawab salah → masuk FSRS review queue
- Jadwal下次 review dihitung dari: difficulty (D), stability (S), retrievability (R)
- Library: `simple-ts-fsrs` (pure TypeScript, cocok dengan stack Teora)
- User lihat: "Perlu review 8 kartu hari ini" di dashboard Practice

**Kenapa FSRS bukan SM-2:**
- FSRS research-based, continuously optimized dengan machine learning
- Lebih efisien (lebih sedikit review untuk hasil yang sama)
- Anki sudah adopsi FSRS sebagai default di v23+

### 4.4 Chart Library

**Recharts** — recommended:
- Tree-shakable, ~95KB (bukan yang terkecil tapi terbaik untuk React)
- `<LineChart>` → progress over time
- `<RadarChart>` → dimensi Bloom
- `<BarChart>` → per-topik comparison
- React-idiomatic, syntax natural dengan komponen Teora

---

## 5. Effort & Roadmap — 3 Fase

### Fase 1: Foundation (4-6 weeks)

**Goal:** User bisa upload PDF/foto → extract text → generate quiz → jawab → lihat skor

| Komponen | Effort | Notes |
|----------|--------|-------|
| Supabase Storage bucket untuk practice_materials + RLS | 1 hari | Already punya attachment bucket, extend |
| Upload UI (react-dropzone / shadcn Upload) | 2 hari | Drag & drop, preview, progress |
| Direct upload pipeline (signed URL) | 1 hari | Bypass Vercel body limit |
| unpdf integration (PDF text extraction) | 2 hari | Vercel-compatible, test on real PDFs |
| Google Cloud Vision API integration (OCR) | 2 hari | REST API, confidence check, Gemini fallback |
| AI topic extraction prompt | 1 hari | Groq prompt, extract 3-5 topics |
| AI quiz generation (chunking + Bloom prompt) | 3 hari | Complex prompt engineering |
| LLM-as-Judge quality gate | 2 hari | Pass kedua untuk validate output |
| Practice Quiz UI (answer questions) | 3 hari | Progress bar, timer, submit |
| Auto-grading (MCQ) + per-dimension scoring | 2 hari | Compute perDimensionScore JSONB |
| Attempt save + basic history list | 1 hari | Save to practice_attempts |

**Total Fase 1: ~20 hari kerja**

### Fase 2: Progress Tracking (3-4 weeks)

**Goal:** User lihat progres jangka panjang, bukan cuma skor per kuis

| Komponen | Effort | Notes |
|----------|--------|-------|
| practice_progress table + aggregation logic | 2 hari | Update on every attempt |
| Per-materi progress page (line chart + radar) | 3 hari | Recharts implementation |
| Mastery level transitions | 2 hari | Khan Academy-style logic |
| Streak counter | 1 hari | Count consecutive days |
| FSRS integration (simple-ts-fsrs) | 3 hari | TypeScript library, store state in DB |
| "Review Sekarang" tab (FSRS queue) | 2 hari | Items due today |
| Quiz retake (same quiz, new shuffle) | 1 hari | Shuffle questions + answers |

**Total Fase 2: ~14 hari kerja**

### Fase 3: Advanced (4-6 weeks)

**Goal:** Smarter, personalized, mastery challenges

| Komponen | Effort | Notes |
|----------|--------|-------|
| Mastery Challenges (Khan-style) | 3 hari | Auto-trigger saat dekat mastery |
| LLM-as-Judge untuk short-answer grading | 3 hari | Essay auto-grade via rubric |
| Short-answer rubric builder | 2 hari | User define criteria |
| Per-dimension deep analytics | 2 hari | Heatmap per Bloom level per user |
| Notification/reminder (FSRS due) | 2 hari | Email atau in-app |
| Multi-file upload (multiple PDFs) | 2 hari | Batch process |
| "Weak spots" auto-recommendation | 2 hari | AI suggest area perlu improvement |

**Total Fase 3: ~16 hari kerja**

---

## 6. Cost Impact

### Per User per Bulan (Estimasi)

Asumsi: 10 uploads/bulan, 5 quiz generated, 3 attempts, 5 images/quiz × 10 quiz/month

| Komponen | Volume | Unit Cost | Cost/User/Bulan |
|----------|--------|----------|-----------------|
| **PDF extraction** (unpdf) | 10 PDFs | $0 (local) | $0 |
| **OCR images** (Google Vision) | 50 images | $1.50/1K | $0.075 |
| **OCR fallback** (Gemini Flash) | ~5 fallback | $0.34/1K | $0.0017 |
| **AI topic extraction** (Groq L3.3) | 10 × 500 tok | ~$0.0005 | $0.005 |
| **AI quiz generation** (Groq L3.3) | 5 × 10K tok | ~$0.005 | $0.025 |
| **AI quality gate** (Groq L3.3) | 5 × 5K tok | ~$0.0025 | $0.0125 |
| **Storage** (Supabase) | 10 × 2MB | ~$0.02/GB | $0.0004 |
| **TOTAL** | | | **~$0.12/user/bulan** |

### vs Subscription Tiers

| Tier | Price | AI Cost Share | Margin Impact |
|------|-------|--------------|---------------|
| Gratis ($0) | $0 | ~$0.12 | Negative (subsidized ~$0.12) |
| Standar ($9.99) | $9.99 | ~$0.12 | $9.87 margin |
| Premium ($29.99) | $29.99 | ~$0.12 | $29.87 margin |

**Margin impact:** Minimal. Upload + OCR + quiz generation cost ~$0.12/user/bulan. Bahkan user Gratis yang cuma upload 1×/bulan costnya ~$0.01.

### Vercel Function Constraints

- **Body limit: 4.5MB** — solved via direct Supabase Storage upload
- **Cold start: ~2-5s** — unpdf + Vision API sync call
- **Execution time: 300s max** — cukup untuk quiz generation (~10-30s), tapi perlu async untuk dokumen besar

---

## 7. Key Technical Decisions

| Decision | Rekomendasi | Alasan |
|----------|-------------|--------|
| PDF parsing | `unpdf` | Pure JS, zero native deps, aktif dimaintain, Vercel-compatible |
| OCR primary | Google Cloud Vision API | Indonesian support kuat, handwriting detection, sync API, $1.50/1K |
| OCR fallback | Gemini 2.5 Flash Vision | $0.34/1K, multimodal, bagus untuk whiteboard/notes berantakan |
| Tesseract.js | Optional browser preview | Bundle 50MB → Vercel limit exceeded; kalau pakai, browser-side only |
| Upload bypass | Supabase Storage signed URL | Vercel 4.5MB body limit tidak cukup untuk file besar |
| SRS algorithm | FSRS (via simple-ts-fsrs) | 20-30% lebih efisien dari SM-2, TypeScript native |
| Bloom tagging | 3-level simplified (MVP) | AI generation reliable, UX clean, extensible |
| Chart library | Recharts | Tree-shakable, React-idiomatic, cukup untuk semua visualisasi |
| LLM quiz gen | Groq Llama 3.3 (free tier) → Claude Sonnet (premium) | Cost-effective, sufficient untuk MCQ structured output |
| Upload limit | 10MB per file | Cukup untuk dokumen akademik tipikal |

---

## 8. Risks & Open Questions

| Risk | Severity | Mitigation |
|------|---------|-----------|
| Google Vision tidak akurat untuk handwriting Indonesia | Medium | Gemini Flash fallback; manual correction UI; Tesseract preview |
| Quiz generation quality inconsistent | Medium | LLM-as-Judge quality gate; prompt iteration |
| User upload konten berhak cipta | Low | Disclaimer "untuk pembelajaran sendiri"; tidak simpan konten di luar DB |
| OCR cost balloon jika user abuse | Low | Rate limit per user (10 uploads/bulan); monitoring |
| Vercel cold start terlalu lambat | Low | Async processing untuk dokumen besar; streaming upload UI |
| Storage cost Supabase balloon | Low | Auto-cleanup materi lama (configurable retention) |

### Open Questions untuk Owner

1. **Should we skip OCR entirely and feed image directly to multimodal LLM?** — Cost lebih tinggi per token tapi eliminate pipeline step. Recommend: A/B test setelah MVP jalan.

2. **Storage retention policy?** — Berapa lama uploaded materials + extracted text disimpan? Default: 12 bulan, user bisa delete manual.

3. **Should free tier users bisa upload?** — Current Practice hanya dari Task Mentor. Kalau tambah upload, free tier dapat akses penuh atau limited (misal 3 upload/bulan)?

4. **Mastery challenge UX** — Should mastery challenge muncul sebagai "pop-up interrupt" atau "tab di pojok"? Khan-style interrupt meningkatkan engagement tapi bisa annoying.

---

## 9. Comparison: Practice Existing vs Practice Upload

| Aspek | Existing (DECISION 013) | New (Upload) |
|-------|------------------------|--------------|
| Source materi | Task Mentor projects (otomatis) | User upload (manual) |
| Topics | Auto-extract dari instruksi/referensi | Auto-extract dari uploaded file |
| Quiz generation | Dari konten Task Mentor project | Dari extracted text |
| Progress tracking | Per Learning Activity (per project) | Per uploaded material |
| Spaced repetition | Belum (future) | FSRS (Fase 2) |
| User baru | Ajakan ke Task Mentor | Bisa langsung upload tanpa Task Mentor |

**Kesimpulan:** Practice Upload bukan replacement — ini **expansion**. User yang belum punya Task Mentor project tetap bisa pakai Practice via upload. Existing DECISION 013 tetap berlaku untuk jalur Task Mentor.

---

## 10. Recommendation Summary

**Apakah worth untuk dibangun?**

**Ya.** Karena:

1. **Differentiator nyata** — bukan ChatGPT, bukan Quizizz. Progress tracking + multi-dimension scoring + spaced repetition adalah value proposition yang tidak ada di kompetitor Indonesia manapun untuk mahasiswa.

2. **Cost sangat rendah** — ~$0.12/user/bulan. Margin impact minimal terhadap subscription tiers.

3. **Infrastructure sudah ada** — Supabase Storage sudah ada (attachment upload), Drizzle schema extensible, AI integration sudah jalan.

4. **Engagement lever** — Streak + mastery challenge pattern terbukti di Khan Academy, Duolingo, Anki. Bukan gamifikasi berlebihan — fungsional.

5. **Cohesive dengan existing system** — reuse Supabase Storage, reuse AI integration, extend existing quiz schema, extend existing learning_activities logic.

**Risiko terbesar:** AI quiz generation quality consistency + OCR accuracy untuk handwriting Indonesia. Mitigation: quality gate + user correction step + fallback pipeline.

---

*Research sources: Bloom's Taxonomy (Anderson & Krathwohl 2001), Khan Academy Mastery docs, FSRS algorithm (open-spaced-repetition GitHub), Google Cloud Vision pricing, Recharts bundle analysis, Wayground/NotebookLM/Studyfetch feature analysis.*
