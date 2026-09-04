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

## [Vercel deploy — npm 11 strict rejects `link:` in pnpm-managed node_modules]

**Tanggal:** 2026-09-04
**Severity:** P2 Deploy Blocker
**Kelas masalah:** Vercel CLI build/install dengan pnpm-managed monorepo

### Gejala

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "link:": link:../drizzle-orm/dist
```

`vercel build --prod` gagal → `vercel deploy --prebuilt --prod --yes` gagal ("Prebuilt deployment cannot be created because vercel build failed").

### Root cause

- `drizzle-zod@0.8.3` di root monorepo punya `"drizzle-orm": "link:../drizzle-orm/dist"` di **devDependencies**
- Local `node_modules/drizzle-zod/package.json` punya `link:` ini (sisa dari pnpm install sebelumnya)
- npm 11 strict mode reject `link:` protocol
- `vercel.json` `installCommand: "npm install --legacy-peer-deps"` → Vercel jalanin → fail

### Kalau error berulang

**Kelas masalah baru**, bukan berulang. Tapi yang berulang: tanpa workaround, deploy dari branch non-main akan selalu pakai pattern ini.

### Opsi yang dipertimbangkan

1. Fix `package.json` root — hapus `drizzle-zod` dari root deps kalau memang tidak dipakai di runtime frontend
2. Tambah `.vercelignore` exclude `node_modules/drizzle-zod/package.json` agar tidak terbaca Vercel
3. Pakai `npm install --no-optional` atau override install command
4. **Deploy tanpa `--prebuilt`** — biarkan Vercel run fresh install di remote

### Kenapa pilih pendekatan ini

**Opsi 4 (`vercel deploy --prod --yes` no `--prebuilt`):** Paling minimal invasive — tidak perlu edit package config atau vercel config. Vercel remote environment tidak punya `node_modules/drizzle-zod/package.json` cached dengan `link:` (karena Vercel selalu install fresh dari `package-lock.json` yang resolusinya peer-based). Bundle tetap dibuild di remote dengan environment variables yang sama.

Opsi 1-3 perlu perubahan config yang akan persisted dan mungkin affect CI workflow lain.

### Yang harus dicek di masa depan supaya tidak terulang

- [ ] Kalau `vercel build --prod` gagal dengan `EUNSUPPORTEDPROTOCOL` atau `link:` errors, langsung fallback ke `vercel deploy --prod --yes` (tanpa `--prebuilt`) — biarkan Vercel run remote build
- [ ] Build time lebih lama (~3 min) karena Vercel install fresh — acceptable trade-off vs stuck tanpa deploy
- [ ] Jangan hapus `drizzle-zod` dari root package.json tanpa diskusi — dipakai di `lib/db` schema generation
- [ ] Related: memory `vercel-deploy-without-prebuilt-drizzle-zod-fix-20260904`

---

## [Deploy Errors — Comprehensive Playbook]

**Tanggal:** 2026-09-04
**Severity:** P1 Dev (deploy blocker, owner time wasted)
**Kelas masalah:** Vercel CLI + npm 11 + pnpm leftover + `.vercelignore` + runtime deploy config

**Owner directive:** "issue case deploy selalu error ini sering banget, harus punya catatan khusus agar case tidak terulang dan bisa cepat cari penyebabnya kalau bisa hilangkan sebab error agar kedepannya selalu lancar, tolong catat"

### Gejala (klasifikasi per fase)

**Phase A — Install (`npm install`):**
- `EUNSUPPORTEDPROTOCOL link:../drizzle-orm/dist` (2026-09-04)
- `Unsupported URL Type "workspace:*"` (2026-08-22)
- `settings.onlyBuiltDependencies.push is not a function` (2026-08-22)
- `EBADENGINE Unsupported engine { node: '22.x' }` (recurring warning)
- `ERR_PNPM_IGNORED_BUILDS` playwright/esbuild/msw (recurring)
- npm audit vulnerabilities blocking CI (2026-08-31)

**Phase B — Build (`npm run build`):**
- `failed to resolve "extends":"../../tsconfig.base.json"` (2026-09-01)
- `Error: No Output Directory named "dist" found` (2026-08-31)
- `MODULE_NOT_FOUND` for tsc when running `npx tsc` (2026-09-04)
- Sourcemap warnings `Can't resolve original location` (recurring, non-fatal)

