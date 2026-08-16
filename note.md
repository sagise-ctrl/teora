# Teora — AI Academic Workspace

## Project Overview

**Teora** adalah AI Academic Workspace — aplikasi berbasis AI untuk mengelola tugas akademik dan makalah penelitian. Setiap project punya AI context, riwayat dokumen, database referensi, dan timeline aktivitas. AI secara otomatis menganalisa instruksi instruktur, menghasilkan outline, menulis bab, dan mengekspor dokumen.

## Stack Saat Ini

| Layer | Tech |
|-------|------|
| Package manager | pnpm workspaces |
| Frontend | React 19 + Vite + Tailwind CSS v4 + TanStack Query + wouter |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v3 |
| AI | OpenAI-compatible API (configurable via env) |
| API codegen | Orval (dari OpenAPI spec) |
| Deployment | Vercel (Frontend) + VPS (Backend) + Supabase (Auth + DB + Storage) |

## Arsitektur Deployment

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Frontend)                                          │
│  - React SPA (static hosting)                              │
│  - Preview: https://academic-workspace-*.vercel.app         │
│  - Production: https://teora.vercel.app (belum di-set)      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTP
┌─────────────────────────────────────────────────────────────┐
│  VPS Ubuntu 24 (Backend) — LOCAL DEV SAJA                  │
│  - Express API Server (port 8080)                          │
│  - Background Worker (PM2, proses terpisah)                 │
│  - AI request queue dengan concurrency limit                │
└─────────────────────────────────────────────────────────────┘
     │              │              │
     ▼              ▼              ▼
  Supabase      Supabase     Supabase
  Postgres      Auth         Storage
  (production)  (production) (production)
```

**Catatan deployment Vercel:**
- `vercel.json` ada di `artifacts/academic-workspace/`
- Build: `pnpm run build` (Vite)
- Output: `dist/` (bukan `dist/public/`)
- Build lokal: `vercel build`, deploy: `vercel deploy --prebuilt`
- Env vars di Vercel dashboard: `VITE_MOCK`, `VITE_API_URL`
- Untuk deploy: dari dalam folder `artifacts/academic-workspace` → `vercel --yes`

## Struktur Monorepo

```
artifacts/
  api-server/         # Express API server (port 8080)
  academic-workspace/  # React frontend (port 18543, Vercel deployment)
  mockup-sandbox/     # (unused scaffold)
lib/
  db/                 # Drizzle ORM schema + PostgreSQL
  api-spec/           # OpenAPI spec (single source of truth)
  api-zod/            # Generated Zod schemas
  api-client-react/   # Generated TanStack Query hooks
scripts/
  hello.ts            # Placeholder script
```

## Cara Run

```
pnpm --filter @workspace/academic-workspace run dev:bypass   # Frontend dev (port 18543)
pnpm --filter @workspace/api-server run dev                  # API server (port 8080)
pnpm run typecheck                                          # Full typecheck
pnpm --filter @workspace/api-spec run codegen              # Regenerate API hooks
pnpm run build                                              # Build semua (libs + frontend)
```

## Desain Produk Saat Ini

- **Dashboard** — project cards, filter status, progress bar, statistik
- **Project Workspace** — 6 tabs: Preview, Chat AI, Referensi, Lampiran, Riwayat Versi, Timeline
- **AI Pipeline** — analyze → outline → write → export (tracked sebagai jobs)
- **References DB** — validasi status + regenerasi bibliografi
- **Versioning** — setiap revisi buat versi baru, tidak menimpa

---

## User Roles

### Owner

Akun pribadi dengan akses penuh.
- Tidak memerlukan subscription
- Tidak ada limit penggunaan
- AI usage tetap dicatat (untuk analisis biaya & audit)

### User (future)

Akun berbayar dengan subscription.
- AI usage dicatat + di-billing
- Subject to subscription limits

---

## Fitur: Authentication (Supabase)

### Arsitektur Auth

**Single source of truth: Backend `/auth/register`**

Frontend TIDAK memanggil `supabase.auth.signUp()` langsung. Semua user creation lewat backend:

```
Frontend → POST /auth/register → Backend
                            ├── supabaseAdmin.auth.admin.createUser()  ← buat account Supabase
                            ├── Buat local user record (drizzle)
                            └── Set session cookie → return ke frontend
