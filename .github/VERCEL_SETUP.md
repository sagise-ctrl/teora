# Vercel Git Integration — Manual Setup Guide

> **Owner action required** — Vercel MCP tidak bisa link existing projects via API.
> Setelah step ini selesai, push ke `main` → Vercel auto-deploy.

## Kenapa migrasi

Sebelumnya deploy lewat chain GH Actions → vercel CLI. Setiap layer (workspace symlinks, custom bundling, upload artifact) = satu lagi titik failure. Vercel-native lebih reliable:
- Push ke `main` → auto-deploy production
- Setiap PR → auto-preview URL
- GH Actions tetap jalan untuk CI (lint, typecheck, tests) sebagai quality gate

## Step 1 — Connect GitHub repo ke Vercel projects

### Frontend (`academic-workspace`)

1. Buka https://vercel.com/dashboard
2. Pilih project **academic-workspace**
3. Tab **Settings** → **Git**
4. Klik **Connect** (kalau belum connected)
5. Pilih **GitHub** → authorize Vercel GitHub App untuk repo `sagise-ctrl/teora`
6. Set:
   - **Production Branch:** `main`
   - **Root Directory:** `artifacts/academic-workspace`
   - **Build Command:** (kosongkan, pakai dari `vercel.json`)
   - **Install Command:** (kosongkan, pakai dari `vercel.json`)
   - **Output Directory:** (kosongkan, auto-detect)
7. Save

### Backend (`teora-backend`)

1. Buka https://vercel.com/dashboard
2. Pilih project **teora-backend**
   - Kalau tidak ada di dashboard → cek tab "Archived" atau personal account scope lain
   - Kalau perlu recreate: klik **Add New Project** → Import `sagise-ctrl/teora` → set:
     - **Project Name:** `teora-backend`
     - **Root Directory:** `artifacts/api-server`
     - **Framework Preset:** Other
3. Tab **Settings** → **Git** → Connect ke `sagise-ctrl/teora`
4. Set:
   - **Production Branch:** `main`
   - **Root Directory:** `artifacts/api-server`
   - **Build Command:** (kosongkan, `vercel.json` handle)
   - **Install Command:** (kosongkan)
5. Save

## Step 2 — Set environment variables

Untuk kedua projects, buka **Settings** → **Environment Variables** dan tambahkan (referensi: `artifacts/api-server/.env.example`):

### Frontend `academic-workspace`

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://[YOUR-PROJECT].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (anon key dari Supabase) |
| `VITE_API_URL` | `/api` |
| `VITE_MOCK` | `false` |

Pilih environment: **Production**, **Preview**, **Development** (centang semua).

### Backend `teora-backend`

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (dari Supabase Dashboard → Database → Connection string) |
| `DATABASE_POOLER_URL` | (dari Supabase → Connection Pooling) |
| `SUPABASE_URL` | `https://[YOUR-PROJECT].supabase.co` |
| `SUPABASE_JWT_SECRET` | (dari Supabase → API → JWT Secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role key — RAHASIA) |
| `AI_PROVIDER` | `openai` |
| `AI_BASE_URL` | `https://api.openai.com/v1` |
| `AI_API_KEY` | (OpenAI key) |
| `AI_MODEL` | `gpt-4o-mini` |
| `ALLOWED_ORIGINS` | `https://academic-workspace-eta.vercel.app,http://localhost:18543,http://localhost:5173` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |

Optional (kalau dipake):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CROSSREF_API_KEY`
- `WEBHOOK_SECRET`
- `UPLOAD_DIR`, `EXPORT_DIR`

**WAJIB environment scope: Production + Preview + Development** (jangan lupa Preview, biar preview deployment jalan).

## Step 3 — Test dengan preview deployment

1. Buka branch baru: `git checkout -b test/vercel-integration`
2. Push perubahan kecil (misal update README atau bump version)
3. Buka https://github.com/sagise-ctrl/teora → buka PR
4. Cek di https://vercel.com/dashboard → tab **Deployments**
5. Verify preview deployment berhasil → klik URL preview
6. Test endpoint `https://[preview-url]/api/healthz` → harus return 200 `{"status":"ok"}`

Kalau preview works → siap untuk production auto-deploy.

## Step 4 — Merge ke main (auto-deploy production)

1. Merge PR ke `main`
2. Vercel auto-trigger production deployment
3. Verify di https://vercel.com/dashboard → production deployment status
4. Cek https://academic-workspace-eta.vercel.app dan https://teora-backend.vercel.app/api/healthz

## Step 5 — Cleanup GH Actions deploy workflows

**HANYA setelah Step 4 verified.** Saya akan buat PR terpisah untuk delete:
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/deploy-backend.yml`

PR ini TIDAK akan saya merge sendiri — owner approve setelah yakin Vercel auto-deploy reliable.

## Rollback plan

Kalau Vercel Git Integration bermasalah setelah delete GH Actions:

```bash
# Restore workflows dari git history
git revert <commit-hash-yang-hapus-workflows>
git push origin main
```

Git history tetap ada di remote, jadi restore = 1 command.

## FAQ

**Q: Kenapa tidak langsung delete GH Actions workflows?**
A: Per SOP-001 deploy verification gate — setiap perubahan infrastruktur deploy harus di-test dulu end-to-end. Kalau Vercel setup gagal, GH Actions deploy adalah fallback.

**Q: Apakah `teora-backend` project perlu di-recreate?**
A: Tergantung state di dashboard owner. Kalau masih ada tapi di-hidden → unhide. Kalau di-archive → unarchive. Kalau hilang sama sekali → recreate dengan setting di Step 1.

**Q: Bagaimana dengan `VERCEL_TOKEN` secret di GitHub?**
A: Setelah Vercel Git Integration jadi dan GH Actions deploy workflows dihapus, secret ini tidak terpakai lagi. Bisa dihapus dari GitHub repo settings → Secrets and variables → Actions.

**Q: Branch `main` saat ini protected?**
A: Belum (per audit checkpoint deploy-pipeline-hardening-20260913.md). Setelah ini selesai, owner perlu setup branch protection di GitHub (MEDIUM gap, separate task).

## Status check

Owner reply dengan status Step 1-4 (kalau sudah selesai) supaya saya bisa lanjut ke Step 5 (delete workflows).
