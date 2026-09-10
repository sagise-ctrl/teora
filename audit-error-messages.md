# Audit: Error Messages — Bahasa & User-Friendliness

> Date: 2026-09-04 | Scope: Backend API errors + Frontend error display

---

## Kategori Masalah

Semua error message backend — semuanya berbahasa Inggris. Frontend menampilkan `String(err)` langsung ke toast tanpa formatting.

---

## 1. BACKEND — Error Messages by File

### auth.ts (8 errors — semua English ❌)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 56 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis. Silakan login kembali."` |
| 66 | 404 | `"User not found"` | EN | `"Akun tidak ditemukan."` |
| 81 | 400 | `"access_token is required"` | EN | `"Token tidak ditemukan. Silakan login ulang."` |
| 88 | 401 | `"Invalid token"` | EN | `"Token tidak valid. Silakan login ulang."` |
| 139 | 400 | `"email and password are required"` | EN | `"Email dan password wajib diisi."` |
| 144 | 400 | `"Password must be at least 6 characters"` | EN | `"Password minimal 6 karakter."` |
| 149 | 500 | `"Auth not configured"` | EN | `"Fitur login belum tersedia. Hubungi administrator."` |
| 186 | 400 | `"An account with this email already exists"` | EN | `"Email sudah terdaftar. Gunakan email lain atau login."` |
| 189 | 400 | `authError.message` (raw Supabase) | EN | `"Gagal membuat akun. Silakan coba lagi."` |
| 194 | 500 | `"Failed to create user"` | EN | `"Gagal membuat akun. Silakan coba lagi."` |
| 229 | 500 | `"Failed to generate referral code"` | EN | `"Gagal membuat kode referral. Silakan coba lagi."` |
| 320 | 200 | `{ message: "Logged out" }` | EN | `remove` |
| 332 | 401 | `"No refresh token"` | EN | `"Sesi Anda habis. Silakan login kembali."` |
| 343 | 401 | `"Session expired"` | EN | `"Sesi Anda habis. Silakan login kembali."` |
| 355 | 200 | `{ message: "Token refreshed" }` | EN | `remove` |
| 361 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis. Silakan login kembali."` |

### messages.ts (7 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 64 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 74 | 400 | `"Tier tidak valid"` | ✅ ID | OK |
| 191 | 402 | `creditCheck.reason` | ✅ ID | OK |
| 192 | 500 | `"AI request failed. Silakan coba lagi."` | ✅ ID | OK |
| 52 | 400 | `parsed.error.message` (Zod) | EN | Zod error messages perlu di-translate |
| 29 | 400 | `params.error.message` (Zod) | EN | Zod error messages perlu di-translate |

### projects.ts (20+ errors — semua English ❌)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 43 | 400 | `query.error.message` (Zod) | EN | Zod → ID |
| 113 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 119 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses ke proyek ini."` |
| 140 | 400 | `parsed.error.message` | EN | Zod → ID |
| 185 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 190 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses ke proyek ini."` |
| 196 | 400 | `parsed.error.message` | EN | Zod → ID |
| 233 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 238 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses ke proyek ini."` |
| 252 | 400 | `params.error.message` | EN | Zod → ID |
| 262 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 267 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses ke proyek ini."` |
| 278 | 400 | `"Tier tidak valid"` | ✅ ID | OK |
| 556 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 561 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses ke proyek ini."` |
| 572 | 400 | `"Tier tidak valid"` | ✅ ID | OK |
| 672 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 677 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses ke proyek ini."` |
| 688 | 400 | `"Tier tidak valid"` | ✅ ID | OK |
| 717 | 400 | `"Silakan buat outline terlebih dahulu..."` | ✅ ID | OK |
| 731 | 409 | `"Dokumen sedang ditulis..."` | ✅ ID | OK |
| 888 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis."` |
| 981 | 500 | `"Gagal mengekspor dokumen"` | ✅ ID | OK |
| 989 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis."` |
| 1054 | 500 | `"Gagal mengekspor PDF"` | ✅ ID | OK |
| 1073 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis."` |
| 1099 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis."` |
| 1114 | 400 | `"accessMode must be one of..."` | EN | `"Mode akses tidak valid. Pilih: lihat, komentar, atau edit."` |
| 1160 | 404 | `"Share link not found"` | EN | `"Link berbagi tidak ditemukan."` |
| 1024 | 500 | `usersTable` compile error | CRASH | Fix import |

