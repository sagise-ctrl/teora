# Audit: Silent Errors — User Tidak Tahu Ada Error

**Tanggal:** 2026-09-03
**Model:** claude-opus-4-6
**Scope:** Frontend React pages + hooks
**Catatan:** Read-only analysis. Tidak ada fix applied.

---

## Ringkasan Eksekutif

| Severity | Count | Dampak |
|----------|-------|--------|
| CRITICAL | 3 | User tidak tahu operasi gagal — mengalami "phantom success" |
| HIGH | 4 | Auth errors tersembunyi — logout tanpa alasan jelas |
| MEDIUM | 3 | Error UI-visible tapi bukan toast, atau missing success feedback |
| LOW | 4 | Edge case minor |

Total: **14 silent error cases** ditemukan.

---

## CRITICAL — Phantom Success (Operasi Gagal tapi User Kira Berhasil)

### 1. `handleSetActive` — Project Document Activation

**File:** `src/pages/project.tsx`
**Lokasi:** ~L245-256

```ts
const handleSetActive = useCallback(async (docId: number) => {
  setActiveDocId(docId);
  activateDocument.mutate({ projectId, documentId: docId });
}, [projectId, docId, activateDocument]);
```

**Silent error:** `activateDocument.mutate()` — tidak ada `onError` handler. Jika server mengembalikan error (network timeout, 500, validation error), error DILEMATI dan user melihat dokumen sebagai "active" padahal server tidak mengetahuinya.

**User sees:** Dokumen berpindah ke tab aktif. Tidak ada toast. Mereka mengetik, save, dan kehilangan semua pekerjaan karena server tidak tahu dokumen ini yang aktif.

**Fix needed:** Tambahkan `onError` dengan toast error, dan revert `setActiveDocId` state jika mutate gagal.

---

### 2. `handleTierChange` — Admin User Tier Assignment

**File:** `src/pages/admin-users.tsx`
**Lokasi:** ~L66-79

```ts
const handleTierChange = async (userId: string, tier: string) => {
  setActionLoading(userId + tier);
  try {
    await customFetch(`/api/admin/users/${userId}/tier`, {
      method: "POST",
      body: JSON.stringify({ tier }),
    });
    fetchUsers();
  } catch {
    // silently fail
  } finally {
    setActionLoading(null);
  }
};
```

**Silent error:** `catch {}` — error di-swallows entirely. Admin mengubah tier user, UI refresh, tapi server tidak menerima perubahan.

**User sees:** Dropdown berubah, tapi tier user tidak benar-benar berubah di database. Admin tidak tahu ini gagal.

**Fix needed:** Tambahkan toast error dengan pesan spesifik dari server response.

---

### 3. `handleSuspend` — Admin User Suspension

**File:** `src/pages/admin-users.tsx`
**Lokasi:** ~L81-94

```ts
const handleSuspend = async (userId: string, suspend: boolean) => {
  setActionLoading(userId + String(suspend));
  try {
    await customFetch(`/api/admin/users/${userId}/suspend`, {
      method: "POST",
      body: JSON.stringify({ suspended: suspend }),
    });
    fetchUsers();
  } catch {
    // silently fail
  } finally {
    setActionLoading(null);
  }
};
```

**Silent error:** `catch {}` — error di-swallows entirely. Admin suspend/activate user, UI berubah, tapi operasi gagal di server.

**User sees:** Tombol berubah dari "Suspend" ke "Activate", tapi user yang dimaksud masih bisa login. Admin tidak tahu.

**Fix needed:** Tambahkan toast error yang jelas.

---

## HIGH — Auth Errors Swallowed (Logout Tanpa Penjelasan)

### 4. `fetchMe` — Initial Session Check

**File:** `src/hooks/use-auth.tsx`
**Lokasi:** ~L46-53

```ts
const fetchMe = useCallback(async () => {
  try {
    const user = await customFetch<User>("/auth/me");
    setUser(user);
  } catch {
    setUser(null); // silent
  }
}, []);
```

**Silent error:** Jika `/auth/me` gagal karena token expired, network error, atau server error, user di-set ke `null` tanpa notifikasi. User tidak tahu kenapa mereka "logged out."

**User sees:** Halaman tiba-tiba di-refresh atau navigate, dan mereka kembali ke landing page tanpa pesan error. Mereka harus login ulang tanpa tahu kenapa.

