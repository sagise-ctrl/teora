# Deploy/Commit/Push Flow — Project Teora

> Analisis: alur ideal vs kondisi aktual, gap, dan masalah per langkah.
> Tanggal: 2026-09-13

---

## Alur Ideal (Best Practice)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BRANCH    → Feature branch (feat/*, fix/*, chore/*)    │
│ 2. CODE      → Write code, run local checks                │
│ 3. TEST      → typecheck + lint + unit test (local)       │
│ 4. COMMIT     → git commit (conventional commits)          │
│ 5. PUSH      → git push origin HEAD                        │
│ 6. CI RUN    → GitHub Actions: typecheck + lint + test     │
│ 7. PRE-DEPLOY CHECK → banned-deps scan (BLOCK if fail)     │
│ 8. BUILD     → GitHub Actions: production build             │
│ 9. DEPLOY    → Preview atau auto-deploy ke env target      │
│ 10. VERIFY   → Smoke test + curl healthz + feature check   │
│ 11. PROMOTE  → Preview → Production (jika preview OK)       │
│ 12. NOTIFY   → Owner/report: deploy status                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Kondisi Aktual

### Deployment Paths (Ada 3 Jalur)

| # | Jalur | Trigger | Otomatis? | Status |
|---|-------|---------|-----------|--------|
| A | GitHub Actions → Vercel (CI/CD) | Push ke `main` | ✅ Ya | Aktif |
| B | Manual Vercel CLI dari local | Manual | ❌ Tidak | SOP-001 ada tapi optional |
| C | `workflow_dispatch` (manual trigger) | Klik di GitHub UI | ⚠️ Semi | Aktif tapi manual |

### Jalur A: CI/CD GitHub Actions

**Backend (`deploy-backend.yml`)** — aktif:
```
on: push to main + paths: api-server/**, lib/db/**, workflow
Steps:
  [Checkout] → [Setup Node 22] → [npm ci] → [Verify workspace symlinks]
  → [Build API server (node build.mjs)] → [Prepare deployment package]
  → [Upload artifact] → [Deploy to Vercel --prod --yes]
  → [Health check (curl healthz)]
```

**Frontend (`deploy-frontend.yml`)** — aktif:
```
on: push to main + paths: academic-workspace/**, lib/**, package.json
Steps:
  [Checkout] → [Setup Node 22] → [rm node_modules + npm install]
  → [Build (vite build)] → [vercel deploy --prod --yes]
  → (TIDAK ADA post-deploy health check)
```

**CI (`ci.yml`)** — aktif:
```
on: push to main + PR to main
Jobs (parallel):
  [TypeScript check] + [ESLint] + [npm audit (tolerated)]
  + [Vitest api-server] + [Vitest frontend] + [Playwright E2E (tolerated)]
  + [npm run build]
```

**Branch Consistency (`branch-consistency-daily.yml`)** — aktif tapi JANGKAUAN TERBATAS:
```
on: schedule (cron 06:37 UTC) + workflow_dispatch
Checks:
  → sop-pre-deploy-banned-deps-check.sh (current tree only)
  → sop-cross-branch-consistency-check.sh --all (semua branch)
  ⚠️ TIDAK di-trigger otomatis oleh setiap deploy
```

---

## Gap Analysis — Per Langkah

### Langkah 1: BRANCH

| Item | Status |
|------|--------|
| Konvensi branch ada (`feat/`, `fix/`, `chore/`) | ✅ Ada di CLAUDE.md |
| Branch protection (main tidak boleh push langsung) | ❌ TIDAK ADA —任何人 bisa push ke main |
| Jumlah branch aktif | ⚠️ 9 branch lokal + 9 origin (banyak stale branches) |

**Masalah:**
- Tidak ada branch protection rule di GitHub Settings
- Branch `feat/daftar-task` punya 54+ commit yang tidak di-merge ke main
- Branch `gitsafe-backup/main` dan `replit-agent` tidak jelas fungsinya

### Langkah 2-3: TEST & COMMIT

