# Lessons Learned — Operational

> **WAJIB DIBACA DI AWAL SETIAP SESI** (lihat Session Start Protocol di CLAUDE.md).
>
> File ini = institutional memory untuk operational lessons — auth, security, deploy, infrastructure bugs yang pernah di-fix.
> Berbeda dari `docs/ai-team/shared/lessons-learned.md` yang berisi general engineering patterns (Vite, MSW, Drizzle, OpenAPI) — itu reference, baca on-demand.

---

## Format Entry (WAJIB untuk entry baru)

Setiap error/bug yang diperbaiki WAJIB dicatat dengan format ini — bukan cuma "apa yang diubah", tapi kenapa + kelas masalah:

```
## [Nama singkat error]
- Gejala: apa yang terlihat, error message persis
- Root cause: kenapa ini terjadi — akar masalahnya, bukan gejalanya
- Kalau ini error berulang: apakah root cause sebelumnya sebenarnya
  belum benar-benar teratasi, atau ini kelas masalah baru yang mirip?
- Opsi yang dipertimbangkan: pendekatan apa saja yang dipikirkan
- Kenapa pilih pendekatan ini: alasan spesifik — bukan cuma "ini yang
  akhirnya jalan"
- Yang harus dicek di masa depan supaya tidak terulang: checklist
  konkret
```

---

## [Backend 401 "Unauthorized" — mount order middleware + JWT verification + trust proxy]

**Tanggal:** 2026-09-01
**Severity:** P1 Production
**Kelas masalah:** Backend auth — cookie/JWT verification + Express middleware orchestration

### Gejala

- Browser console spam `GET /api/auth/me 401 (Unauthorized)` setiap page reload
- Sebelumnya ada error `POST /api/auth/refresh 401 "No refresh token"` (cross-origin cookie)
- Owner frustrasi: "semaleman opus 4.6 ngoding tapi hasilnya sama aja error, gk jelas"

### Root cause (3 bug simultan)

**Bug A — Mount order middleware silent failure**
- `src/routes/index.ts` line 33: `router.use(authRouter);` di-mount SEBELUM `router.use(authMiddleware);`
- Express hanya apply middleware ke routes yang di-register **setelahnya**
- `/auth/me` dan `/auth/referrals` tidak terproteksi → token verification tidak jalan → 401 SELALU dari route handler

**Bug B — JWT verification hard if/else + JWKS URL salah**
- Modern Supabase (2024+) pakai ES256 (asymmetric, JWKS), bukan HS256 (symmetric, JWT_SECRET)
- Backend hard `if/else` — kalau HS256 throw (token format invalid), JWKS fallback tidak terpanggil
- JWKS URL yang dipakai salah: `/jwt/v1/keys` (docs lama) — yang benar: `/auth/v1/.well-known/jwks.json`

**Bug C — express-rate-limit ValidationError (no trust proxy)**
- Vercel CDN set `X-Forwarded-For` header
- Express default `trust proxy = false` → `req.ip` undefined
- `express-rate-limit` default keyGenerator throw `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`
- Tidak fatal tapi log spam di Vercel runtime

### Kalau ini error berulang — apakah root cause sebelumnya sebenarnya belum teratasi?

**YA — kelas masalah yang sama berulang:**
- 2026-08-28: `POST /api/auth/refresh 401 "No refresh token"` — fix cross-origin cookie di body fallback (`7c1a74a`)
- 2026-08-28: `429 "Too many attempts"` — fix rate limiter scope (`redeploy 2026-08-28`)
- 2026-09-01: `GET /api/auth/me 401 "Unauthorized"` — fix mount order + JWT verification + trust proxy (`af06d83` + `694d8f1`)

**Kenapa berulang:** Tidak ada institutional memory untuk auth-related lessons. `docs/ai-team/shared/lessons-learned.md` fokus ke general patterns (Vite, MSW, OpenAPI) — tidak ada entry tentang Express auth middleware orchestration atau Supabase JWT verification.

**Apakah kelas masalah baru?** Tidak — semua 3 fix 2026-08-28 sampai 2026-09-01 adalah kelas yang sama: **backend auth integration dengan Supabase + Vercel**. Tapi setiap fix solve symptom, bukan akar masalah (yaitu kurangnya protocol untuk cek lessons sebelum coding).

