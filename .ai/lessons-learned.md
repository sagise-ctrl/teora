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

## [Backend 401 "Unauthorized" — mount order middleware + JWT verification + trust proxy] `[ERR-009]`

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

## [Cross-origin cookie auth failure di Vercel proxy] `[ERR-006]`

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

## [Rate limiter blanket `app.use(path, limiter)` hits auto-called endpoints] `[ERR-007]`

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

## [Orphaned Vercel projects — MCP blind spot 403/404] `[ERR-016]`

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

## [pnpm workspace + Vercel incompatibility] `[ERR-003]`

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

## [Vercel `vercel deploy --prebuilt` serves stale `.vercel/output/` from cache] `[ERR-010]`

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

## [Vercel deploy — npm 11 strict rejects `link:` in pnpm-managed node_modules] `[ERR-012]`

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

## [Deploy Errors — Comprehensive Playbook] `[ERR-014 / ERR-015]`

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

## [Backend 500 — `db.sql is not a function` di /api/auth/login (Google OAuth flow)] `[ERR-005]`

**Tanggal:** 2026-09-05
**Severity:** P1 Production (login 100% broken untuk semua Google OAuth user)
**Kelas masalah:** Backend auth — Drizzle ORM API misuse + unhandled exception returns HTML

### Gejala

- Screenshot dari owner: setelah Google OAuth callback, `POST /api/auth/login` return 500 dengan HTML body Vercel default (`<pre>Internal Server Error</pre>`)
- Frontend `customFetch` tidak bisa parse HTML → tampil pesan generic "Login gagal" tanpa diagnostic
- `/api/healthz` masih 200, `/api/auth/me` masih return 401 normal → hanya endpoint `/auth/login` yang affected
- Vercel runtime logs: `TypeError: db.sql is not a function at file:///var/task/api/index.mjs:203503:23`

### Root cause

**Bug A — `db.sql` API salah**

Commit `4e00ed0` (username feature, 2026-09-04) menambahkan username backfill di `/api/auth/login`:
```typescript
.onConflictDoUpdate({
  target: usersTable.id,
  set: {
    email: supabaseUser.email ?? "",
    username: db.sql`COALESCE(${usersTable.username}, ${deriveUsername()})`,
  },
})
```

**`db` (Drizzle client) TIDAK mengekspor `sql`.** `sql` harus di-import terpisah dari `drizzle-orm`:
```typescript
import { sql, eq } from "drizzle-orm";
// ...
username: sql`COALESCE(${usersTable.username}, ${deriveUsername()})`,
```

Codebase punya 6 file lain yang import `sql` dengan benar (`admin.ts`, `ai-usage.ts`, `documents.ts`, `learning-activities.ts`, `projects.ts`, `usage.ts`). Auth.ts adalah outlier yang luput dari pola.

**Bug B — Unhandled exception returns HTML, bukan JSON**

Route handler `/auth/login` tidak punya try/catch wrapper. Saat `db.sql` throw TypeError:
- Express default error handler catches
- Vercel adapter renders HTML error page (`<!DOCTYPE html><pre>Internal Server Error</pre>`)
- Frontend `customFetch` mencoba `response.json()` → gagal → tampil "Login gagal" tanpa info

Owner tidak bisa debug dari frontend side karena HTML tidak informative. Root cause baru ketahuan setelah baca Vercel runtime logs.

### Kalau error berulang — apakah root cause sebelumnya sebenarnya belum teratasi?

**Kelas masalah BARU**, bukan berulang:
- 2026-08-28: 401 "No refresh token" (cross-origin cookie) → fixed body fallback
- 2026-09-01: 401 spam "Unauthorized" (mount order + JWT verify + trust proxy) → fixed
- **2026-09-05: 500 TypeError db.sql** (Drizzle API misuse + missing try/catch) → fixed

Tapi ada pola umum: **setiap fix auth-related butuh cek Vercel runtime logs untuk konfirmasi root cause**, bukan tebak dari response frontend. Frontend selalu menampilkan generic message — backend Vercel logs adalah satu-satunya source of truth untuk diagnosa.

### Opsi yang dipertimbangkan

1. **Patch `auth.ts` saja — fix `db.sql` → `sql`** (minimum viable)
2. **Fix `db.sql` + tambah try/catch wrapper** (chosen — defense in depth)
3. **Buat global Express error handler middleware** (overkill untuk 1 endpoint)