**Phase C — Deploy (`vercel deploy`):**
- `Prebuilt deployment cannot be created because vercel build failed` (2026-09-04)
- `STATIC_BUILD_NO_OUT_DIR` (2026-08-29)
- Cache stale bundle hash served after deploy (recurring)
- Wrong project linked (`Workspace not found`) (2026-08-26)

**Phase D — Runtime (post-deploy):**
- SPA routes 404 (`/auth/callback`, dll) — build silently failed
- Backend 401, 429 errors (covered in separate entries)
- Bundle filename local ≠ production (memory warning)
- Branding not live — static HTML not updated (covered 2026-09-04)

### Root cause classes

1. **Tool mismatch**: pnpm workspace syntax (`workspace:*`, `link:`) tidak supported npm/Vercel
2. **Vercel vs local divergence**: Vercel install environment berbeda dari local (`node_modules/drizzle-zod` cached)
3. **`.vercelignore` over-broad**: `**/dist` blocks legitimate uploads
4. **CI/CD bypass**: GitHub Actions workflows broken → manual CLI deploy required
5. **`.gitignore` cross-contamination**: `dist/` excluded globally, breaks Vercel GitHub source
6. **Version pinning**: `@vercel/node` auto-injected by Vercel, may be vulnerable version
7. **Build context isolation**: Vercel builds in `/vercel/path0/` from subdirectory — parent config files not accessible

### Kalau error berulang

**SUDAH BERULANG** — kelas masalah ini muncul hampir setiap deploy attempt:
- 2026-08-22: pnpm→npm conversion
- 2026-08-26: wrong Vercel project linked
- 2026-08-29: `.vercelignore` blocking dist/
- 2026-08-31: CI `dist/` missing
- 2026-09-01: tsconfig extends parent
- 2026-09-04: `link:` drizzle-zod

**Penyebab utama berulang:** Tidak ada single playbook untuk diagnosis. Setiap error solved dengan cara berbeda. Owner harus tunggu AI debug, banyak waktu terbuang.

### Opsi yang dipertimbangkan

1. **Document-only** — tulis playbook, tidak fix root causes. Cepat tapi tidak menyelesaikan.
2. **Fix root causes + document** — apply permanent fixes untuk semua known patterns + maintain playbook. Lebih invasive.
3. **Migrate ke Vercel Native CI** — fix GitHub Actions workflows fully. Risiko tinggi, butuh re-validasi.

### Kenapa pilih pendekatan ini

**Opsi 2 (fix + document):** Permanent fixes untuk root causes yang bisa dihilangkan (low-risk config changes), comprehensive playbook untuk yang tidak bisa dihilangkan (e.g., npm strict mode vs drizzle-zod transitive dep).

Specific permanent fixes applied 2026-09-04:
- `artifacts/academic-workspace/vercel.json`: `installCommand: "npm install --legacy-peer-deps --omit=dev"` + `build.env.NPM_CONFIG_PRODUCTION=true`
- Reasoning: `drizzle-zod@0.8.3` has `link:` in devDeps; skipping devDeps in production install eliminates `EUNSUPPORTEDPROTOCOL`
- Risk: low — devDeps are not needed for Vite build (Vite is in dependencies, not devDependencies of academic-workspace)

Pending fixes tracked in memory `deploy-error-playbook-20260904.md`.

### Yang harus dicek di masa depan supaya tidak terulang

**Sebelum setiap deploy attempt:**
- [ ] Baca `.ai/lessons-learned.md` entry ini — cek apakah ada kelas masalah yang sama
- [ ] Baca `memory/deploy-error-playbook-20260904.md` — symptom-first diagnosis
- [ ] Run sanity check: `cd artifacts/academic-workspace && VITE_* npm run build` — kalau gagal, fix source dulu
- [ ] Cek `.vercel/output/` dan `dist/assets/index-*.js` timestamps — pastikan fresh

**Setelah deploy gagal:**
- [ ] Update playbook entry dengan error message exact + fix yang worked
- [ ] Cross-check apakah ada permanent fix yang belum applied
- [ ] Cek `.ai/issue-tracker.md` untuk pattern sebelumnya
- [ ] Kalau pattern baru: tambah entry di playbook, jangan cuma solve

**Setelah deploy sukses:**
- [ ] Verify via curl + bundle grep (pattern di playbook)
- [ ] Update `.ai/current-task.md` dengan deployment ID + bundle hash

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
