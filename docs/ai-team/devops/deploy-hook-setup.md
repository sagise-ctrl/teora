# Vercel Deploy Hook Setup — Teora

**Versi:** 1.0 (2026-09-14)
**Tujuan:** Setup deploy hook agar workflow tipis di GitHub bisa trigger Vercel production/preview deploy.
**Effort:** ~10 menit total.
**Owner action only:** Tidak bisa di-automate dari CLI karena Vercel dashboard butuh session authentication.

---

## Kenapa Perlu Setup Ini

Workflow tipis (`.github/workflows/deploy-frontend.yml` + `deploy-backend.yml` + `preview-verify.yml`) trigger Vercel via "Deploy Hook" — URL khusus yang langsung trigger build di Vercel, tanpa perlu Vercel CLI dari GitHub Actions.

**Sebelum (lama, fragile):**
- Build lokal di GitHub Actions (workspace symlink error, lightningcss binary missing, dll)
- Upload artifact, download di job berikutnya
- `vercel deploy --prod --yes` dari CLI di runner
- Average 5-8 menit, 14+ error sejak 2026-08-22

**Sesudah (baru, reliable):**
- Workflow tipis: cuma `curl POST <URL>`
- Vercel sendiri yang build (punya setting di dashboard)
- Average 1-2 menit, zero custom bundling

---

## STEP 1 — Setup di Vercel Dashboard (5 menit)

### 1a. Frontend Deploy Hook (Production)

1. Buka https://vercel.com/dashboard
2. Login dengan akun yang punya project `academic-workspace`
3. Klik project `academic-workspace`
4. Klik tab **Settings** (atas)
5. Di sidebar kiri, klik **Git** (di section "Deploy Hooks")
6. Scroll ke bagian **Deploy Hooks**, klik **Create Hook**
7. Isi form:
   - **Name:** `Production deploy on push main`
   - **Branch:** `main` (pilih dari dropdown)
8. Klik **Create Hook**
9. Vercel akan generate URL seperti: `https://api.vercel.com/v1/integrations/deploy/prj_xxxxx/yyyyyy`
10. **COPY URL ini** — paste di notepad/clipboard. Ini secret `VERCEL_DEPLOY_HOOK_PROD`

### 1b. Frontend Preview Hook (untuk PR)

1. Di project `academic-workspace`, masih di tab Settings → Git → Deploy Hooks
2. Klik **Create Hook** lagi
3. Isi form:
   - **Name:** `Preview on PR`
   - **Branch:** Pilih `*` (semua branch) atau `feat/*` + `fix/*`
4. Klik **Create Hook**
5. **COPY URL** ini. Ini secret `VERCEL_DEPLOY_HOOK_PREVIEW`

### 1c. Backend Deploy Hook (Production)

1. Kembali ke dashboard https://vercel.com/dashboard
2. Klik project `teora-backend`
3. Tab **Settings** → **Git** → **Deploy Hooks**
4. **Create Hook:**
   - **Name:** `Production deploy on push main`
   - **Branch:** `main`
5. Klik **Create Hook**
6. **COPY URL** ini. Ini secret `VERCEL_DEPLOY_HOOK_PROD_BACKEND`

> **Note:** Kalau `teora-backend` belum ada di Vercel dashboard Anda (mungkin masih di tempat lain), skip step ini dan kasih tahu AI engineering — kita bahas terpisah.

### 1d. (Penting!) Sinkronkan Node Version

Backend `artifacts/api-server/package.json` set `engines.node = 22.x`, tapi Vercel project settings set `24.x`. Inkonsistensi ini bisa bikin build crash diam-diam.

**Fix:**
1. Project `teora-backend` → **Settings** → **General** → **Node Version**
2. Pilih **22.x** (sesuai package.json)
3. Klik **Save**

Frontend (`academic-workspace`) tetap **24.x** (sesuai dashboard setting).

---