### Kenapa pilih pendekatan ini

**Opsi 2 (fix + try/catch):**
- **Fix root cause** (`db.sql` → `sql`) langsung jalan untuk use case sekarang
- **Try/catch wrapper** sebagai defense in depth: jika error lain muncul di route ini (misal: username conflict, DB connection drop), return JSON 500 dengan pesan Indonesia, BUKAN HTML Vercel
- Future bug lebih cepat di-diagnosa dari frontend karena error message lebih jelas
- Scope kecil: 1 file, ~150 baris reformat, no architectural change

Opsi 1 minimum — tapi lulus defense-in-depth test. Owner udah frustrasi screenshot "Login gagal" tanpa info → future error harus visible.

Opsi 3 terlalu besar — global error handler affect semua routes, butuh audit setiap response. Bisa di-deferred sampai pattern error lain muncul.

### Yang harus dicek di masa depan supaya tidak terulang

**Sebelum pakai Drizzle SQL template:**

- [ ] **SELALU import `sql` dari `drizzle-orm`**, BUKAN dari `db`
- [ ] `db` (Drizzle client) hanya punya method query (`select`, `insert`, `update`, `delete`, `transaction`) — TIDAK `sql`
- [ ] Reference: 6 file lain di codebase yang import `sql` benar — copy-paste pattern dari sana
- [ ] Pre-commit check: `grep "db\.sql" src/routes/` — harusnya 0 hits

**Sebelum commit route handler baru tanpa try/catch:**

- [ ] Route yang touch DB, AI provider, atau external API WAJIB punya try/catch wrapper
- [ ] Pattern minimal:
  ```typescript
  router.post("/...", async (req, res) => {
    try {
      // ... handler logic
    } catch (err) {
      console.error("[endpoint] unhandled", err);
      if (!res.headersSent) res.status(500).json({ error: "Pesan Indonesia" });
    }
  });
  ```
- [ ] Frontend `customFetch` expect JSON 4xx/5xx — HTML response bikin "Login gagal" tanpa diagnostic

**Saat debug frontend "Login gagal" / error generic tanpa specific reason:**

- [ ] **Baca Vercel runtime logs DULU**, jangan tebak dari response
- [ ] Pattern: `vercel logs <deployment-url> --no-color | grep "error"`
- [ ] Vercel MCP `get_runtime_logs` return 403 untuk project ini — pakai CLI fallback
- [ ] Frontend menampilkan "Login gagal" karena HTML unparseable → fix backend, BUKAN frontend

**Sebelum deploy backend yang modify Drizzle SQL:**

- [ ] Bundle verification: `grep "sql\`" api/index.mjs` — confirm SQL fragment compiled correctly
- [ ] Vercel logs check 5 menit post-deploy untuk unhandled errors
- [ ] Test endpoint dengan valid token (bukan cuma invalid → 401, tapi valid → 200 path)

**Cross-reference:**

- Related: DECISION 006 (per-route middleware + JWT verify pattern)
- Related: `.ai/decisions.md` entry auth flow improvements
- Memory: `deployment-environment-limits` — stop blind loops, cek logs langsung

---



## `--prebuilt` Vercel deploy breaks SPA fallback for this Vite project
- Gejala: `vercel deploy --prod --prebuilt` upload sukses (status READY), tapi `/langganan` (atau any SPA non-static route) return 404 atau 200/0 bytes. Halaman `/` return HTML correct, tapi deep routes return 404.
- Root cause: When `--prebuilt` is used, Vercel uses the `.vercel/output/config.json` that the developer provides. Untuk SPA fallback (`/(.*)` → `/static/index.html`), Vercel perlu tahu pattern filesystem + miss handler yang benar. Format minimal:
  ```json
  {"version":3,"routes":[{"src":"/(.*)","dest":"/static/$1"},{"src":"/","dest":"/static/index.html"}]}
  ```
  terlihat OK secara syntax tapi Vercel tidak fall-through ke route berikutnya saat file `/static/$1` tidak ada — langsung return 404. Format handle-based (`{ "handle": "filesystem" }, { "src": "/(.*)", "dest": "/static/$1", "check": true }, { "handle": "miss" }, { "src": "/(.*)", "dest": "/static/index.html" }`) lebih reliable, tapi pernah di-reject Vercel CLI dengan `Unexpected error. Please try again later. ()` tanpa indikasi masalah config. Format-only config tanpa handle bisa-bisa sukses upload tapi SPA broken.
