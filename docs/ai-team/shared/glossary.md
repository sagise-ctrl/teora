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
