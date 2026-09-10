# Teora Frontend Error Message Audit

> Date: 2026-09-04 | Scope: User-facing error messages in frontend
> Analyzing: toast calls, error states, validation messages, API error responses

---

## ROOT CAUSE: `custom-fetch.ts` builds technical error messages

**File:** `artifacts/academic-workspace/src/lib/api-client-react/custom-fetch.ts:160-181`

`buildErrorMessage()` generates strings like:
- `"HTTP 401 Unauthorized"`
- `"HTTP 403 Forbidden — admin access required"`
- `"HTTP 404 Not found"`

These technical strings are passed directly to `String(err)` in toast descriptions, exposing:
1. HTTP status codes (401, 403, 404, 500, 502) to users
2. English-only messages (Unauthorized, Forbidden, Internal server error)
3. No user-friendly action guidance

---

## PART 1: Backend error responses (English + technical codes)

All of these flow through `custom-fetch.ts` and appear as `String(err)` in toasts.

### Authentication / Authorization

| Backend File | Current Message | Language | User-Friendly? |
|-------------|----------------|----------|----------------|
| `middlewares/auth.ts:46` | `"Unauthorized"` | EN | ❌ Should be "Sesi habis. Silakan login kembali." |
| `middlewares/auth.ts:82` | `"Invalid or expired token"` | EN | ❌ Should be "Sesi habis. Silakan login kembali." |
| `middlewares/owner.ts:20` | `"Forbidden — admin access required"` | EN | ❌ Should be "Anda tidak memiliki akses halaman ini." |
| `routes/usage.ts:192` | `"Admin access required"` | EN | ❌ Should be "Anda tidak memiliki akses halaman ini." |

### Common 404s

| File | Current Message | Fix |
|-------|----------------|-----|
| `routes/writing-style.ts:27` | `"No writing style profile found. Analyze your writing first."` | Already decent, translate: "Profil gaya penulisan belum ada. Analisis tulisan Anda terlebih dahulu." |
| `routes/shared.ts:17` | `"Invalid or expired share link"` | Already decent, translate: "Link berbagi tidak valid atau sudah kadaluarsa." |
| `routes/shared.ts:22` | `"Share link has expired"` | Translate: "Link berbagi sudah kadaluarsa." |
| `routes/shared.ts:32` | `"Project not found"` | Translate: "Proyek tidak ditemukan." |
| `ownership.ts:21,49,91` | `"Project not found"` | Translate: "Proyek tidak ditemukan." |
| `ownership.ts:26,68,110` | `"Access denied"` | Translate: "Anda tidak memiliki akses ke proyek ini." |
| `ownership.ts:115` | `"Viewers cannot modify content"` | Translate: "Peran viewer tidak dapat mengubah konten." |
| `routes/references.ts:150` | `"Reference not found"` | Translate: "Referensi tidak ditemukan." |
| `routes/references.ts:406` | `"Project not found"` | Translate: "Proyek tidak ditemukan." |
| `routes/rubrics.ts:34,196,241` | `"Rubric not found..."` | Translate to Indonesian |

### Validation Errors

| File | Current Message | Fix |
|-------|----------------|-----|
| `routes/writing-style.ts:48` | `"documents array is required with at least one document"` | ✅ Already in English, translate |
| `routes/writing-style.ts:59` | `"Tier tidak valid"` | ✅ Already ID |
| `routes/usage.ts:89` | `"Invalid period. Use: 7d, 30d, or all"` | Translate: "Periode tidak valid. Gunakan: 7d, 30d, atau all" |
| `routes/references.ts:518` | `"Query must be at least 3 characters"` | Translate: "Pencarian minimal 3 karakter" |
| `routes/references.ts:545` | `"identifier is required"` | Translate: "DOI atau ISBN harus diisi" |
| `routes/references.ts:551` | `"Identifier must be a valid DOI or ISBN-10/ISBN-13"` | Translate: "Harus berupa DOI atau ISBN-10/ISBN-13 yang valid" |
| `routes/references.ts:181` | `"references array is required and cannot be empty"` | Translate: "Daftar referensi tidak boleh kosong" |
| `routes/references.ts:186` | `"Maximum 100 references per bulk add"` | Translate: "Maksimal 100 referensi per sekali tambah" |
| `routes/rubrics.ts:17` | `"Invalid quizId"` | Translate: "ID kuis tidak valid" |
| `routes/rubrics.ts:84` | `"Tier tidak valid"` | ✅ Already ID |