- Kalau error berulang: ini BUKAN error yang sama dengan `vercel-deploy-without-prebuilt-drizzle-zod-fix-20260904` (yang membahas pnpm install error di remote). Ini kelas baru: `--prebuilt` config.json SPA fallback tidak reliable.
- Opsi yang dipertimbangkan:
  1. Fix config.json SPA fallback ke format handle-based → DEPLOY ERROR (`Unexpected error`)
  2. Fix config.json ke format minimal `/(.*)` → /static/index.html → STILL 404 untuk SPA routes
  3. **Gunakan `vercel deploy --prod --yes` TANPA `--prebuilt`** — Vercel run build + install di remote, automatically configure SPA routing correctly. **CHOSEN**
- Kenapa pilih opsi 3:
  - Workaround langsung, no config debugging required
  - Vercel npm install (dari `vercel.json` installCommand = `npm install --legacy-peer-deps`) sukses — masalah pnpm registry lokal sebelumnya ternyata HANYA muncul kalau cache pnpm stale (coba clear dengan `npm install --legacy-peer-deps` di local sebelum deploy)
  - SPA routing otomatis benar (Vite built-in pattern)
  - Downside: ~1m extra build time di remote (acceptable)
- Yang harus dicek di masa depan supaya tidak terulang:
  - **Untuk Vite SPA projects, SELALU pakai `vercel deploy --prod --yes` TANPA `--prebuilt`**. `--prebuilt` cocok untuk static-only deploy atau custom framework adapter, BUKAN Vite SPA.
  - Kalau `--prebuilt` wajib (mis. CI offline build), config.json HARUS pakai `handle: "filesystem"` + `handle: "miss"` pattern — BUKAN simple `/(.*)` routes. Test dengan curl ke deep route segera setelah deploy.
  - Clear pnpm cache sebelum deploy: `npm run build` lokal dulu, pastikan `dist/` fresh, lalu `rm -rf .vercel/output` sebelum generate ulang (kalau pakai --prebuilt).
  - Verifikasi post-deploy: `curl -o /dev/null -w "%{size_download}\n" https://URL/deep-route` — harus return size > 1000 (HTML shell). Kalau 0 atau 404, SPA broken.

**Cross-reference:**
- Memory: `vercel-deploy-without-prebuilt-drizzle-zod-fix-20260904` (pnpm install issue, kelas berbeda)
- Memory: `vercel-prebuilt-deploy-with-inline-env-20260904` (prebuilt pattern untuk env vars)

---

## Pricing Strategy — Anchored Rolling Window (Owner-defined 2026-09-08)
- Gejala: Awalnya definisi limit token 5 jam/7 hari ambigu — dimulainya kapan? Resetnya kapan?
- Root cause: Owner memakai model "anchored rolling window" — window timer di-ANCHOR ke first-use timestamp (bukan calendar). Reset terjadi setelah window durasi terlewati, BUKAN per calendar day.
- Logika final (owner-confirmed):
  - **5h cap** = 1/10 × 7d cap (overlap proteksi: kalau 5h cap < 7d/10, user bisa reach limit dalam 5 jam)
  - **7d cap** = subscription_days/7 × base 7d cap (15 hari = 2× base, 30 hari = 4× base)
  - **Cara hitung limit subscription**: subscription_days/7 × 7d cap. Contoh: 15 hari subscription + 7d base=100k → max subscription = 200k token (= 2× base)
  - **Window calculation**: DIMULAI dari first token use timestamp. Setelah 5 jam (atau 7 hari) dari waktu itu, window reset → limit penuh lagi.
  - **Reset**: window ELAPSED, full limit restored. BUKAN calendar-based reset.
- Opsi yang dipertimbangkan:
  1. Calendar-based reset (JAM 00:00, HARI KE-1) → DITOLAK owner
  2. **Anchored rolling window** → APPROVED
- Yang harus dicek di masa depan:
  - Backend logic pakai `now() - firstUseTimestamp` sebagai window_age, bukan `now()` vs calendar date
  - Subscription hard cap = `subscriptionDays / 7 * baseCap_7d` (bukan `subscriptionDays * dailyCap`)
  - Limit 5 jam reset HANYA setelah 5 jam dari window anchor (bukan per 5 jam calendar)

