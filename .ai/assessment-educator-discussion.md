# Assessment Menu — Educator Tools Discussion

> **Tanggal:** 2026-09-04
> **Participants:** Owner + AI Engineering Team
> **Status:** Discussion complete — saved for future reference

---

## Core Design Decision

**Assessment = Educator Tools**, berbeda dari Practice = Student Self-Test.

- **Practice** → pelajar (self-test dari materi sendiri)
- **Assessment** → pengajar (bikin kuis untuk mahasiswa)

---

## Target User

Pengajar (dosen, akademisi) yang mau:
1. Bikin kuis untuk mahasiswa
2. Sebar via link / QR / print
3. Terima submission digital maupun foto jawaban kertas
4. Grading dengan bantuan AI
5. Tracker: siapa sudah submit, nilai apa

---

## Assessment Flow (Vision)

```
Pengajar bikin kuis
        │
        ├── Pilihan distribusi:
        │     │
        │     ├── [🔗 Link] → Bagikan ke Teora
        │     │               Pelajar jawab digital → submit otomatis
        │     │
        │     └── [🖨️ Print] → Cetak soal
        │                     Pelajar jawab di kertas
        │                     │
        │                     ├── [📷 Foto] → Upload jawaban ke Teora
        │                     │               AI extract jawaban dari foto
        │                     │               Pengajar koreksi bareng AI
        │                     │
        │                     └── [📱 QR Code] → Pelajar scan QR
        │                                     Jawab digital → submit otomatis
        │
        └── Tracker tetap ada:
              Semua submission masuk web (digital OR foto)
              Pengajar bisa lihat:
              ├─ Siapa sudah upload jawaban
              ├─ Nilai (dari AI-assisted grading)
              └─ Download hasil
```

---

## Distribution Methods

### 1. Link Share
- Pengajar bagi link: `teora.com/quiz/abc123`
- Pelajar buka di browser → jawab digital → submit
- Langsung masuk tracker

### 2. QR Code
- Hybrid approach: siswa scan QR pakai HP
- Tidak perlu komputer, cukup HP
- Jawab di browser mobile → submit otomatis
- Langsung masuk tracker

### 3. Print/Cetak
- Generate soal dalam format PDF printable
- Siswa jawab di kertas
- Setelah selesai:
  - **Foto jawaban** → upload ke Teora
  - AI extract jawaban dari foto
  - Pengajar review + approve AI extraction
  - Masuk tracker dengan hasil

---

## Submission Tracker

Pengajar buka dashboard bisa lihat:

| Metric | Deskripsi |
|--------|-----------|
| Total submission | Berapa orang sudah submit |
| Completion rate | Sudah/Belum dari total target |
| Nilai rata-rata | Distribusi nilai |
| Soal sering salah | Analytics per soal |
| Download hasil | Export CSV/PDF |

---

## Photo Answer Extraction

### Flow
1. Siswa foto lembar jawaban
2. Upload foto ke Teora
3. AI extract jawaban → struct (mapping: soal #1 = "B", soal #2 = "A")
4. AI bandingkan dengan kunci jawaban
5. Pengajar review hasil AI:
   - Accept suggestion
   - Edit manually jika AI salah
6. Nilai masuk tracker

### Technical Challenge
- OCR untuk handwriting Indonesia (kombinasi cetak + tulisan tangan)
- Layout detection: mapping jawaban ke nomor soal
- Confidence scoring: AI tandai jika tidak yakin

---

## AI-Assisted Grading

### MCQ (Multiple Choice)
- AI bandingkan jawaban siswa vs kunci
- Auto-grade langsung

### Essay/Short Answer
- AI extract keywords dari jawaban
- Matching dengan rubric keywords
- Pengajar review + approve

### Photo Answer
- OCR → struct → bandingkan dengan kunci
- Pengajar koreksi bareng AI

---

## Effort Estimate

| Fitur | Effort | Catatan |
|-------|--------|---------|
| Assessment Builder (pengajar) | ~3-4 days | Bikin kuis + share link + QR |
| Quiz to PDF/Print | ~2 days | Generate printable version |
| Photo answer upload + AI extract | ~4-5 days | OCR + AI answer matching |
| AI-assisted grading review | ~2 days | Pengajar approve/edit AI extraction |
| Submission tracker | ~2 days | Dashboard submission per kuis |
| Analytics (distribusi nilai, soal sering salah) | ~2 days | Charts + stats |

**Total: ~15-18 days** untuk educator quiz yang lengkap.

---

## Quiz Type

- **Standalone** — tidak terkait dengan project Teora
- Bikin kuis langsung tanpa hubungannya dengan Task Mentor
- Pengajar sebagai educator role, bukan learner role

---

## Spec Reference

Lihat: `docs/ai-team/product/user-dashboard.md` section "Assessment — Fitur untuk Pengajar"

---

## Related

- Practice Upload: `.ai/practice-upload-discussion.md` + `docs/ai-team/product/practice-upload-feature.md`
- Feature Taxonomy: F4 Assessment & Learning (docs/ai-team/product/feature-taxonomy.md)
- Existing backend: `artifacts/api-server/src/routes/quizzes.ts`, `rubrics.ts`