### Server Errors

| File | Current Message | Fix |
|-------|----------------|-----|
| `routes/writing-style.ts:144` | `"Failed to analyze writing style"` | Translate: "Gagal menganalisis gaya penulisan" |
| `routes/rubrics.ts:173` | `"Failed to generate rubric"` | Translate: "Gagal membuat rubrik" |
| `routes/references.ts:531` | `"502 Bad Gateway"` (raw, via `message`) | Extract from CrossRef: "Layanan pencarian referensi sedang tidak tersedia" |
| `admin.ts:106,222,307,348,375,399` | `"Internal server error"` | Translate: "Terjadi kesalahan server. Silakan coba lagi." |

---

## PART 2: Frontend toast messages (mixed EN/ID)

### project.tsx — ENGLISH TOAST TITLES (need translation)

| Line | Current | Fix |
|------|---------|-----|
| 204 | `"Failed to create"` | "Gagal membuat dokumen" |
| 222 | `"Failed to rename"` | "Gagal mengubah nama" |
| 240 | `"Failed to delete"` | "Gagal menghapus dokumen" |
| 418 | `"Analysis started"` | ✅ OK (EN success) |
| 422 | `"Failed to start"` | "Gagal memulai analisis" |
| 441 | ✅ `"Gagal mengubah setting"` | Already ID |
| 679 | ✅ `"Judul diperlukan"` | Already ID |
| 695 | ✅ `"Gagal generate"` | Already ID |
| 714 | ✅ `"Gagal submit"` | Already ID |
| 946 | ✅ `"Gagal"` | Already ID |
| 962 | ✅ `"Komentar dibuka/dipenuhi"` | Already ID |
| 984 | ✅ `"Gagal"` | Already ID |
| 996 | ✅ `"Dihapus"` | Already ID |
| 1137 | ✅ `"Gagal"` | Already ID |
| 1552 | `"Reference added"` (success) | ✅ OK or "Referensi ditambahkan" |
| 1581 | `"Reference added"` (success) | ✅ OK or "Referensi ditambahkan" |
| 1588 | `"Failed to add"` | "Gagal menambahkan referensi" |
| 1596 | `"Reference removed"` (success) | ✅ OK or "Referensi dihapus" |
| 1606 | `"Bibliography regeneration failed"` | "Gagal regenerasi pustaka" |
| 1608 | `"Bibliography regenerated"` (success) | ✅ OK or "Pustaka berhasil diregenerasi" |
| 1622 | `"Already added"` | "Referensi sudah ditambahkan" |
| 1644 | `"Failed to add"` | "Gagal menambahkan" |
| 1959 | `"File uploaded successfully"` | "File berhasil diunggah" |
| 1964 | `"Upload failed"` | "Gagal mengunggah file" |
| 1974 | `"Attachment deleted"` | "Lampiran dihapus" |
| 2256 | `"Share link created"` | "Link berbagi dibuat" |
| 2262 | ✅ `"Link copied to clipboard!"` | Already ID/EN |
| 2272 | `"Share link revoked"` | "Link berbagi dicabut" |
| 2281 | `"Link copied to clipboard"` | "Tautan disalin ke clipboard" |
| 2431 | ✅ `"Download X berhasil"` | Already ID |
| 2433 | ✅ `"Gagal mengunduh X"` | Already ID |

### project.tsx — RAW `String(err)` IN DESCRIPTIONS

| Line | Issue | Fix |
|------|-------|-----|
| 204 | `description: String(err)` | Extract error.message, translate common patterns |
| 222 | `description: String(err)` | Same |
| 240 | `description: String(err)` | Same |
| 422 | `description: String(err)` | Same |
| 946 | `description: String(err)` | Same |
| 964 | `description: String(err)` | Same |
| 984 | `description: String(err)` | Same |
| 998 | `description: String(err)` | Same |
| 1137 | `description: String(...)` | Same |
| 1150 | `description: String(...)` | Same |
| 1557 | `description: String(err)` | Same |
| 1606 | `description: String(err)` | Same |
| 2264 | `description: String(err)` | Same |

### login.tsx

