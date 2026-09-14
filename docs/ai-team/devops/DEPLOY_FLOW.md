# DEPLOY_FLOW.md — Teora Deploy SOP

> **Single source of truth** untuk alur deploy Teora. Siapa pun (AI model baru, owner, kontributor eksternal) yang buka repo ini → baca file ini dulu → langsung tahu cara deploy.

**Versi:** 1.0 (2026-09-14)
**Owner:** Product (non-teknikal, full AI engineering)
**Project type:** Monorepo (npm workspaces) — React SPA + Express API
**Hosts:** Vercel (frontend + backend)

---

## 🎯 Tujuan SOP

1. **Alur konsisten** — siapapun yang deploy, jalannya sama
2. **Zero manual step** — owner tidak perlu ACCU untuk deploy rutin
3. **Reliable** — kalau ada error, rollback 1 klik
4. **Traceable** — semua deploy tercatat di Vercel + GH Actions audit log

---

## 📐 Alur Deploy (visual)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: AI Engineer / Owner edit kode                       │
│   (worktree atau local main, sesuai SOP development)        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Commit + push ke branch                             │
│   git checkout -b feat/nama-fitur                           │
│   git commit -m "feat: deskripsi"                           │
│   git push origin feat/nama-fitur                           │
│   ⚠️ ACCU push ke remote (per CLAUDE.md Git Rules)         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Open PR ke main                                     │
│   gh pr create --title "..." --body "..."                   │
│   (atau pakai GitHub web UI)                                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: CI auto-runs (ci.yml)                               │
│   - commitlint (conventional commit format)                 │
│   - typecheck                                                │
│   - lint                                                     │
│   - test (vitest)                                           │
│   - build                                                    │
│   ⏱️ ~3-5 menit                                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
   CI PASS ✅                    CI FAIL ❌
        ↓                             ↓
