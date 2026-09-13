# SOP-001 — Deploy Verification Gate

## Purpose

Mencegah deploy rusak di-promote ke production alias Vercel (Case 1: "web live tidak menampilkan data yang terupdate" — actually bukan data lama, tapi production serve deploy sehat terakhir, bukan deploy baru yang crash).

## Trigger

WAJIB apply SETIAP akan `vercel deploy --prod --yes`, dari branch apapun.

## Prosedur — 4-Step Gate

### Step 1 — Local smoke test (BLOCK kalau fail)

```bash
cd artifacts/api-server
pnpm run build
node -e "import('./dist/index.mjs')" && echo "LOCAL_OK"
```

Expected: TIDAK ada error `Missing ... .wasm`, `Cannot find module`, `MODULE_NOT_FOUND`. Kalau fail → **STOP, jangan deploy**.

### Step 2 — Deploy ke PREVIEW dulu (BLOCK kalau fail)

```bash
npx vercel deploy --yes
```

Output: preview URL `teora-backend-<hash>-sagise-ctrls-projects.vercel.app`. JANGAN pakai `--prod`.

### Step 3 — Verify preview (BLOCK kalau fail)

```bash
PREVIEW=$(npx vercel ls --json | jq -r '.[0].url')
curl -sS -o /dev/null -w "PREVIEW HTTP %{http_code}\n" "$PREVIEW/api/healthz"
# Harus HTTP 200
# Tunggu 5 menit, inspect runtime logs:
npx vercel logs "$PREVIEW" --since 5m | grep -iE "tiktoken|wasm|MODULE_NOT_FOUND|FUNCTION_INVOCATION"
# Harus kosong
```

Kalau ada error → **STOP, jangan promote**. Fix source, ulangi Step 1.

### Step 4 — Promote ke PROD (hanya setelah Step 3 = 200)

```bash
npx vercel deploy --prod --yes
```

Segera verify alias:

```bash
curl -sS -o /dev/null -w "ALIAS HTTP %{http_code}\n" https://teora-backend.vercel.app/api/healthz
# Harus HTTP 200 dalam 30 detik
```

## Verification (post-deploy)

- `npx vercel logs --since 5m` → grep `tiktoken|wasm|MODULE_NOT_FOUND` → harus kosong
- Alias 200 OK selama 5 menit berturut-turut
- Response time konsisten (bukan 1.9s cold start crash pattern)

## Rollback (kalau Step 4 gagal)

```bash
npx vercel rollback
# Alias kembali ke deploy sehat terakhir
```

Setelah rollback, **WAJIB file incident** di `.ai/incidents/YYYYMMDD-NNN.md` dan update `.ai/error-index.md`.

## Related

- `.ai/error-index.md [ERR-019]` — pattern `native_dependency_not_bundleable`
- `docs/ai-team/sops/SOP-002-cross-branch-consistency.md` — companion SOP
- `docs/ai-team/sops/banned-deps.json` — registry
- `scripts/sop-pre-deploy-banned-deps-check.sh` — auto-run sebelum Step 1
- Memory: `~/.claude/projects/E--teora/memory/deployment-drift-local-vs-live-20260913.md`

## Changelog

- v1 — 2026-09-13 — created after INC-005 (production alias safety)
