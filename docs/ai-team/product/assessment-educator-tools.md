# Assessment Educator Tools

> **Tanggal:** 2026-09-04
> **Status:** Discussion complete — saved for future reference
> **Full report:** `.ai/assessment-educator-discussion.md`

## Overview

Assessment menu = educator tools untuk pengajar (dosen/akademisi). Berbeda dari Practice = student self-test.

## Vision

Pengajar bisa bikin kuis, sebarkan via link/QR/print, terima submission digital maupun foto jawaban kertas, grading dengan bantuan AI, dan tracker semua submission.

## Distribution Methods

| Method | How it works |
|--------|-------------|
| Link Share | Share URL → student answers digital → auto-submit |
| QR Code | Scan QR with phone → answer in mobile browser → auto-submit |
| Print/Cetak | Print quiz → student answers on paper → photo upload → AI extract → teacher review |

## Key Features

- Assessment Builder (standalone quiz, not linked to project)
- Share link + QR code generation
- Quiz to PDF/Print
- Photo answer upload + AI OCR extraction
- AI-assisted grading review
- Submission tracker dashboard

## Effort

~15-18 days untuk educator quiz lengkap (semua distribution method).

## Related

- Practice Upload: `docs/ai-team/product/practice-upload-feature.md`
- Feature Taxonomy: F4 Assessment & Learning
- Backend routes: `quizzes.ts`, `rubrics.ts`