## STEP 2 — Setup Secrets di GitHub Repo (3 menit)

1. Buka GitHub repo: https://github.com/YOUR_ORG/teora/settings/secrets/actions
   (ganti `YOUR_ORG` dengan organisasi/username Anda)

2. Klik **New repository secret** (tombol hijau atas kanan)

3. Tambahkan 3 secret satu per satu:

   | Name | Value |
   |------|-------|
   | `VERCEL_DEPLOY_HOOK_PROD` | URL dari Step 1a |
   | `VERCEL_DEPLOY_HOOK_PREVIEW` | URL dari Step 1b |
   | `VERCEL_DEPLOY_HOOK_PROD_BACKEND` | URL dari Step 1c |

4. Untuk setiap secret: paste name, paste URL value, klik **Add secret**

> **Security note:** GitHub secret hanya bisa dilihat sekali saat dibuat. Kalau lupa copy, hapus secret dan buat ulang.

---

## STEP 3 — Konfirmasi ke AI Engineering (1 menit)

Setelah semua setup, kasih AI engineering **3 URL string** (boleh partial — misal hanya frontend dulu):

- `VERCEL_DEPLOY_HOOK_PROD` value
- `VERCEL_DEPLOY_HOOK_PREVIEW` value
- `VERCEL_DEPLOY_HOOK_PROD_BACKEND` value (kalau ada)

Format bebas — paste langsung di chat.

---

## STEP 4 — Verifikasi (otomatis dari AI engineering)

Setelah kasih URL, AI engineering akan:

1. ✅ Commit workflow files (sudah ada di branch `fix/deploy-pipeline-hardening`)
2. ⏸️ Tunggu ACCU push dari Anda (per CLAUDE.md Git Rules)
3. Push branch ke origin (1 kali push)
4. Test dengan push kecil ke branch test (misal `test/preview-verify`)
5. Verify workflow tipis jalan:
   - Workflow trigger Vercel (HTTP 201)
   - Preview URL accessible (HTTP 200)
   - Production tidak terganggu
6. Report hasil + update `.ai/current-task.md`

---

## Rollback Plan

Kalau workflow baru bermasalah, **rollback 1 command**:

```bash
git revert <commit-hash-of-workflow-changes>
git push origin main
```

Workflow lama (`deploy-frontend.yml` + `deploy-backend.yml` versi CLI) ada di git history. Vercel production tidak terpengaruh karena workflow baru cuma trigger deploy hook — kalau tidak dipush, tidak ada efek.

---

## Troubleshooting

### Q: Saya tidak lihat menu "Deploy Hooks" di Vercel Settings
**A:** Vercel plan free/hobby limit Deploy Hooks per project. Upgrade ke Pro kalau perlu. Atau gunakan Vercel CLI alternatif: `vercel deploy --prod --token=<token>` (tapi ini balik ke workflow lama — fragile).

### Q: Vercel project `teora-backend` tidak ada di dashboard saya
**A:** Backend mungkin di-host di tempat lain (VPS, Railway, Render). Sini setup hanya untuk frontend dulu. Backend akan setup manual nanti kalau perlu.

### Q: Workflow tipis trigger Vercel tapi production tidak berubah
**A:** Vercel mungkin masih build atau propagation. Tunggu 2-3 menit. Cek Vercel dashboard → Deployments untuk status real-time.

### Q: Health check gagal (HTTP 500/502)
**A:** Production broken. Rollback via Vercel dashboard: Deployments → klik deployment terakhir yang sukses → "Promote to Production". Atau `vercel rollback` dari CLI lokal.

---

## Reference

- Workflow files: `.github/workflows/deploy-frontend.yml`, `deploy-backend.yml`, `preview-verify.yml`
- DECISION 019 (layered deploy strategy): `.ai/decisions.md`
- Vercel Deploy Hooks docs: https://vercel.com/docs/git/deploy-hooks