┌──────────────────────┐    ┌──────────────────────┐
│ Step 5: Auto-merge    │    │ Step 5 alt: Fix code │
│   workflow aktif      │    │   - lihat error log  │
│   - semua check pass  │    │   - fix              │
│   - branch up-to-date │    │   - push ulang       │
│   - squash merge      │    │   - auto-merge retry │
│   ⏱️ ~30 detik       │    └──────────────────────┘
└──────────┬───────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Vercel auto-deploy production                       │
│   - Git Integration detect push ke main                     │
│   - Vercel build + deploy                                   │
│   - Production URL updated                                  │
│   ⏱️ ~1-2 menit                                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Post-deploy verification (Vercel runtime logs)       │
│   - Vercel monitor HTTP 200                                 │
│   - Owner cek Vercel dashboard                              │
│   - Kalau ada error → rollback 1 klik                       │
└─────────────────────────────────────────────────────────────┘
```

**Total time dari push branch → production live: ~5-8 menit (mostly auto).**

---

## 🚀 Step-by-Step "Kalau Mau Deploy"

### Untuk AI Engineer / Owner

1. **Edit kode di branch baru** (atau worktree)
   ```bash
   git checkout -b feat/nama-fitur
   # edit kode
   ```

2. **Commit dengan conventional format** (CI akan reject kalau salah)
   ```bash
   git add .
   git commit -m "feat: tambah fitur X"
   # types yang valid: feat, fix, refactor, test, docs, chore, perf, security, ci, build
   ```

3. **Push branch ke origin** (perlu ACCU owner — per CLAUDE.md Git Rules)
   ```bash
   git push origin feat/nama-fitur
   ```

4. **Open PR ke main** (auto-merge akan handle sisanya)
   ```bash
   gh pr create --title "feat: tambah fitur X" --body "Deskripsi perubahan"
   ```
   - Label: `auto-merge` (kalau tidak auto-applied)

5. **Tunggu CI + auto-merge + Vercel deploy** (~5-8 menit)
   - Cek progress di: https://github.com/sagise-ctrl/teora/actions
   - Cek production: https://academic-workspace-eta.vercel.app

6. **Verify production** — buka URL, cek functionality

### Kalau Auto-Merge Gagal

| Penyebab | Solusi |
|----------|--------|
| CI fail | Lihat log error, fix kode, push ulang |
| Branch out-of-date | `gh pr update-branch` atau rebase |
| Conflict dengan main | Resolve conflict, push ulang |

---

## ⚙️ Branch Protection Setup (Owner Action — 5 menit)

**Wajib di-set supaya auto-merge berfungsi. Tanpa ini, PR bisa di-merge langsung tanpa CI check.**

1. Buka https://github.com/sagise-ctrl/teora/settings/branches
2. Klik **Add rule** (atau edit existing `main`)
3. **Branch name pattern:** `main`
4. Centang:
   - ☑ **Require a pull request before merging**
   - ☑ **Require approvals:** 0 (auto-merge tanpa review — owner ACCU sudah di push step)
   - ☑ **Require status checks to pass before merging**
     - Search & select: `CI / CI` (job utama di `ci.yml`)
   - ☑ **Require branches to be up to date before merging**
   - ☑ **Require linear history** (squash merge only)
   - ☑ **Allow auto-merge**
   - ☑ **Do not allow bypassing the above settings** (optional tapi recommended)
5. Klik **Create** / **Save changes**

**Setelah setup:**
- Push branch → PR opened → CI runs → kalau pass → auto-merge dalam 30 detik
- Tidak perlu ACCU lagi untuk deploy ✅

---

## 🔄 Rollback Procedure (Kalau Production Error)

**Time to rollback: 30 detik**

### Opsi A — Vercel Dashboard (recommended)

1. Buka https://vercel.com/dashboard → project `academic-workspace`
2. Klik tab **Deployments**
3. Cari deployment terakhir yang **sehat** (state: READY)
4. Klik menu (⋮) → **Promote to Production**
5. Production kembali ke versi sebelumnya dalam ~30 detik

### Opsi B — Revert + Auto-Deploy

```bash
git revert <commit-hash-yang-bermasalah>
git push origin main  # ACCU owner
# Auto-deploy trigger via Git Integration
```

### Opsi C — Vercel CLI (kalau ada akses)

```bash
npx vercel rollback --token=$VERCEL_TOKEN
```

---

## 🛠️ Troubleshooting

### "Auto-merge tidak trigger"

| Cek | Solusi |
|-----|--------|
| Branch protection belum set | Lihat section Branch Protection Setup di atas |
| CI check `CI / CI` tidak required | Add required check di branch protection |
| Branch out-of-date | Update branch: `gh pr update-branch` |
| Conflict dengan main | Resolve conflict manual, push ulang |

### "Vercel deploy gagal"

| Cek | Solusi |
|-----|--------|
| Build error | Lihat Vercel build logs di dashboard |
| Environment variables hilang | Cek Settings → Environment Variables |
| Root directory salah | Cek Settings → Git → Root Directory = `artifacts/academic-workspace` |

### "Production 500 error setelah deploy"

1. **Rollback dulu** (lihat prosedur di atas) — prioritas stabilkan production
2. Baru investigasi root cause dari Vercel runtime logs
3. Fix + push branch baru → auto-deploy version baru

---

## 📋 Checklist Owner (Setup Awal)

| # | Item | Status |
|---|------|--------|
| 1 | ✅ Vercel Git Integration connected ke `sagise-ctrl/teora` | Done 2026-09-14 |
| 2 | ✅ Root Directory: `artifacts/academic-workspace` | Done |
| 3 | ✅ Environment Variables (VITE_*) terset | Done |
| 4 | ⏳ Branch protection setup di GitHub Settings | **TODO (5 menit)** |
| 5 | ⏳ Auto-merge workflow file | Setup di workflow ini (auto-created) |
| 6 | ⏳ Test auto-merge dengan push branch baru | **TODO (verify)** |

---

## 🤖 Untuk AI Models Baru

**Setiap sesi baru, WAJIB baca file ini** (per CLAUDE.md Session Start Protocol):

1. `.ai/current-task.md` — task aktif
2. `.ai/decisions.md` — DECISION 019 (layered deploy strategy)
3. **`docs/ai-team/devops/DEPLOY_FLOW.md`** ← file ini (alur deploy)
4. `.ai/lessons-learned.md` — error history

**Setelah baca, harus bisa jawab:**
- Q: "Bagaimana cara deploy?"
- A: "Push branch → open PR → auto-merge kalau CI pass → Vercel auto-deploy."

---

## 📞 Kontak & Reference

- **Vercel Dashboard:** https://vercel.com/sagise-ctrl
- **GitHub Repo:** https://github.com/sagise-ctrl/teora
- **Production URL:** https://academic-workspace-eta.vercel.app
- **Backend URL:** https://teora-backend.vercel.app
- **SOP-001 (deploy verification gate):** `docs/ai-team/sops/SOP-001-deploy-verification-gate.md`
- **DECISION 019 (layered strategy):** `.ai/decisions.md`

---

**Last updated:** 2026-09-14 (Phase 1 deploy pipeline hardening complete)
**Next review:** Setelah 2 minggu stabil (target: 2026-09-28)