```

**Alasan:**
- Supabase free tier TIDAK bisa create user via frontend SDK tanpa konfigurasi extra
- Backend punya `SERVICE_ROLE_KEY` untuk admin operations
- Mencegah duplicate user creation (race condition antara frontend SDK + backend admin SDK)

### Register Flow

1. User submit form di frontend
2. Frontend call `POST /auth/register`
3. Backend buat Supabase user via admin SDK
4. Backend buat local user record di PostgreSQL
5. Backend set session cookie
6. Frontend baca session dari cookie via Supabase SDK

**Dev mode (`NODE_ENV=development`):**
- `email_confirm: true` → user langsung bisa login (skip email verification)
- Session langsung di-return ke frontend

**Production:**
- `email_confirm: false` → Supabase kirim email verifikasi
- User klik link → redirect ke `/auth/confirm?token_hash=xxx`
- Frontend call `supabase.auth.verifyOtp({ type: "email", token })`
- Session baru di-set setelah verifikasi

### Login Flow

1. Frontend call `POST /auth/login` dengan access_token + refresh_token
2. Backend verify token via Supabase
3. Backend set cookies
4. Frontend fetch `/auth/me` → dapat user data

### Auth Files

| File | Fungsi |
|------|--------|
| `api-server/src/routes/auth.ts` | Register, login, logout, me |
| `api-server/src/middlewares/auth.ts` | JWT verification (cookie + Bearer token) |
| `api-server/src/lib/ownership.ts` | Helper get userId dari request |
| `academic-workspace/src/hooks/use-auth.tsx` | Auth context + hooks (login, register, logout) |
| `academic-workspace/src/lib/supabase.ts` | Supabase client singleton |
| `academic-workspace/src/pages/login.tsx` | Login page |
| `academic-workspace/src/pages/register.tsx` | Register page |
| `academic-workspace/src/pages/confirm.tsx` | Email confirmation page |
| `academic-workspace/src/hooks/protected-route.tsx` | Route guard |

### Env Vars (Backend)

| Variable | Deskripsi |
|----------|-----------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (backend only, jangan expose frontend) |
| `SUPABASE_JWT_SECRET` | JWT secret untuk verify token |
| `NODE_ENV` | `development` = email_confirm:true, `production` = email_confirm:false |
| `SESSION_SECRET` | Secret untuk sign session cookies |
| `WEBHOOK_SECRET` | Secret untuk validasi database webhook |

### Env Vars (Frontend)

| Variable | Deskripsi |
|----------|-----------|
| `VITE_MOCK` | `true` = pakai MSW mock data |
| `VITE_API_URL` | URL backend API (misal `http://localhost:8080`) |

### Supabase Dashboard Setup

1. **Authentication → Providers → Email**: enable email auth
2. **Authentication → URL Configuration**:
   - Site URL: `https://teora.vercel.app` (production) / `https://*.vercel.app` (preview)
   - Redirect URLs: semua preview URL Vercel + `http://localhost:18543`
3. **API Settings**: copy `url`, `anon key`, `service_role key`
4. **Database**: enable RLS, buat schema sesuai `lib/db/src/schema/`

---

## Fitur: Referral System

### Design Decisions

| Decision | Pilihan | Alasan |
|----------|---------|--------|
| Referral code storage | Users table | Tidak perlu tabel terpisah, cukup satu field |
| Email verification tracking | Database webhook | Tidak ada Supabase auth webhook, pakai webhook pada `auth.users` |
| Code format | 8 char alphanumeric, no prefix | Singkat, mudah share, collision risk negligible |
| Unlimited referrals | Ya | Simpel, tidak ada batasan |

### Database Schema

**`users.referralCode`** — kode unik per user (8 char, unique index)

**`referrals`** — tracking hubungan referrer → referred
- `referrerId` → user yang invite
- `referredId` → user yang di-invite (unique, satu referrer per user)
- `referredEmail` → email saat daftar
- `referralCode` → kode yang dipakai saat daftar
- `status`: `pending` → `verified` → `qualified` → `rewarded` / `rejected`

**`referral_events`** — audit log immutable untuk setiap status change
- `from_status`, `to_status`, `actor_id`, `actor_type`, `reason`, `metadata`

### Flow Pendaftaran dengan Referral

```
1. User buka /register?ref=KODE
2. Submit form → POST /auth/register { email, password, referralCode }
3. Backend validate referral code (exists di users table)
4. Buat Supabase user
5. Anti self-referral check: referrer.id !== newUser.id
6. Buat local user record + generate referral code baru (nanoid)
7. Kalau valid referrer → insert referrals record (status=pending)
8. Kirim email verifikasi
9. User verifikasi email → Supabase webhook trigger
10. Webhook endpoint update referral.status = "verified"
```

### Self-Referral Prevention