| Item | Status |
|------|--------|
| TypeScript check | ✅ Ada di CI |
| ESLint | ✅ Ada di CI |
| Unit tests (Vitest) | ✅ Ada di CI (149 tests, 11 pre-existing failures tolerated) |
| E2E tests (Playwright) | ⚠️ Ada tapi gagal (lightningcss binary) — tolerated |
| Conventional commits | ✅ Ada konvensi di CLAUDE.md |
| Commit message lint (commitlint) | ❌ TIDAK ADA — conventional commits tidak di-enforce |

**Masalah:**
- E2E tests tidak pernah green — lightingcss binary issue (ERR-001 tracked)
- 11 pre-existing test failures tidak pernah di-fix
- Commit message format tidak di-validate otomatis
- npm audit tolerated — 16 vulnerabilities tidak pernah di-resolve

### Langkah 4: PUSH

| Item | Status |
|------|--------|
| Push ke feature branch | ✅ Normal |
| Push ke main | ⚠️ DIBOLEHKAN (CLAUDE.md: "NEVER push without owner") |
| Auto-push detection (local vs origin drift) | ❌ TIDAK ADA |
| GitHub branch protection | ❌ TIDAK ADA |

**Masalah:**
- ERR-020: 19 audit fix commits stuck di local `main` karena tidak di-push (owner perlu approve)
- Tidak ada GitHub protection rule yang require PR review sebelum push ke main
- CLAUDE.md rule "NEVER push without owner" tapi tidak ada tool/automasi yang enforce ini

### Langkah 5: CI RUN

| Item | Status |
|------|--------|
| Trigger on push to main | ✅ |
| Cancel-in-progress (concurrency) | ✅ Ada |
| Parallel jobs | ✅ |
| npm audit tolerated | ⚠️ Workaround (ERR-001) |
| E2E tolerated | ⚠️ Workaround (ERR-001) |

**Masalah:**
- CI tidak jalan untuk push ke feature branch (hanya `main` dan PR ke `main`)
- 11 pre-existing test failures tidak pernah di-resolve

### Langkah 6: PRE-DEPLOY CHECK

| Item | Status |
|------|--------|
| banned-deps check | ⚠️ HANYA di cron daily (branch-consistency-daily.yml), TIDAK di CI |
| banned-deps registry | ✅ Ada (`docs/ai-team/sops/banned-deps.json`) |
| tiktoken sudah di-ban | ✅ |

**Masalah:**
- **CRITICAL GAP:** banned-deps check TIDAK di-run sebelum CI/CD deploy
  - ERR-019 (tiktoken WASM) bisa masuk lagi tanpa detection
  - Setiap deploy tidak melewati banned-deps scan
- Script `sop-pre-deploy-banned-deps-check.sh` ada tapi TIDAK dipakai di `deploy-backend.yml`

### Langkah 7: BUILD

| Item | Status |
|------|--------|
| Backend build (node build.mjs) | ✅ |
| Frontend build (vite build) | ✅ |
| Workspace symlinks verification | ✅ (di CI) |
| Build artifact passthrough | ✅ (di deploy-backend.yml) |

**Masalah:**
- Build artifact preparation di CI manual (copy node_modules per-dep)
- Tidak ada bundling check untuk WASM/native deps sebelum deploy

### Langkah 8: DEPLOY

| Item | Status |
|------|--------|
| Backend → Vercel Function | ✅ (deploy-backend.yml) |
| Frontend → Vercel SPA | ✅ (deploy-frontend.yml) |
| Node version pinning (22) | ✅ |
| Deploy on feature branch | ⚠️ Hanya via `workflow_dispatch` (manual) |

**Masalah:**
- Tidak ada preview deploy otomatis untuk feature branch
- `workflow_dispatch` butuh input `branch` secara manual
- Frontend deploy TIDAK ada post-deploy verification (bandingkan dengan backend yang ada curl healthz)

### Langkah 9: VERIFY

| Item | Status |
|------|--------|
| Backend health check (curl healthz) | ✅ (di deploy-backend.yml) |
| Frontend smoke test | ❌ TIDAK ADA |
| SOP-001 4-step gate | ⚠️ Ada di dokumentasi, TIDAK di-enforce di CI/CD |
| Deploy verification gate | ❌ TIDAK ADA di deploy workflow |