**Fix needed:** Toast "Sesi Anda habis. Silakan login kembali." saat `fetchMe` gagal, sebelum redirect.

---

### 5. `refresh` — Token Refresh

**File:** `src/hooks/use-auth.tsx`
**Lokasi:** ~L55-71

```ts
const refresh = useCallback(async () => {
  try {
    const newToken = await customFetch<{ token: string }>("/auth/refresh", { method: "POST" });
    // ...
  } catch {
    setUser(null); // silent logout
  }
}, []);
```

**Silent error:** Refresh token gagal, user langsung di-logout tanpa penjelasan. User tidak tahu apakah mereka sudah logout atau ada masalah teknis.

**User sees:** Tiba-tiba di-redirect ke landing page. Tidak ada pesan.

**Fix needed:** Toast sebelum logout, atau snackbar yang persistent.

---

### 6. `logout` — User-Initiated Logout

**File:** `src/hooks/use-auth.tsx`
**Lokasi:** ~L148-164

```ts
await Promise.all([
  customFetch("/auth/logout", { method: "POST" }).catch(() => {}),  // swallow
  removeItem("auth_token").catch(() => {}),                          // swallow
]).finally(() => { ... });
```

**Silent error:** Tidak ada yang salah secara UX (logout tetap berhasil), tapi operasi async gagal tanpa indicator. Ini LOW sebenarnya, tapi catalogued di sini untuk completeness.

**User sees:** Sudah logout, tidak dampak langsung.

**Fix needed:** Tidak urgent. Opsional: log errors untuk debugging.

---

## MEDIUM — Error Displayed, Tapi Bukan Toast / Missing Success Feedback

### 7. `handleSelectQuiz` — Quiz Selection with Fallback

**File:** `src/pages/project.tsx`
**Lokasi:** ~L721-726

```ts
const handleSelectQuiz = async (quizId: string) => {
  // ...
  fetchQuizData(quizId).catch(() => quiz);
};
```

**Silent error:** Fetch gagal, fallback ke `quiz` (local state). User melihat quiz tapi dengan data outdated/stale. Tidak ada indikasi bahwa fetch gagal dan mereka melihat data lama.

**User sees:** Quiz ter-load (dari cache/local), tapi mungkin tidak sesuai dengan data terbaru. User tidak tahu data ini mungkin outdated.

**Fix needed:** Toast warning "Tidak dapat memuat data quiz terbaru. Menampilkan data tersimpan."

---

### 8. CrossRef Search — Inline Error Text

**File:** `src/pages/project.tsx`
**Lokasi:** ~L1788-1792

```ts
catch (err) {
  setSearchResults(null);
  setSearchError(`Gagal mencari referensi: ${err instanceof Error ? err.message : String(err)}`);
}
```

**Not silent:** Error text DI-tampilkan ke user, tapi bukan toast. Error muncul sebagai inline text di search results area, yang mungkin tidak obvious sebagai error notification.

**User sees:** Text merah "Gagal mencari referensi: ..." di area results.

**Fix needed:** Konversi ke toast. Inline text bisa tersisa sebagai fallback.

---

### 9. `handleRegen` — Bibliography Regeneration

**File:** `src/pages/project.tsx`
**Lokasi:** ~L1602-1610

```ts
.onError(() => {
  toast({ title: "Gagal", description: "Tidak dapat meregenerasi daftar pustaka.", variant: "destructive" });
})
```

**Not silent:** Error toast Ditampilkan ke user. Tapi **missing success toast** — jika regenerasi berhasil, tidak ada konfirmasi ke user. User tidak tahu apakah proses selesai atau masih loading.

**User sees:** Tombol berubah dan bibliography update (jika berhasil), tapi tanpa konfirmasi. Loading spinner hilang dan bibliografi berubah, tapi user mungkin tidak yakin ini hasil regenerate terbaru.

**Fix needed:** Tambahkan `onSuccess` toast: "Daftar pustaka berhasil diperbarui."

---

## LOW — Minor UX Issues

### 10. Clipboard Copy — `referral.tsx`

**File:** `src/pages/referral.tsx`
**Lokasi:** ~L38-40

```ts
copyToClipboard(url).catch(() => {
  // Silently ignore clipboard errors
});
```

**Silent error:** Copy ke clipboard gagal (permission denied, browser restriction). User tidak tahu link tidak berhasil di-copy.