### Opsi yang dipertimbangkan

**Untuk Bug A (mount order):**
1. Pindah `router.use(authMiddleware);` ke sebelum `router.use(authRouter);` di `routes/index.ts`
2. Tambah per-route `authMiddleware` ke `/auth/me` dan `/auth/referrals`

**Untuk Bug B (JWT verify):**
1. Hard JWKS-only (drop HS256)
2. HS256-first dengan try/catch + JWKS fallback

**Untuk Bug C (trust proxy):**
1. `app.set("trust proxy", 1)` (1 hop untuk Vercel)
2. `app.set("trust proxy", true)` (semua hop)
3. Custom keyGenerator di express-rate-limit yang ignore X-Forwarded-For

### Kenapa pilih pendekatan ini

**Bug A → Opsi 2 (per-route middleware):** Mount order independent, explicit di setiap endpoint, lebih verbose tapi tidak punya silent failure mode. Opsi 1 masih fragile — kalau ada developer lain tambah router baru di tengah, mount order bug bisa muncul lagi.

**Bug B → Opsi 2 (HS256-first + JWKS fallback):** Handle legacy Supabase tokens (HS256 dari local dev) dan modern Google OAuth tokens (ES256 dari production). Worst case 2 verifications (HS256 fail → JWKS), tapi untuk healthy token ini microseconds. JWKS-only akan break legacy tokens.

**Bug C → Opsi 1 (`trust proxy = 1`):** Correct IP di serverless behind proxy. `trust proxy = true` di-block oleh express-rate-limit dengan warning `ERR_ERL_PERMISSIVE_TRUST_PROXY`. Custom keyGenerator akan bypass library validation — fragile.

### Yang harus dicek di masa depan supaya tidak terulang

**Sebelum coding auth/route/middleware apapun:**

- [ ] Baca `.ai/lessons-learned.md` ini — cek apakah ada kelas masalah yang sama
- [ ] Baca `.ai/decisions.md` DECISION 006 — pattern per-route middleware + HS256/JWKS fallback
- [ ] Baca `.ai/issue-tracker.md` entry auth-related

**Sebelum commit auth-related fix:**

- [ ] Bundle verification: `grep "fix-pattern" artifacts/api-server/api/index.mjs` — confirm fix ada di compiled output
- [ ] Test 3 skenario di production post-deploy: no token, bad token, valid token (kalau bisa generate test JWT)

**Sebelum deploy ke Vercel/serverless behind proxy:**

- [ ] Confirm `app.set("trust proxy", 1)` ada di app initialization
- [ ] Cek Vercel runtime logs untuk `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` — kalau ada, trust proxy belum diset

**Sebelum pakai `router.use(path, middleware)` di Express:**

- [ ] Tanyakan: apakah critical endpoint ada di group ini? Kalau ya, pakai per-route middleware `router.get(path, middleware, handler)` sebagai gantinya
- [ ] Cek mount order: middleware harus sebelum route registration yang ingin dilindungi

**Untuk Supabase JWT verification:**

- [ ] Modern Supabase (2024+) pakai ES256 — JWKS URL: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- [ ] HS256-first + JWKS fallback pattern (lihat DECISION 006)
- [ ] Jangan hard `if/else` — pakai try/catch + fallthrough

---

## [Cross-origin cookie auth failure di Vercel proxy]

**Tanggal:** 2026-08-28
**Severity:** P2 Production
**Kelas masalah:** Cross-origin authentication di Vercel multi-project setup

### Gejala

- Setelah login Google OAuth sukses, `POST /api/auth/refresh` return `401 {"error":"No refresh token"}`
- Frontend di `academic-workspace-eta.vercel.app`, backend di `teora-backend.vercel.app`
- Vercel proxy rewrite `/api/(.*)` → `https://teora-backend.vercel.app/api/$1`

### Root cause

Browser **tidak kirim** httpOnly cookie yang diset di domain backend ketika request berasal dari domain frontend beda. Cookie-based refresh token di arsitektur cross-origin Vercel proxy **tidak work sama sekali**.

### Kalau ini error berulang

Tidak (sejauh ini). Tapi lesson fundamental: **cross-origin setup = cookie-based auth tidak reliable**.

### Opsi yang dipertimbangkan

1. Same-domain setup (frontend + backend di Vercel project yang sama)
2. localStorage + body fallback untuk refresh token