### references.ts (15+ errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 150 | 404 | `"Reference not found"` | EN | `"Referensi tidak ditemukan."` |
| 181 | 400 | `"references array is required..."` | EN | `"Daftar referensi wajib diisi."` |
| 186 | 400 | `"Maximum 100 references..."` | EN | `"Maksimal 100 referensi per tambah."` |
| 406 | 404 | `"Project not found"` | EN | `"Proyek tidak ditemukan."` |
| 417 | 400 | `"Tier tidak valid"` | ✅ ID | OK |
| 455 | 200 | `"Belum ada referensi..."` | ✅ ID | OK |
| 531 | 502 | `message` (raw) | EN | `"Layanan pencarian gagal. Silakan coba lagi."` |
| 551 | 400 | `"Identifier must be a valid DOI or ISBN..."` | EN | `"Identifier harus DOI atau ISBN yang valid."` |
| 558 | 404 | `` `No metadata found for this ${type.toUpperCase()}` `` | EN | `"Metadata tidak ditemukan untuk identifier ini."` |
| semua Zod | 400 | `params.error.message` | EN | Zod → ID |

### documents.ts (15+ errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 241 | 404 | `"No document yet"` | EN | `"Dokumen belum ada."` |
| 271 | 404 | `"Document not found"` | EN | `"Dokumen tidak ditemukan."` |
| 323 | 404 | `"Document not found"` | EN | `"Dokumen tidak ditemukan."` |
| 386 | 404 | `"Document not found"` | EN | `"Dokumen tidak ditemukan."` |
| 403 | 400 | `"Cannot delete the last document..."` | EN | `"Tidak bisa hapus dokumen terakhir. Hapus versi terlebih dahulu."` |
| semua Zod | 400 | `params.error.message` / `body.error.message` | EN | Zod → ID |

### learning-activities.ts (5 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 11 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis."` |
| 27 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis."` |
| 33 | 400 | `"topics must be a non-empty array"` | EN | `"Topik wajib diisi minimal 1."` |
| 84 | 401 | `"Unauthorized"` | EN | `"Sesi Anda habis."` |

### profile.ts (12 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 52 | 404 | `"User not found"` | EN | `"Akun tidak ditemukan."` |
| 74 | 400 | `"No fields to update"` | EN | `"Tidak ada data yang diubah."` |
| 93 | 404 | `"User not found"` | EN | `"Akun tidak ditemukan."` |
| 116 | 400 | `"File too large..."` | ✅ ID | OK |
| 117 | 400 | `"Invalid file type..."` | ✅ ID | OK |
| 138 | 500 | `"Storage not configured"` | EN | `"Layanan penyimpanan belum tersedia."` |
| 152 | 500 | `"Failed to upload avatar"` | ✅ ID | OK |
| 188 | 500 | `"Auth not configured"` | EN | `"Fitur login belum tersedia."` |
| 199 | 404 | `"User not found"` | EN | `"Akun tidak ditemukan."` |
| 210 | 401 | `"Incorrect password"` | ✅ ID | OK |
| 223 | 500 | `"Failed to delete account"` | ✅ ID | OK |

### comments.ts (10 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 106 | 400 | `"Invalid projectId or documentId"` | EN | `"ID proyek atau dokumen tidak valid."` |
| 110 | 404 | `"Comment not found"` | EN | `"Komentar tidak ditemukan."` |
| 119 | 403 | `"You can only edit your own comments"` | EN | `"Anda hanya bisa edit komentar sendiri."` |
| 123 | 400 | `"content must be a non-empty string"` | EN | `"Komentar tidak boleh kosong."` |
| 163 | 400 | `"Invalid projectId or commentId"` | EN | `"ID proyek atau komentar tidak valid."` |
| 181 | 404 | `"Comment not found"` | EN | `"Komentar tidak ditemukan."` |
| 187 | 403 | `"You can only delete your own comments"` | EN | `"Anda hanya bisa hapus komentar sendiri."` |

