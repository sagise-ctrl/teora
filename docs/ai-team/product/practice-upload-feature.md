# Practice Upload Feature — AI Team Discussion Summary

> **Tanggal:** 2026-09-04
> **Status:** Discussion complete — pending owner approval
> **Full report:** `.ai/practice-upload-discussion.md` (486 lines)

## Overview

Discussion about expanding Practice menu with upload capability — user uploads PDF/photo → Teora generates quiz with multi-dimensional scoring + progress tracking.

**Core differentiator:** bukan ChatGPT dengan upload, bukan Quizizz dengan gamifikasi. Ini adalah **"Teora mengingat apa yang sudah kamu pelajari dan menunjukkan di mana kamu越来越 kuat atau justru需要 lebih latihan."**

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scoring dimensions | 3-dimension (Konsep/Penerapan/Analisis) | Simplified Bloom, reliable AI generation, clean UX |
| PDF parsing | `unpdf` | Pure JS, zero native deps, Vercel-compatible |
| OCR (images) | Google Cloud Vision API | Indonesian + handwriting support, $1.50/1K |
| OCR fallback | Gemini 2.5 Flash | $0.34/1K, multimodal, messy notes |
| Spaced repetition | FSRS | 20-30% more efficient than SM-2 |
| Chart library | Recharts | Tree-shakable, React-idiomatic |
| Upload bypass | Supabase Storage signed URL | Vercel 4.5MB body limit |
| Mastery levels | Belum → Belajar → Terbiasa → Menguasai | Khan Academy-inspired |

## Cost

**~$0.12/user/month** — negligible margin impact.

## Effort

- Fase 1 (Foundation): 20 days
- Fase 2 (Progress tracking): 14 days  
- Fase 3 (Advanced): 16 days

## Open Questions (Owner)

1. Skip OCR → feed image directly to multimodal LLM?
2. Free tier access to upload?
3. Storage retention policy?
4. Mastery challenge UX (pop-up vs tab)?

## Related

- DECISION 013 — Practice Menu + Learning Activity System
- Feature taxonomy: F4 Assessment & Learning
- `.ai/practice-upload-discussion.md` — full 486-line report