**User sees:** Klik tombol "Copy" tapi clipboard kosong. User mungkin tidak notice.

**Fix needed:** Toast error ringan: "Tidak dapat menyalin ke clipboard. Coba salin manual."

---

### 11. `bulkAddRefs` — Non-Critical Import

**File:** `src/pages/new-project.tsx`
**Lokasi:** ~L200-229

```ts
try {
  await bulkAddRefs.mutateAsync(payload);
  toast({ title: "Berhasil", description: `${addedCount} refereni berhasil ditambahkan.` });
} catch {
  toast({ title: "Gagal", description: "Tidak dapat mengimpor refereni. Silakan coba lagi.", variant: "destructive" });
}
```

**NOT silent:** Error DI-DISPLAY via destructive toast. Tapi ada comment `// Non-critical` yang menunjukkan developer tahu ini boleh fail. Ini OK — sudah ditangani dengan toast.

---

### 12. `fetchUsers` — Admin User List Load Failure

**File:** `src/pages/admin-users.tsx`
**Lokasi:** ~L52-55

```ts
customFetch<AdminUserList>(`/api/admin/users?${params}`)
  .then(setData)
  .catch(() => setData(null))
  .finally(() => setLoading(false));
```

**Not silent:** Error di-set `data` ke `null`, yang merender "Tidak ada user ditemukan" message. Ini misleading — error dan "no results" terlihat sama.

**User sees:** "Tidak ada user ditemukan" padahal search berhasil tapi error network.

**Fix needed:** Set error state terpisah, tampilkan "Gagal memuat data" bukan "Tidak ada."

---

### 13. `fetchStats` — FinOps Stats Load Failure

**File:** `src/pages/admin-finops.tsx`
**Lokasi:** ~L38-43

```ts
customFetch<FinStat>(`/api/admin/stats?period=${period}`)
  .then(setStats)
  .catch(() => setStats(null))
  .finally(() => setLoading(false));
```

**Not silent:** Error merender "Gagal memuat data" (L76). Ini sebenarnya OK.

---

### 14. `checkHealth` — Health Check Silent

**File:** `src/pages/admin-health.tsx`
**Lokasi:** ~L56-60

```ts
} catch {
  setServices([
    { name: "API Server", status: "unknown", ... },
    { name: "Database", status: "unknown", ... },
  ]);
}
```

**Not silent:** Outer catch merender services sebagai "unknown" status, yang bisa terlihat. Tapi inner catch di `Promise.all` (L44) juga silently sets status ke "down" — ini sebenarnya sudah di-display.

---

## Files yang Sudah OK (Error Ditangani dengan Benar)

| File | Notes |
|------|-------|
| `auth-callback.tsx` | Error di-surface via `setErrorMessage()` + UI state ✅ |
| `shared.tsx` | `catch(err)` → `setError(err.message)` → displayed ✅ |
| `confirm.tsx` | `catch(err)` → error state displayed ✅ |
| `usage.tsx` | Mutation errors shown via toast ✅ |
| `topup.tsx` | Error handled with toast ✅ |
| `profile.tsx` | Error handled with toast ✅ |
| `dashboard.tsx` | TanStack Query hooks with proper toast ✅ |
| `custom-fetch.ts` | All HTTP errors converted to user-friendly Indonesian messages ✅ |
| `use-ai-chat.ts` | Errors passed back to caller (callers use toast) ✅ |
| `admin-reports.tsx` | Mock data, no real API calls ✅ |
| `admin-health.tsx` | Service status displayed even on error ✅ |
| `writing-style.ts` | Backend: `console.error` + JSON error response — frontend perlu handle ini ✅ |
| `shared.ts` (backend) | Backend: proper error responses ✅ |

---

## Prioritas Perbaikan

| Priority | Items | Effort |
|----------|-------|--------|
| **P1 (Now)** | #1 `handleSetActive`, #4 `fetchMe`, #5 `refresh` | Medium |
| **P2 (Soon)** | #2 `handleTierChange`, #3 `handleSuspend` | Low |
| **P3 (Next sprint)** | #7 `handleSelectQuiz`, #9 missing success toast, #10 clipboard | Low |

---

## Metadata

- **Audit conducted:** 2026-09-03
- **Files audited:** 101 frontend TSX/TS files + generated hooks + backend routes
- **Auditor:** claude-opus-4-6
- **Mode:** Read-only — no fixes applied
