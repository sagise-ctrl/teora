# Panduan Deploy Teora ke Vercel

> Dibuat: 2026-08-23 | Estimasi waktu: 30-45 menit

Dokumen ini mencakup semua langkah manual yang tidak bisa di-automate (Vercel dashboard access, GitHub connection, env vars). AI Engineering sudah menyiapkan semua kode yang perlu di-deploy.

---

## Prerequisites

Sebelum mulai, pastikan Anda punya:
- Akun Vercel (vercel.com) dengan project `academic-workspace` sudah ada
- Akun GitHub dengan repo `teora` sudah terhubung
- Nilai-nilai berikut dari Supabase Dashboard:

| Nilai | Diambil dari |
|-------|-------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → General |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Settings → JWT Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key |
| `DATABASE_POOLER_URL` | Supabase Dashboard → Database → Connection Pooling → Connection string |
| `AI_API_KEY` | OpenAI Dashboard → API Keys |

---

## Langkah 1: Clone & Checkout Branch (di local)

```bash
cd teora
git fetch origin
git checkout feat/tier-2-complete
```

**Catatan:** Semua fitur baru ada di branch ini. Branch ini belum di-merge ke `main`.

---

## Langkah 2: Set Environment Variables — Frontend

1. Buka **Vercel Dashboard** → Project `academic-workspace`
2. Klik **Settings** → **Environment Variables**
3. Tambahkan per-variabel berikut:

| Name | Value | Environments |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `[ANON-KEY]` | Production, Preview, Development |
| `VITE_MOCK` | `false` | Production, Preview |
| `VITE_MOCK` | `true` | Development |
| `VITE_API_URL` | Kosongkan / kosong | Production, Preview, Development |

4. Klik **Save**

> `VITE_MOCK=false` di production = frontend pakai API nyata. `VITE_API_URL` kosong berarti pakai relative path ke `/api` — ini perlu di-point ke api-server yang sudah di-deploy.

---

### A. Jika Connection Pooling tersedia

Supabase Dashboard → **Database** → **Connection Pooling** → tab **Connection Pooler** → **Connection string** → tab **URI**.

Format:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### B. Jika Connection Pooling tidak tersedia

Langsung pakai `DATABASE_URL` saja. Untuk awal-awal deploy, ini sudah cukup — bedanya hanya di connection limit (langsung ~100 max, pooler ribuan). Bisa ditambahkan nanti kalau sudah skala besar.

---

## Langkah 3: Set Environment Variables — API Server

1. Buka **Vercel Dashboard** → Project `api-server` (lihat Langkah 5 jika belum ada)
2. Klik **Settings** → **Environment Variables**
3. Tambahkan:

| Name | Value | Environments |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` | Production, Preview, Development |
| `DATABASE_POOLER_URL` | Connection Pooler URI *(opsional — lihat catatan di atas)* | Production, Preview, Development |
| `SUPABASE_URL` | `https://[REF].supabase.co` | Production, Preview, Development |
| `SUPABASE_JWT_SECRET` | `[JWT-SECRET]` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `[SERVICE_ROLE_KEY]` | Production, Preview, Development |
| `AI_PROVIDER` | `openai` | Production, Preview, Development |
| `AI_API_KEY` | `[OPENAI-API-KEY]` | Production, Preview, Development |
| `AI_MODEL` | `gpt-4o-mini` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

4. Klik **Save**

> **Catatan DATABASE_POOLER_URL:** Jika tidak ada di dashboard, kosongkan atau hapus baris ini. Aplikasi fallback otomatis ke `DATABASE_URL`.

---

## Langkah 4: Connect GitHub — API Server (jika belum)

1. Buka **Vercel Dashboard**
2. Klik **Add New...** → **Project**
3. Pilih repo `sagise-ctrl/teora`
4. Di **Configure Project**:
   - **Framework Preset:** Other
   - **Root Directory:** `artifacts/api-server`
   - **Build Command:** (kosongkan, sudah di-configure di `vercel.json`)
   - **Output Directory:** (kosongkan)
5. Klik **Deploy**

Atau jika sudah punya project:
1. Buka project `api-server`
2. Settings → **Git** → **Connect Git Repository**
3. Pilih repo `sagise-ctrl/teora`
4. Pastikan **Root Directory:** `artifacts/api-server`