### Kenapa pilih Opsi 2

Same-domain setup memerlukan restructure arsitektur Vercel (1 project bukan 2). localStorage + body fallback lebih fleksibel dan work di both same-origin dan cross-origin. Trade-off: localStorage vulnerable ke XSS, tapi acceptable untuk SaaS dengan httpOnly access token masih di cookie.

### Yang harus dicek di masa depan

- [ ] Untuk cross-origin frontend/backend, JANGAN andalkan httpOnly cookie untuk refresh token
- [ ] Pakai localStorage + request body. Cookie hanya fallback/best-effort
- [ ] Test cross-origin cookie behavior di awal, bukan setelah deploy

---

## [Rate limiter blanket `app.use(path, limiter)` hits auto-called endpoints]

**Tanggal:** 2026-08-28
**Severity:** P3 Production
**Kelas masalah:** Rate limiting scope — blanket limiter include critical endpoints

### Gejala

Setelah fix `401 "No refresh token"`, muncul error baru: `GET /api/auth/me 429 Too Many Requests` setiap page reload. User cuma bisa reload 2-3x sebelum kena limit (5/min).

### Root cause

`app.use("/api/auth", authLimiter)` di `src/app.ts` menerapkan rate limiter ke SEMUA `/api/auth/*` route, termasuk `/auth/me` (read-only, called every page load) dan `/auth/refresh` (auto-called on app boot).

### Yang harus dicek di masa depan

- [ ] Jangan pakai `app.use(path, limiter)` untuk endpoint group yang include critical auto-called endpoints
- [ ] Pakai per-route mounting: `app.post("/api/auth/login", loginLimiter, handler)`
- [ ] Test rate limiter dengan endpoint **yang sebenarnya dipanggil user** (refresh, me), bukan cuma login/register

---

## [Orphaned Vercel projects — MCP blind spot 403/404]

**Tanggal:** 2026-08-25
**Severity:** P1 Dev (Trust)
**Kelas masalah:** Tool verification — MCP plugin scope terbatas

### Gejala

MCP Vercel plugin hanya menampilkan 1 dari 4 project Vercel yang owner punya. 3 project lain (`teora-api-server`, `api-server`, `teora`) return 404/403. AI otomatis default asumsi "project tidak ada" tanpa cross-check → lapor salah ke owner.

### Root cause

1. Vercel MCP plugin OAuth scope terbatas
2. Tidak ada cross-validation dengan screenshot/file lokal
3. `.vercel/project.json` lokal sudah reference project ID, tapi AI tidak cek

### Yang harus dicek di masa depan

- [ ] Kalau MCP return 404/403 untuk project, JANGAN default jawab "tidak ada"
- [ ] Cek `.vercel/project.json` lokal dulu (semua 3 lokasi: root, artifacts/academic-workspace, artifacts/api-server)
- [ ] Cek deployment history di git log
- [ ] Cek `.ai/incidents/*.md` apakah ada entry serupa
- [ ] Minta owner screenshot dashboard kalau ragu

---

## [pnpm workspace + Vercel incompatibility]

**Tanggal:** 2026-08-22
**Severity:** P1 Dev
**Kelas masalah:** Build system vs deployment target mismatch

### Gejala

Vercel build failed dengan multiple errors:
- `settings.onlyBuiltDependencies.push is not a function`
- `Unsupported URL Type "workspace:*"`
- `catalog:` syntax not recognized
- Lockfile version mismatch

### Root cause

Monorepo pakai fitur pnpm (`workspace:*`, `catalog:`, overrides) tanpa verifikasi Vercel auto-builder support. Vercel pakai npm by default.

### Yang harus dicek di masa depan

- [ ] Deployment target WAJIB diverifikasi BEFORE setup build system
- [ ] Default ke npm workspaces (standard, cross-platform)
- [ ] pnpm-specific features hanya jika deployment jelas support
- [ ] Test build pipeline early, jangan tunggu semua fitur selesai

---

## [Vercel `vercel deploy --prebuilt` serves stale `.vercel/output/` from cache]