Double check:
1. **Frontend**: `ref` param dari URL sendiri → tidak bisa (user belum punya kode)
2. **Backend**: setelah buat Supabase account, compare `referrerUser.id !== newUser.id`

### Webhook Endpoint

`POST /webhooks/email-verified` — validasi `X-Webhook-Secret`, cek `email_confirmed_at` transition (null → timestamp), update referral status.

### Referral Files

| File | Fungsi |
|------|--------|
| `lib/db/src/schema/users.ts` | + `referralCode` field |
| `lib/db/src/schema/referrals.ts` | Referral tracking table |
| `lib/db/src/schema/referral_events.ts` | Audit log table |
| `api-server/src/routes/auth.ts` | Create referral record saat register |
| `api-server/src/routes/webhooks.ts` | Email verified webhook |
| `api-server/src/routes/auth.ts` (GET /referrals) | Ambil referral list + stats |
| `api-server/src/routes/auth.ts` (GET /referrals/:id/events) | Ambil event log per referral |
| `academic-workspace/src/components/layout.tsx` | Share & Earn sidebar |
| `academic-workspace/src/pages/register.tsx` | + referral banner |

### UI Referral (Saat Ini)

**Sidebar** (setelah login):
- Kode referral + copy button
- "Copy referral link" button
- Ini saja — belum ada halaman dashboard/list

---

## Mock Mode (Development)

### Cara Pakai

1. Set `VITE_MOCK=true` di `.env`
2. Set `VITE_API_URL=/api` (agar MSW intercept)
3. Jalankan dev server: `pnpm run dev:bypass` (dari folder `artifacts/academic-workspace`)
4. Buka `/login`, masukkan email & password apapun
5. MSW intercept semua API calls → return mock data

### Mock Files

| File | Fungsi |
|------|--------|
| `src/mocks/browser.ts` | MSW worker setup |
| `src/mocks/handlers.ts` | HTTP mock handlers (auth, projects, messages, dll) |
| `src/mocks/data.ts` | Static mock data |
| `public/mockServiceWorker.js` | Service worker (generated oleh MSW) |

### MSW Troubleshooting

**Error: `ERR_ABORTED 504 (Outdated Optimize Dep)`**
→ Restart dev server (kill process lama, start baru). Cache Vite dep usang.

**Error: `404 /api/xxx`**
→ Pastikan `VITE_API_URL=/api` diset. Tanpa ini, `customFetch` request ke `/xxx` (tanpa `/api`).

**Service Worker tidak aktif:**
→ Buka tab baru / incognito window. Service worker butuh fresh registration.

---

## AI Usage Tracking Schema

Setiap AI request dicatat ke tabel `ai_usage`:

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| userId | uuid | FK ke users |
| projectId | uuid | FK ke projects (nullable) |
| model | string | e.g. "claude-sonnet-4-20250514" |
| inputTokens | integer | Input token count |
| outputTokens | integer | Output token count |
| estimatedCost | decimal | Estimasi biaya dalam USD |
| requestType | string | "chat", "analyze", "outline", "write", "export" |
| metadata | jsonb | Extra context (prompt preview, etc.) |
| createdAt | timestamp | Waktu request |

Dashboard Admin statistik:

```
AI Usage Stats
├── User Usage (semua user non-owner)
│   ├── Total Requests
│   ├── Total Input Tokens
│   ├── Total Output Tokens
│   └── Total Estimated Cost
├── Owner Usage
│   ├── Total Requests
│   ├── Total Input Tokens
│   ├── Total Output Tokens
│   └── Total Estimated Cost
└── Total System Usage
    ├── Total Requests
    ├── Total Input Tokens
    ├── Total Output Tokens
    └── Total Estimated Cost
```

---

## Arsitektur Keputusan (Finalized)

### 1. Database Schema — userId per tabel

Tambah `userId` ke setiap tabel yang punya kepemilikan data (projects, messages, documents, references, attachments, activities, jobs, exports, usage records, payments).

`organizationId` belum diperlukan. Bisa ditambahkan nanti sebagai nullable field untuk fitur workspace/team tanpa breaking change.

### 2. API Server — Monolith dengan Layered Architecture

Tetap satu Express app. Internal structure:

```
routes/        # Route definitions + middleware
controllers/   # Request/response handling
services/      # Business logic
repositories/  # Database access (Drizzle)
utils/         # Helpers, constants
```

Microservice baru dipertimbangkan jika ada kebutuhan scaling yang jelas.

### 3. AI Provider — Abstraction Layer (AIService)

App punya API key terpusat. Semua AI request lewat backend untuk:
- Tracking token usage per user
- Estimasi biaya per request
- Apply subscription limits
- AI provider abstraction (swap tanpa ubah frontend)