| Line | Current | Fix |
|------|---------|-----|
| 45 | ✅ `"Welcome back! You are now logged in."` | Already EN (success, fine) |
| 50 | `"Login failed"` + `msg` | Title → "Login gagal"; translate msg patterns |
| 63 | `"Google sign-in failed"` + `msg` | Title → "Login dengan Google gagal"; translate msg |

### new-project.tsx

| Line | Current | Fix |
|------|---------|-----|
| 122 | `toast(...)` (unclear text) | Check line 122+ |
| 170 | ✅ `"X paper ditambahkan..."` | Already ID |
| 179 | `"X file(s) uploaded"` | "X file berhasil diunggah" |
| 218, 224, 227 | Check lines | Need inline reading |
| 231 | ✅ `"Project dibuat"` | Already ID |
| 236 | Check line | Need inline reading |

### profile.tsx

| Line | Current | Fix |
|------|---------|-----|
| 77 | ✅ `"Profil diperbarui"` | OK |
| 80 | `description: String(err)` | Translate error patterns |
| 91 | ✅ `"File terlalu besar. Maksimal 5MB."` | OK |
| 97 | ✅ `"Format harus JPEG, PNG, atau WebP."` | OK |
| 118 | ✅ `"Avatar diperbarui"` | OK |
| 121 | `description: String(err)` | Translate error patterns |
| 132 | ✅ `"Masukkan password"` | OK |
| 139 | ✅ `"Akun dihapus. Anda akan dialihkan."` | OK |

### register.tsx

| Line | Current | Fix |
|------|---------|-----|
| 66 | Check line | Need inline reading |
| 79-80 | Check line | Need inline reading |

### admin-ai-tiers.tsx

| Line | Current | Fix |
|------|---------|-----|
| 75 | ✅ `"Berhasil"` | OK |
| 77 | ✅ `"Gagal"` | OK |

---

## PART 3: Validation Error Display

### components/ui/field.tsx:210

```tsx
error?.message && <li key={index}>{error.message}</li>
```

**Issue:** Zod validation errors surface directly as raw message strings (often English technical terms like "Required", "Invalid email", "String must contain..."). These appear inline below form fields.

**Fix needed:** Create a translation map for common Zod error messages to Indonesian.

---

## PART 4: Auth Callback / Confirm Pages

### pages/confirm.tsx:38, 85

Status shows as `"error"` state — need to check what text the user sees.

### pages/auth-callback.tsx:85

```tsx
console.error("[auth-callback]", err);
```

**Issue:** Error logged to console but not shown to user in a friendly way.

### pages/auth-callback.tsx:116

Shows error state — need inline check of display text.

---

## SUMMARY: Priority Fixes

### Tier 1 — High Impact (most visible errors)

1. **Backend: All 401 `Unauthorized` → Indonesian** — This is the most common error users see. Change all 60+ instances of `"Unauthorized"` in backend to: `"Sesi berakhir. Silakan login kembali."`

2. **Backend: `buildErrorMessage()` prefix** — The `"HTTP 401 Unauthorized"` prefix comes from `custom-fetch.ts`. Either:
   - Strip the `HTTP XXX` prefix from user-facing messages, OR
   - Translate status text in `buildErrorMessage()` (e.g. `Unauthorized` → `Sesi berakhir`)

3. **project.tsx: All `String(err)` descriptions** — These expose raw API error text. Replace with context-aware translations.

### Tier 2 — Medium Impact

4. **All 404/403 backend messages → Indonesian**
5. **All validation error messages → Indonesian**
6. **All `Failed to...` toast titles → Indonesian**

### Tier 3 — Nice to Have

7. **Zod validation inline errors → Indonesian**
8. **Auth callback error display → Indonesian**
9. **Register form errors → Indonesian**

---

## RECOMMENDED APPROACH

**Step 1 — Fix the error message builder (`custom-fetch.ts`):**
Strip the `HTTP XXX` prefix and translate status text so all API errors become clean Indonesian messages without status codes.

**Step 2 — Create error translation helper:**
A function that maps common API error strings to Indonesian with actionable guidance.

**Step 3 — Batch-fix backend routes:**
Replace all English error strings in `res.status(X).json({ error: "..." })` with Indonesian equivalents.

**Step 4 — Fix all `String(err)` in toasts:**
Replace raw error strings with context-aware translated messages.

---

*Audit: 2026-09-04 | Files analyzed: custom-fetch.ts, all pages/*.tsx, key route handlers*