### attachments.ts (12 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 82 | 500 | `"Failed to upload file: " + uploadError.message` | EN | `"Gagal upload file. " + humanize(uploadError.message)` |
| 86 | 404 | `"Attachment not found"` | EN | `"Lampiran tidak ditemukan."` |
| 182 | 404 | `"Attachment not found"` | EN | `"Lampiran tidak ditemukan."` |
| 191 | 404 | `"File not found in storage"` | EN | `"File tidak ditemukan di penyimpanan."` |
| semua Zod | 400 | `params.error.message` | EN | Zod → ID |

### account-references.ts (20 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 56 | 400 | `"title is required"` | EN | `"Judul referensi wajib diisi."` |
| 117 | 400 | `"Invalid reference ID"` | EN | `"ID referensi tidak valid."` |
| 134 | 404 | `"Reference not found"` | EN | `"Referensi tidak ditemukan."` |
| 214 | 400 | `"Invalid reference ID"` | EN | `"ID referensi tidak valid."` |
| 229 | 404 | `"Reference not found"` | EN | `"Referensi tidak ditemukan."` |
| 245 | 400 | `"Invalid reference ID"` | EN | `"ID referensi tidak valid."` |
| 251 | 400 | `"projectId is required"` | EN | `"ID proyek wajib diisi."` |
| 268 | 404 | `"Account reference not found"` | EN | `"Referensi tidak ditemukan di pustaka Anda."` |
| 330 | 400 | `"dois array is required and cannot be empty"` | EN | `"Daftar DOI wajib diisi."` |
| 335 | 400 | `"Maximum 50 DOIs per import"` | EN | `"Maksimal 50 DOI per import."` |
| 335 | 400 | `err.message` (raw) | EN | `"Gagal import DOI. Silakan coba lagi."` |

### exports.ts (7 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 242 | 404 | `"No document to export"` | EN | `"Tidak ada dokumen untuk di-export."` |
| 315 | 400 | `"Missing filename"` | EN | `"Nama file wajib diisi."` |
| 321 | 400 | `"Invalid filename"` | EN | `"Nama file tidak valid."` |
| 330 | 404 | `"File not found"` | EN | `"File tidak ditemukan."` |
| 334 | 404 | `"File not found"` | EN | `"File tidak ditemukan."` |
| semua Zod | 400 | `params.error.message` | EN | Zod → ID |

### document-templates.ts (16 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 91 | 400 | `"Invalid template ID"` | EN | `"ID template tidak valid."` |
| 102 | 404 | `"Template not found"` | EN | `"Template tidak ditemukan."` |
| 112 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses."` |
| 161 | 400 | `"Invalid template ID"` | EN | `"ID template tidak valid."` |
| 179 | 404 | `"Template not found"` | EN | `"Template tidak ditemukan."` |
| 185 | 403 | `"System templates cannot be modified"` | EN | `"Template sistem tidak bisa diubah."` |
| 190 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses."` |
| 224 | 400 | `"Invalid template ID"` | EN | `"ID template tidak valid."` |
| 236 | 404 | `"Template not found"` | EN | `"Template tidak ditemukan."` |
| 242 | 403 | `"System templates cannot be deleted"` | EN | `"Template sistem tidak bisa dihapus."` |
| 247 | 403 | `"Access denied"` | EN | `"Anda tidak memiliki akses."` |
| semua Zod | 400 | `parsed.error.message` | EN | Zod → ID |

### balance.ts (3 errors)

| Line | Status | Current | Bahasa | Perbaikan |
|------|--------|---------|--------|-----------|
| 57 | 400 | `"tierId diperlukan"` | ✅ ID | OK |

### activities.ts, jobs.ts, metadata.ts, admin.ts, admin-ai-tiers.ts

Semua `params.error.message` (Zod) — perlu translate. Admin errors "Internal server error" — perlu translate.

---