**Cross-reference:**
- Doc: `docs/ai-team/finance/pricing-strategy-2026-anthropic.md` Section 10 (Final Design)
- Page: `/langganan` (deployed for owner verification)

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

---

## [Vercel Deploy Blocked — pnpm localhost proxy + pnpm@6/Node.js 24 incompatibility] `[ERR-013]`

**Tanggal:** 2026-09-10
**Severity:** P1 Deploy Blocker
**Kelas masalah:** Vercel build environment pnpm configuration broken

### Gejala

Deploy gagal dengan error beruntun:

**Error 1 — pnpm proxy ke `127.0.0.1:8402`:**
```
WARN  GET http://127.0.0.1:8402/@radix-ui%2Freact-dialog error (ERR_INVALID_THIS)
ERR_PNPM_META_FETCH_FAIL  GET http://127.0.0.1:8402/@hookform%2Fresolvers
```
Vercel build machine menjalankan pnpm dan semua HTTP request diarahkan ke `127.0.0.1:8402` (localhost proxy). Proxy ini tidak ada di cloud → semua package fetch gagal.

**Error 2 — pnpm 6.35.1 + Node.js 24 `ERR_INVALID_THIS`:**
Setelah registry override ke `registry.npmjs.org`, error berubah jadi request KE registry.npmjs.org tetap gagal dengan `ERR_INVALID_THIS`. pnpm 6.35.1 punya bug dengan Node.js 24 (`v24.19.0` di Vercel build machine) — URLSearchParams tidak bisa di-pass sebagai konteks `this` yang salah.

**Error 3 — corepack pnpm@9 tidak meng-overwrite pnpm 6.35.1:**
`npm install -g pnpm@9` atau `corepack prepare pnpm@9 --activate` install pnpm 9.x tapi `pnpm install` berikutnya tetap gunakan pnpm 6.35.1 (shell hash/ PATH cache di environment Vercel).

**Error 4 — prebuilt mode serving 404:**
```
vercel deploy --prod --prebuilt --yes
# Status: READY
# curl https://... → "page could not be found NOT_FOUND"
# vercel inspect → 0 files uploaded
```
0 files ter-upload dengan `--prebuilt`. Deployment "READY" tapi tidak serving static files.

### Root cause

**Tiga masalah terpisah yang combine:**

1. **pnpm proxy `127.0.0.1:8402`:** Vercel build machine punya pnpm config yang menunjuk ke localhost proxy. Tidak ada di `.npmrc`, `pnpm config.toml`, atau environment variables lokal. Kemungkinan: Vercel project/team-level setting atau cached environment.

2. **pnpm 6.35.1 / Node.js 24 incompatibility:** Bug fundamental di pnpm 6.x dengan Node.js 24. Fix: upgrade ke pnpm 9.x. Tapi upgrade tidak berhasil karena shell cache.

3. **prebuilt routing 404:** `.vercel/output/config.json` tidak di-respected untuk static file serving saat pakai `--prebuilt` tanpa build step.

### Kalau error berulang

**YA — ini error kombinasi baru:**
- Masalah pnpm registry proxy BARU terdeteksi 2026-09-10 (sebelumnya mungkin build machine berbeda)
- Masalah pnpm/Node 24 incompatibility BARU karena Vercel update build machine ke Node 24.x
- `--prebuilt` 404 sudah pernah terjadi sebelumnya (entry terpisah di file ini)

### Opsi yang dipertimbangkan

**Untuk Error 1 & 2:**
1. Override registry via `pnpm install --config.registry=...` ✅ (fix proxy, tapi Error 2 tetap)
2. `npm install -g pnpm@9` → ❌ shell cache blok
3. `corepack prepare pnpm@9 --activate` → ❌ pnpm 6.x shim override
4. **Migrate to npm workspaces** → work-around, invasive
5. **Request Vercel support** untuk upgrade pnpm / use Node 22

**Untuk Error 4:**
1. Fix `config.json` routing → ❌ tidak ada format yang work
2. Fix `.vercelignore` (sudah done — exclude `.local` → file count turun drastis)

### Yang harus dicek di masa depan

