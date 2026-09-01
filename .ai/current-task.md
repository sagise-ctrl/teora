# Current Task

> Updated by AI at milestones. New sessions: read this first.

---

## ACTIVE 2026-09-01 — SPA Routing Fix ✅ SELESAI

**Status:** ✅ SELESAI — Deploy berhasil, semua route 200 OK
**Model:** claude-opus-4-6

### Bug Fix

| Error | Root Cause (sebenarnya) | Fix | Status |
|-------|----------------------|-----|--------|
| `/auth/callback` 404 | `tsconfig.json` extends `../../tsconfig.base.json` — tidak accessible saat Vercel build di subdirectory → build FAIL → tidak ada dist/ → SPA rewrite tidak punya HTML untuk di-serve | Inline `tsconfig.base.json` compilerOptions ke workspace `tsconfig.json` | ✅ Deploy 2026-09-01 |

### Yang Terjadi

Deploy pipeline terlihat berhasil (CI green) tapi route tetap 404. Setelah dapat Vercel build logs, ketemu: build FAIL karena tsconfig extends path. Vercel SPA routing (vercel.json rewrites) sebenarnya SUDAH BENAR — tapi tidak bisa serve HTML kalau build gagal.

Root cause berlapis:
1. vercel.json rewrites: `/(.*)` → `/index.html` ✅ (already correct)
2. tsconfig.json: extends `../../tsconfig.base.json` → FAIL ❌

Fix: inline tsconfig.base.json jadi self-contained.

### Verifikasi

```
/login         → 200 HTML
/auth/callback → 200 HTML
/callback      → 200 HTML
/              → 200 HTML
/favicon.ico   → 200 SVG
/api/v1/health → 401 (backend proxy works)
```

### Lesson Learned

- vercel.json SPA rewrites SUDAH auto-fallback — tidak perlu manual config.json
- tsconfig yang extend parent config TIDAK portable untuk Vercel build
- Build failure di Vercel = 404 untuk semua route, bukan error message
- Cek Vercel build logs untuk diagnosis — bukan cuma workflow status

### Commits

- `ace7bae` — fix(build): inline tsconfig.base.json into workspace tsconfig.json
- `14c49e6` — fix(deploy): add diagnostic output to find root cause
- `9e321d6` — fix(deploy): use vercel deploy (not --prebuilt) — vercel.json handles SPA routing
- `9d882c5` — fix(deploy): SPA routing — correct asset paths + /api bypass
- `b135ccb` — fix(deploy): SPA fallback route loop (merge)
- `a8e8a87` — fix(ui): add /callback route + redirect favicon.ico

