# Diskusi Owner — 2026-09-13 — SOP Creation Q&A

> Capture diskusi antara owner dan AI engineering team pada 2026-09-13 sore, setelah INC-005 resolution.
> Tujuan: dokumentasi permanen agar konteks keputusan tidak hilang antar sesi.

## Context

INC-005 sudah resolved (commit `66b1cab` deployed `dpl_3862xm4zRniQPnduqCyuJZnEpMRg`, production alias 200 OK). Owner minta:

> "setelah semua selesai langsung dokumentasikan agar tercatat, yg saya pahami disini ada 2 case:
>  1. web live tidak menampilkan data yg terupdate, kemungkinan karena deploy/commit setalahnya itu membawa data lama.
>  2. cari penyebab kenapa bisa terjadi case pada poin 1, ini diperlukan agar kedepannya tidak terjadi hal yg sama dan juga tidak terjadi error/kendala ketika proses deploy/commit/push ke web live."

## Q1 — Apakah 2 case itu bisa terulang lagi?

**Jawaban AI: Bisa, kalau SOP tidak disiplin.**

| Case | Bisa terulang? | Kenapa |
|------|----------------|--------|
| 1. Live web tidak update | Bisa, kalau deploy baru di-promote ke alias tapi ternyata rusak | Vercel alias by design serve deploy sehat terakhir. Aman oleh design, tapi tetap bisa crash kalau broken deploy dipromote |
| 2. Branch divergen | Bisa, kalau INC fix di branch A tapi tidak di-cherry-pick ke branch B/C | Root cause = disiplin cherry-pick manual, bukan tooling |

**Ringkas:** Case 1 aman oleh Vercel design. Case 2 aman selama SOP ditegakkan — **tapi tidak ada yang force guarantee**.

## Q2 — Tolong buatkan SOP agar 2 case tidak terulang lagi

**Jawaban AI:** Dibuat 2 SOP + registry + 2 executable scripts + 1 GitHub Actions workflow. Commit `9658bb3` di-push ke `origin/main`. INC-005 fix commit `66b1cab` juga di-push ke `origin/feat/daftar-task`.

| Artifact | Lokasi | Tujuan |
|----------|--------|--------|
| SOP-001 Deploy Verification Gate | `docs/ai-team/sops/SOP-001-deploy-verification-gate.md` | 4-step gate (local → preview → verify → promote) + auto-rollback |
| SOP-002 Cross-Branch Consistency | `docs/ai-team/sops/SOP-002-cross-branch-consistency.md` | Pre-merge + pre-deploy + daily cron scan semua branch |
| Banned-deps registry | `docs/ai-team/sops/banned-deps.json` | 7 deps: tiktoken, onnxruntime-node, bcrypt, better-sqlite3, sharp, canvas, @dqbd/tiktoken |
| Pre-deploy check | `scripts/sop-pre-deploy-banned-deps-check.sh` | Exit 1 kalau ada banned dep di working tree |
| Cross-branch check | `scripts/sop-cross-branch-consistency-check.sh` | `--target main` atau `--all` mode |
| Daily cron | `.github/workflows/branch-consistency-daily.yml` | 06:37 UTC setiap hari |

## Q3 — Apa itu Daily cron? Bagaimana cara tau kalau hijau?

**Jawaban AI:**

**Cron** = tugas terjadwal yang jalan otomatis di waktu tertentu tanpa klik manual. Script `sop-cross-branch-consistency-check.sh --all` jalan **setiap hari 06:37 UTC (= 13:37 WIB)** di server GitHub Actions.

Tujuan: scan 23 branch, cek apakah ada yang punya banned dep (tiktoken, dll). Kalau ketemu → otomatis gagal + notifikasi.

**Cara cek status:**

| Cara | Detail |
|------|--------|
| Browser (paling simpel) | https://github.com/sagise-ctrl/teora/actions/workflows/branch-consistency-daily.yml |
| ✅ Hijau (success) | Semua branch clean, tidak ada banned dep |
| ❌ Merah (failure) | Ada branch yang punya banned dep — perlu fix |
| 🟡 Kuning (in progress) | Lagi jalan |

**Enable email notif (recommended untuk owner non-programmer):**

1. Buka link workflow di atas
2. Klik tombol "..." (titik tiga) kanan atas workflow
3. Pilih "Enable email notifications"
4. Centang "Send notifications for failed workflows only"
5. Klik "Save"

Kalau merah → GitHub kirim email otomatis. Tidak perlu cek manual tiap hari.

**Trigger manual (test sekarang):**

1. Buka link workflow
2. Klik "Run workflow" (kanan atas)
3. Pilih branch `main` → klik "Run workflow"
4. Tunggu ~1 menit, refresh halaman → lihat hasilnya

**Status saat diskusi:**
- Script sudah jalan di lokal dan exit 0 ✅
- Workflow sudah di-push ke `origin/main`
- **Belum jalan otomatis** — first run besok 13:37 WIB, atau trigger manual pakai tombol di atas

## Decisions Made

1. **SOP-001**: 4-step gate WAJIB apply sebelum `vercel deploy --prod --yes` dari branch apapun. Auto-rollback kalau Step 4 fail.
2. **SOP-002**: 3 trigger (pre-merge + pre-deploy + daily cron). Registry append-only.
3. **Daily cron time**: 06:37 UTC (13:37 WIB) — off-peak, avoid round hour untuk hemat fleet capacity.
4. **Banned-deps list**: 7 deps confirmed un-bundleable by Vercel esbuild. Append new entry setiap INC baru terkait native dep.
5. **Push SOP + push INC-005**: Owner approve push 2 SOP ke main + push INC-005 fix ke feat/daftar-task sekaligus, supaya cross-branch cron langsung clean.

## Owner Approval

| Action | Approval |
|--------|----------|
| Push SOP ke origin/main (commit 9658bb3) | ✅ approved ("Push SOP + push feat/daftar-task INC-005") |
| Push INC-005 fix ke origin/feat/daftar-task (commit 66b1cab) | ✅ approved (same) |
| Diskusi ini didokumentasikan permanen | ✅ approved ("okey, pastikan simpan diskusi ini ke dokumentasi ya") |

## Related

- `.ai/incidents/20260913-002.md` — INC-005 post-mortem (lengkap dengan timeline)
- `.ai/current-task.md` — INC-005 ACTIVE section + audit closure
- `.ai/error-index.md [ERR-019]` — pattern `native_dependency_not_bundleable` occurrence 2
- `docs/ai-team/sops/SOP-001-deploy-verification-gate.md`
- `docs/ai-team/sops/SOP-002-cross-branch-consistency.md`
- Memory: `sop-deploy-verification-gate-20260913.md`
- Memory: `sop-cross-branch-consistency-20260913.md`