**Abstraction layer (`lib/ai/`):**
```
lib/
  ai/
    types.ts           # Shared interfaces (AIRequest, AIResponse, UsageStats)
    providers/
      anthropic.ts     # Anthropic implementation
      openai.ts        # OpenAI implementation
      openrouter.ts   # OpenRouter implementation
    AIService.ts       # Unified interface, provider routing
    tokenEstimator.ts  # Estimate token count (fallback ke API)
```

Provider dipilih via `AI_PROVIDER` env var. Aplikasi hanya import dari `AIService`, tidak pernah langsung ke SDK.

### 4. File Storage — Abstraction Layer

Gunakan Supabase Storage saat ini untuk kemudahan integrasi (auth + storage dari satu provider).

**Abstraction layer (`lib/storage/`):**
```
lib/
  storage/
    types.ts           # Shared interfaces
    providers/
      supabase.ts      # Supabase Storage implementation
      s3.ts           # S3/R2 implementation
    StorageService.ts  # Unified interface
```

Swap provider dengan ubah env var + implementasi provider baru, tidak ubah calling code.

### 5. Deployment

| Component | Target | Notes |
|-----------|--------|-------|
| Frontend | Vercel | SPA static hosting |
| API Server | VPS Ubuntu 24 | Express + PM2, port 8080 |
| Background Worker | VPS Ubuntu 24 | Proses terpisah via PM2 |
| Database | Supabase Postgres | Connection via `DATABASE_URL` |
| Auth | Supabase Auth | Clerk belum diperlukan |
| File Storage | Supabase Storage | Swap ke R2 jika perlu |
| AI Provider | Anthropic API | Via AIService abstraction |

**VPS Memory Management (2 GB RAM):**
- PM2 untuk process management + auto-restart
- Worker proses terpisah dari Express (tidak makan memory API)
- AI request queue dengan concurrency limit (max 2 concurrent)
- Peak memory dikontrol via PM2 `max_memory_restart`

**Queue Architecture:**

MVP menggunakan polling sederhana (poll queue tiap 5-10 detik). Kode harus distruktur agar migration ke event-driven queue (BullMQ + Redis, atau layanan queue managed) tidak butuh refactor besar.

```
lib/
  queue/
    types.ts           # Job, JobStatus, QueueConfig
    QueueService.ts    # Abstraction interface (enqueue, dequeue, ack)
    providers/
      memory.ts        # In-memory queue (MVP)
      bullmq.ts        # BullMQ + Redis (production)
      sqs.ts           # AWS SQS (optional)
```

Struktur QueueService adalah kontrak tetap — swap provider dengan ubah env var tanpa ubah calling code. Job handler (apa yang dilakukan worker) tidak tahu provider apa yang dipakai.

---

## Referensi Routing Gotchas

- `/projects/stats` **HARUS** register SEBELUM `/projects/:projectId` — Express akan match "stats" sebagai ID
- `type: integer` di openapi.yaml → Orval generate `zod.int()` yang broken di Zod v3 → selalu pakai `type: number`
- Setelah ubah schema, run `pnpm --filter @workspace/db run push` lalu `pnpm run typecheck:libs`
- Email format di openapi.yaml: gunakan `pattern: "^[^@]+@[^@]+\\.[^@]+$"` (bukan `format: email`) — Orva punya bug generating `z.email()` yang tidak ada di Zod v3

---

## Technical Debt (Priority Order)

| # | Item | File | Status |
|---|------|------|--------|
| 1 | AI chat response generation | `routes/messages.ts` | route ada, worker belum jalan |
| 2 | Document preview rendering | `pages/project.tsx` | belum ada |
| 3 | Job queue worker | `routes/jobs.ts` | jobs dibuat, worker belum ada |
| 4 | Export execution | `routes/exports.ts` | route ada, logic belum lengkap |
| 5 | Reference validation logic | `routes/references.ts` | status field ada, logic belum |

## Planned Features

| Feature | Description |
|---------|-------------|
| Referral dashboard | Halaman `/referrals` dengan stats + list + history |
| AI usage dashboard | Statistik usage per user + admin panel |
| Subscription/billing | Pakai payment gateway untuk user non-owner |
| AI abstraction layer | `lib/ai/` dengan provider abstraction |
| Storage abstraction | `lib/storage/` dengan provider abstraction |
| Queue abstraction | `lib/queue/` dengan BullMQ/SQS provider |
| Document export | Export ke PDF, DOCX, LaTeX |
| Team workspace | `organizationId` nullable di semua tabel |