## 2. FRONTEND — Error Display Patterns

### Problem: `String(err)` langsung ke toast

Contoh dari `project.tsx`:
```typescript
onError: (err) => toast({ title: "Failed to create", description: String(err), variant: "destructive" }),
```

`err` di TanStack Query mutation adalah **raw response body** dari backend. Kalau backend kirim `{ error: "Unauthorized" }`, toast menampilkan `"[object Object]"` atau `"Unauthorized"` (English).

### Mix Bahasa di Title

| Title | File | Bahasa |
|-------|------|--------|
| `"Gagal"` | project.tsx:946 | ✅ ID |
| `"Gagal mengubah setting"` | project.tsx:441 | ✅ ID |
| `"Failed to create"` | project.tsx:204 | ❌ EN |
| `"Failed to rename"` | project.tsx:222 | ❌ EN |
| `"Failed to delete"` | project.tsx:240 | ❌ EN |
| `"Failed to add"` | project.tsx:1588, 1644 | ❌ EN |
| `"Upload failed"` | project.tsx:1964 | ❌ EN |
| `String(err)` sebagai title | profile.tsx:80 | ❌ raw EN |

### Pattern yang BENAR (sebagai reference)

```typescript
onError: (err) => {
  const msg = typeof err === 'string' ? err
    : err?.error || err?.message || 'Terjadi kesalahan';
  toast({ title: "Gagal", description: msg, variant: "destructive" });
}
```

---

## 3. ZOD VALIDATION — Root Cause

Setiap route yang pakai custom Zod wrapper (bukan inline) menghasilkan error seperti:
```json
{ "error": "Expected string, received undefined at 'title'" }
```

Ini technical Zod message — perlu translate. Pattern yang ditemukan di banyak route:
```typescript
res.status(400).json({ error: params.error.message });
res.status(400).json({ error: parsed.error.message });
res.status(400).json({ error: body.error.message });
```

### Solution: Centralized Zod error translator

Buat utility function untuk convert Zod errors ke Indonesian:

```typescript
function zodToIndonesian(error: ZodError): string {
  const issues = error.issues.map(issue => {
    const field = issue.path.join('.');
    switch (issue.code) {
      case 'invalid_type': return `Field "${field}" harus ${issue.expected}`;
      case 'required': return `Field "${field}" wajib diisi`;
      case 'too_small': return `Field "${field}" terlalu pendek`;
      case 'too_big': return `Field "${field}" terlalu panjang`;
      case 'invalid_string': return `Field "${field}" format tidak valid`;
      default: return issue.message; // fallback
    }
  });
  return issues.join('. ');
}
```

---

## 4. RAW SUPABASE / EXTERNAL ERRORS

Beberapa tempat echo raw Supabase messages:
- `authError.message` di auth.ts:189
- `uploadError.message` di attachments.ts:82
- Raw Zod messages di semua validation points

**Rule:** Semua external error HARUS di-wrap dengan user-friendly message Indonesia.

---

## 5. ERROR HANDLING MIDDLEWARE

Tidak ada centralized error handler. Semua error di-handle ad-hoc per route.

**Saran:** Tambahkan Express error middleware di `src/middlewares/`:
```typescript
app.use((err: Error, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    logger.error({ err, path: req.path });
    res.status(500).json({ error: "Terjadi kesalahan. Silakan coba lagi." });
  } else {
    res.status(500).json({ error: err.message });
  }
});
```

---

## Summary: Count

| Kategori | Count | Status |
|----------|-------|--------|
| English error messages (backend) | ~120 | ❌ Perlu translate |
| Already Indonesian (backend) | ~25 | ✅ OK |
| `String(err)` pattern (frontend) | ~30 | ❌ Perlu fix |
| Mixed EN/ID titles (frontend) | ~10 | ❌ Perlu fix |
| Raw external errors echoed | ~5 | ❌ Perlu wrap |
| No error middleware | 1 | ❌ Perlu tambah |

**Total: ~160 error messages perlu diperbaiki.**

---

*Audit: 2026-09-04 | Scope: backend API routes + frontend error toasts*