---

## Langkah 5: Update Vite Config — Frontend API URL

Karena API server ada di project terpisah, frontend perlu tahu URL-nya.

1. Buka **Vercel Dashboard** → Project `api-server` → **Domains**
2. Copy domain API (misalnya: `api-server.vercel.app` atau custom domain)
3. Buka **Vercel Dashboard** → Project `academic-workspace` → **Settings** → **Environment Variables**
4. Update `VITE_API_URL`:
   - Production: `https://[domain-anda].vercel.app`
   - Preview: (kosongkan — pakai preview URL otomatis)
   - Development: (kosongkan — pakai local dev server)

Alternatif lain: pakai Vercel rewriting di `vercel.json` frontend:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api-server-xxx.vercel.app/:path*" }
  ]
}
```

Ini lebih clean — frontend tetap pakai `/api` dan Vercel redirect ke api-server.

---

## Langkah 6: Trigger Deploy

1. **Via GitHub:** Push branch `feat/tier-2-complete` ke origin:
   ```bash
   git push origin feat/tier-2-complete
   ```
   Vercel auto-deploy dari GitHub push.

2. **Atau manual:** Di Vercel Dashboard, klik **Trigger Deploy** → pilih branch `feat/tier-2-complete`

---

## Langkah 7: Verify Deploy

### Frontend
1. Buka URL production (dari Vercel dashboard)
2. Test:
   - [ ] Halaman login muncul
   - [ ] Register berfungsi
   - [ ] Create project berfungsi
   - [ ] AI chat berfungsi (tanpa mock)
   - [ ] Navigasi (Dashboard, Project, dll) berfungsi

### API Server
1. Buka `[domain]/api/health`
2. Harus return `{"status":"ok","timestamp":"..."}`
3. Buka `[domain]/api/projects/stats`
4. Harus return JSON (even empty array `[]` berarti jalan)

### End-to-End
1. Login → Create Project → Kirim pesan AI → Generate document
2. Cek Supabase Dashboard → Table `messages` → ada data baru

---

## Langkah 8: Domain (Optional)

Kalau mau pakai custom domain:
1. Vercel Dashboard → Project → **Settings** → **Domains**
2. Tambah domain (misalnya: `app.teora.id`)
3. Update DNS sesuai instruksi Vercel
4. Tunggu propagasi

---

## Troubleshooting

### Build Gagal
1. Buka Vercel Dashboard → Project → **Deployments** → deployment terbaru
2. Klik **Build Logs**
3. Share error ke AI Engineering untuk diagnosis

### API returns 401/403
1. Cek `SUPABASE_JWT_SECRET` sama persis dengan di Supabase Dashboard
2. Cek `DATABASE_URL` credentials benar
3. Cek Supabase Auth → JWT → cek apakah secret sudah di-copy lengkap (ada spasi di awal/akhir?)

### Frontend API calls 404
1. Cek `VITE_API_URL` sudah diset ke domain api-server yang benar
2. Atau cek `vercel.json` rewrites sudah aktif
3. Di browser DevTools → Network → cari request ke `/api/...` → cek URL tujuan

### Blank page / White screen
1. Cek DevTools Console untuk error JavaScript
2. Pastikan `VITE_MOCK=false` di production
3. Cek `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` benar

---

## Checklist Deploy

- [ ] Env vars frontend (Supabase URL + ANON_KEY + MOCK=false)
- [ ] Env vars api-server (DATABASE_URL + POOLER + JWT_SECRET + SERVICE_ROLE + AI_KEY)
- [ ] API server connect GitHub + root dir `artifacts/api-server`
- [ ] VITE_API_URL / rewrites ke api-server domain
- [ ] Trigger deploy
- [ ] Verify health endpoint
- [ ] Test login + create project
- [ ] Test AI chat (non-mock)

---

## Merge ke Main (Setelah Testing)

Kalau semua test passed:

```bash
git checkout main
git pull origin main
git merge feat/tier-2-complete
git push origin main
```

Ini akan auto-trigger deploy production di Vercel untuk kedua project.

---

Pertanyaan? Share error message spesifik ke AI Engineering — saya bantu diagnosis.
