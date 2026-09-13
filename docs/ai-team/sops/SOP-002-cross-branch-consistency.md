# SOP-002 — Cross-Branch Consistency Check

## Purpose

Mencegah INC fix yang di-apply di satu branch tapi terlewat di branch lain yang share code surface (Case 2: branch divergen -> fix INC-004 hanya di main, feat/daftar-task masih punya tiktoken).

## Trigger

Apply di 3 kondisi:

1. **Sebelum merge branch apapun ke main**
2. **Sebelum `vercel deploy --prod --yes` dari branch apapun** (auto via pre-deploy script)
3. **Daily cron** (GitHub Actions atau scheduled task)

## Prosedur

### A. Maintain banned-deps registry

File: `docs/ai-team/sops/banned-deps.json` — single source of truth untuk deps yang TIDAK BOLEH ada di source code. Setiap INC baru yang related → update registry ini.

### B. Pre-merge check

Sebelum `git merge` atau `git push origin main`, run:

```bash
./scripts/sop-cross-branch-consistency-check.sh --target main
```

Script akan:
1. Read banned-deps dari `.ai/sops/banned-deps.json`
2. Untuk tiap dep, scan SEMUA branch aktif: `git grep` di `artifacts/api-server/src/`
3. Kalau ada dep banned di branch manapun → exit 1 + report branch + file + line

Kalau exit 1 → **BLOCK merge**, apply surgical fix dulu (contoh: cherry-pick INC-004 fix commit).

### C. Pre-deploy check

Sebelum `vercel deploy --prod --yes`:

```bash
./scripts/sop-pre-deploy-banned-deps-check.sh
```

Script scan working tree SAAT INI. Kalau ada banned dep → **BLOCK deploy**, exit 1.

### D. Daily cron (GitHub Actions)

File: `.github/workflows/branch-consistency-daily.yml`:

```yaml
name: branch-consistency-daily
on:
  schedule:
    - cron: '37 6 * * *'  # 06:37 UTC = 13:37 WIB, off-peak
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: chmod +x ./scripts/sop-*.sh
      - run: ./scripts/sop-cross-branch-consistency-check.sh --all
```

Kalau cron fail → GitHub Actions fail → notifikasi owner via email + `.ai/blockers.md` di-update.

## Verification

- Daily cron PASS hijau 7 hari berturut-turut
- Setiap INC baru terkait dep → update `.ai/sops/banned-deps.json` (append-only)
- Pre-deploy script return exit 0 untuk semua deploy produksi

## Rollback / Incident

Kalau check fail di branch yang punya live deploy risk:

1. Label branch dengan `INC-XXX`
2. Apply surgical fix (pattern: replace dep import dengan heuristic, contoh commit `66b1cab`)
3. Re-run check sampai exit 0
4. Deploy fix
5. Verify live (SOP-001 Step 4)

## Related

- `docs/ai-team/sops/SOP-001-deploy-verification-gate.md` — companion SOP
- `docs/ai-team/sops/banned-deps.json` — registry
- Memory: `~/.claude/projects/E--teora/memory/branch-divergence-reverts-audit-fixes-20260913.md`
- `.ai/error-index.md [ERR-019]` — pattern origin

## Changelog

- v1 — 2026-09-13 — created after INC-005 (branch hygiene SOP)