**Diagnosis approach:**
1. `cat .vercel/output/diagnostics/cli_traces.json | grep fileCount` — kalau > 15,000, perlu fix `.vercelignore`
2. Cek `pnpm --version` di build machine — kalau 6.x + Node 24, deploy akan gagal
3. `vercel inspect` setelah deploy — kalau 0 files, prebuilt routing broken

**Fix yang sudah applied:**
- `.vercelignore` → tambah `**/.local` (exclude pnpm store — 28k files)
- Vercel project settings → `installCommand: "corepack enable && corepack prepare pnpm@9 --activate && pnpm install"`
- `artifacts/academic-workspace/vercel.json` → `installCommand: "pnpm install --config.registry=https://registry.npmjs.org/"`

**Investigasi lanjut needed:**
- [ ] Cari source proxy `127.0.0.1:8402` di Vercel dashboard (project settings atau team settings)
- [ ] Test apakah `corepack enable && pnpm install` menggunakan shim yang benar
- [ ] Test GitHub Actions deploy (CI/CD) sebagai work-around
- [ ] Pertimbangkan npm workspaces sebagai long-term fix

**Deploy work-around sementara (saat error ini terjadi):**
1. Build lokal: `pnpm run build` ( WORKS — lokal tidak ada proxy issue)
2. Commit + push ke branch → GitHub Actions CI/CD trigger Vercel deploy
3. Alternative: deploy dari environment tanpa proxy (bukan mesin ini)


---

## [2026-09-13] Deployment Drift — local main 19 commit tertahan

### Gejala

Fix yang sudah di-commit di local main TIDAK live di web sampai di-push ke origin/main. Concrete: H7 dark mode landing fix di-commit 2026-09-13 10:38 tapi live masih menampilkan teks invisible sampai push dilakukan 2026-09-13.

### Root cause

- CLAUDE.md Git Rules: "**NEVER** push to remote without owner instruction"
- 19 commit fix audit (H1-H8, M2-M10, L1-L5, M3) di-commit ke local `main` antara 2026-09-12 dan 2026-09-13
- `git push` TIDAK pernah dilakukan
- Vercel deploy triggered oleh `push` event ke branch `main` (`.github/workflows/deploy-frontend.yml`, `deploy-backend.yml`)
- Live = `origin/main` tip = `d80a7ca` (2026-09-12 00:59) → tidak punya fix-fiks
- Local main tip = `37df517` (2026-09-13) → punya 19 commit fix

### Kalau error berulang — apakah kelas masalah baru?

Ini **bukan bug teknis** tapi **workflow gap**: rule push yang terlalu konservatif + tidak ada scheduled sync check. Owner punya eksplisit exception untuk push hanya branch tertentu (feat/google-oauth-frontend, 0e880a7), tapi `main` tidak termasuk.

### Opsi yang dipertimbangkan

1. **Hapus rule "never push to main"** — terlalu liberal, risiko push yang belum siap
2. **Push setiap selesai batch audit** — sweet spot, push saat ada milestone fix yang sudah diverifikasi ✅
3. **Otomatis push setiap commit** — terlalu sering, risiko push yang belum dites
4. **Buat scheduled job yang sync local → origin tiap X jam** — bisa clash dengan force-push scenarios

### Kenapa pilih pendekatan ini

Approach hybrid per memory file `deployment-drift-local-vs-live-20260913.md`:
- Setelah fix milestone (audit selesai, fitur selesai), **default: tanya owner sekali untuk batch push**, dengan ringkasan apa yang akan di-push
- Emergency fix (production broken): **push langsung** lalu report, karena biaya downtime > risiko push yang belum direview
- TIDAK push setiap commit — overhead review jadi tidak praktis
- TIDAK ubah CLAUDE.md tanpa diskusi owner — rule eksplisit

### Yang harus dicek di masa depan supaya tidak terulang

- **WAJIB**: setiap akhir batch kerja, cek `git log origin/main..main --oneline` — kalau ada commit tertahan, tanya owner apakah push sekarang
- **WAJIB**: sebelum klaim "fix live", verifikasi commit ada di `origin/main` (bukan cuma local main)
- Checklist: `git fetch origin && git rev-parse origin/main` lalu bandingkan dengan local main
- Update `.ai/current-task.md` dengan section "Pending Push to origin/main" kalau ada commit tertahan
- Untuk owner: kalau ada beberapa fix yang sudah selesai dan live butuh, kasih instruksi "push batch" sekali