- **Gejala**: Setelah `vite build` lokal + `npx vercel deploy --prod --prebuilt`, served bundle punya hash berbeda dari local `dist/`. Bundle `index-Bg74yc0K.js` (1,388,681 bytes) served, sedangkan local `dist/assets/index-Dhp-nRov.js` (1,404,322 bytes) tidak pernah di-upload. `vercel inspect` bilang "Builds [0ms]" — kelihatan seperti pakai prebuilt, padahal pakai cache kemarin.

- **Root cause**: `vercel deploy --prebuilt` baca dari `.vercel/output/`, BUKAN dari `dist/`. Folder `.vercel/output/` adalah output dari `vercel build` — yang sebelumnya sudah pernah dijalankan dan menghasilkan bundle static. Saat deploy berikutnya tanpa `vercel build` dulu, Vercel upload `.vercel/output/` lama apa adanya (builds.json mencatat `argv: [..., "vercel", "build", "--prod", ...]` dari run sebelumnya).

  Verifikasi cepat:
  ```bash
  stat -c "%y" dist/assets/index-*.js .vercel/output/static/assets/index-*.js
  # Output: local dist timestamp HARI INI, .vercel/output timestamp KEMARIN
  ```

- **Kalau error berulang**: Ini bukan error berulang tapi WORKFLOW BUG yang sama dengan "stale build output". Kelas masalah: artefak build tidak sinkron dengan source code. Root cause bukan di Vercel — di workflow kita yang tidak rebuild `.vercel/output/` setelah edit source.

- **Opsi yang dipertimbangkan**:
  1. Hapus `.vercel/output/` + copy manual `dist/*` ke `.vercel/output/static/` + tulis ulang `builds.json` + `config.json` minimal → deploy dengan `--prebuilt`. ✅ Dipilih.
  2. `vercel build --prod` lalu `vercel deploy --prebuilt --yes`. ❌ Gagal di `npm install --legacy-peer-deps` karena monorepo pakai `link:../drizzle-orm/dist` (pnpm protocol, npm tidak support).
  3. Tambah `--force` atau `--no-cache` di vercel CLI untuk force rebuild. ❌ Flag tidak ada di vercel CLI saat ini.

- **Kenapa pilih opsi 1**: Solusi deterministic — saya kontrol persis file mana yang di-upload. Tidak bergantung ke Vercel auto-builder. Cocok dengan pnpm monorepo yang npm-install-nya selalu gagal.

- **Workflow deploy frontend yang BENAR (per 2026-09-03)**:
  ```bash
  cd artifacts/academic-workspace
  cmd //c "node_modules\\.bin\\vite build"   # local pnpm-safe build → dist/

  rm -rf .vercel/output
  mkdir -p .vercel/output/static
  cp -r dist/* .vercel/output/static/

  # Minimal builds.json + config.json (lihat snippet di git history)
  npx vercel deploy --prod --prebuilt --yes --scope team_3EUQGQXweii5aVhyz07uqEFB
  ```

- **Yang harus dicek di masa depan**:
  - [ ] Setelah edit source apapun, JANGAN langsung `vercel deploy --prebuilt` — pastikan `.vercel/output/` sudah dibersihkan dan di-repopulate.
  - [ ] Selalu cek timestamp `.vercel/output/static/assets/index-*.js` SEBELUM deploy. Kalau < hari ini, hapus + repopulate.
  - [ ] Verifikasi served bundle setelah deploy: `curl -s <url>/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'` harus sama dengan `ls dist/assets/`.
  - [ ] Cache Vercel CDN bisa bikin bundle hash lama masih ke-serve — kalau deploy baru tapi served hash lama, tunggu 30-60 detik atau cek deployment URL spesifik (`academic-workspace-<hash>-sagise-ctrls-projects.vercel.app`).

---

## Cara Pakai File Ini

**Setiap model baru di awal sesi:**

1. Baca file ini (per Session Start Protocol)
2. Sebelum coding apapun, scan entry yang relevan dengan task
3. Kalau ada kelas masalah yang sama, SEBUTKAN eksplisit: "ini kemungkinan terkait [entry X], karena [alasan]"
4. Baru mulai investigasi/fix — JANGAN langsung coding dari nol

**Setiap selesai fix bug/error:**

1. Tambah entry baru di file ini dengan format di atas
2. Update entry lama yang terkait (cross-reference)
3. Commit ke git (kalau file tracked)

**Update CLAUDE.md Session Start Protocol** kalau ada lessons baru yang harus selalu di-load.