**Masalah:**
- SOP-001 (local smoke → preview → verify → promote) TIDAK diintegrasikan ke CI
- Frontend完全没有 post-deploy check
- Tidak ada automatic rollback kalau healthz fail setelah promote

### Langkah 10: PROMOTE

| Item | Status |
|------|--------|
| Auto-promote setelah CI green | ✅ |
| Preview → Production separation | ❌ TIDAK ADA — langsung ke `--prod` |
| Preview URL deployment | ⚠️ Hanya manual (SOP-001) |

**Masalah:**
- Deploy langsung ke `--prod` tanpa preview phase
- Tidak ada mekanisme untuk "coba di preview dulu" yang otomatis

### Langkah 11: NOTIFY

| Item | Status |
|------|--------|
| Owner notification on CI failure | ⚠️ GitHub Actions email (default) |
| Owner notification on deploy success | ❌ TIDAK ADA |
| Post-deploy report | ❌ TIDAK ADA |
| Incident file on failure | ⚠️ Manual (SOP-001 reference, tidak di-enforce) |

**Masalah:**
- Owner tidak mendapat notifikasi otomatis ketika deploy baru berhasil di production
- Tidak ada systematic post-deploy verification yang dilaporkan

---

## Ringkasan Gap

| Severity | Gap | Lokasi |
|----------|-----|--------|
| 🔴 HIGH | banned-deps check tidak jalan di CI/CD deploy pipeline | deploy-backend.yml |
| 🔴 HIGH | SOP-001 verify gate tidak diintegrasikan ke CI | semua workflow |
| 🔴 HIGH | Frontend tidak ada post-deploy health check | deploy-frontend.yml |
| 🟡 MEDIUM | Branch protection tidak ada — bisa push langsung ke main | GitHub Settings |
| 🟡 MEDIUM | Commit message tidak di-validate (commitlint) | ci.yml |
| 🟡 MEDIUM | Deploy langsung ke prod, tidak ada preview phase | semua workflow |
| 🟡 MEDIUM | 11 pre-existing test failures tidak pernah di-resolve | ci.yml |
| 🟡 MEDIUM | Multiple stale branch aktif (`gitsafe-backup`, `replit-agent`, dll) | git branches |
| 🟡 MEDIUM | E2E tests broken (lightingcss) tapi tidak di-fix | ci.yml |
| 🟢 LOW | No deploy success notification to owner | semua workflow |
| 🟢 LOW | npm audit 16 vulns unresolved | ci.yml |

---

## Yang Sudah Berfungsi Baik

- ✅ Backend auto-deploy on push to main (path filter aktif)
- ✅ Frontend auto-deploy on push to main (path filter aktif)
- ✅ Node version pinning konsisten (22)
- ✅ CI: typecheck + test (meski ada failures)
- ✅ Health check di backend deploy
- ✅ banned-deps registry + daily cron scan
- ✅ SOP-001 + SOP-002 terdokumentasi dengan baik
- ✅ Error recovery skills ada (pnpm-vercel-deploy.md, vercel-prebuilt-deploy.md)
- ✅ Error-index lengkap dengan 20 entries

---

## Prioritas Perbaikan

### Prioritas 1 (Sebelum next deploy)

1. **Integrasi banned-deps check ke `deploy-backend.yml`** — step sebelum build
2. **Tambah health check ke `deploy-frontend.yml`** — curl atau simple smoke test
3. **Setup GitHub branch protection** — require PR + review untuk main

### Prioritas 2 (Sprint ini)

4. **Commitlint di CI** — validate conventional commit format
5. **Fix 11 pre-existing test failures** — atau document why they can't be fixed
6. **Fix E2E tests (lightingcss)** — atau remove dari CI kalau tidak bisa di-fix

### Prioritas 3 (Roadmap)

7. **Preview deploy otomatis untuk feature branch** — via Vercel preview URL
8. **Deploy success notification to owner** — Slack/email
9. **Integrasi SOP-001 gate ke CI** — optional preview phase sebelum prod
10. **Cleanup stale branches** — archive/hapus branch yang tidak aktif
