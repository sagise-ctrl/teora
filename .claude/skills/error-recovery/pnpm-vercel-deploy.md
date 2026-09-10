# Error Recovery: pnpm + Vercel Deploy

> Procedural knowledge untuk pattern `pnpm_workspace_vercel_incompatibility`.
> **PROMOTED 2026-09-10** setelah 3 confirmed occurrences (ERR-003, ERR-012, ERR-013).

## Trigger

Gejala atau error signature yang mengindikasikan pattern ini:

- `EUNSUPPORTEDPROTOCOL` untuk `link:../drizzle-orm/dist` atau package monorepo lain di `pnpm-lock.yaml`
- Vercel build environment menolak `pnpm@6` + Node.js 24 (compatibility matrix)
- `vercel deploy --prod --yes` from local gagal dengan output yang tidak informatif
- Combined dengan `link:` protocol artifacts residual di lockfile

## Investigation Procedure

1. **Cek apakah project masih pakai pnpm**:
   ```bash
   ls -la pnpm-lock.yaml pnpm-workspace.yaml
   cat package.json | grep '"packageManager"'
   ```

2. **Cek Node version conflict**:
   ```bash
   node --version        # local
   vercel env ls         # production Node version
   ```

3. **Cek Vercel CLI + pnpm interaction**:
   ```bash
   which vercel
   vercel --version
   # Vercel CLI pnpm proxy: https://github.com/vercel/vercel/blob/main/...
   ```

4. **Inspect lockfile untuk `link:` artifacts**:
   ```bash
   grep -A 2 "link:" pnpm-lock.yaml | head -20
   ```

## Common Failed Approaches (JANGAN)

- ❌ **Tambah `engines` field ke package.json** — diabaikan Vercel, tidak fix root cause
- ❌ **Set `pnpm@6` di packageManager** — just locks in incompatibility
- ❌ **Manual delete `link:` lines di lockfile** — break resolution, doesn't migrate properly
- ❌ **Switch ke `pnpm@7/8/9` incremental** — semua versi pnpm akan hit Node 24 friction

## Recommended Fix

### Short-term (workaround) — sampai full migration

```bash
# 1. Pakai deploy tanpa --prebuilt (Vercel handles build remote)
vercel deploy --prod --yes

# 2. Pastikan env vars VITE_* di-set di Vercel dashboard
# (bukan inline, karena pnpm proxy issue)
```

### Long-term (architectural fix) — RECOMMENDED

**Full migration to npm workspaces:**

1. Backup `.vercelignore` content
2. Delete `pnpm-lock.yaml` + `pnpm-workspace.yaml`
3. Convert root + workspace `package.json` ke npm workspaces format:
   ```json
   {
     "workspaces": ["artifacts/*", "lib/*"]
   }
   ```
4. Replace `link:../package-name` di dependencies dengan `"*"` (npm workspaces native)
5. Run `npm install` → generates clean `package-lock.json`
6. Update CI/CD scripts dari `pnpm` ke `npm`
7. Update CLAUDE.md Quick Commands dari `pnpm --filter` ke `npm --workspace`
8. Remove pnpm dari system: `npm rm -g pnpm`

### Verification

- Method: `vercel build --prod` harus sukses locally
- Expected: EUNSUPPORTEDPROTOCOL error gone
- Actual: check deploy log
- Status: VERIFIED required

## Prevention

- **Test:** Add CI check yang fail kalau `pnpm-lock.yaml` exists setelah migration
- **Guardrail:** `.claude/rules/teora-guardrails.md` — "JANGAN pakai pnpm untuk Vercel deployment"
- **Pre-deploy checklist:** `.ai/lessons-learned.md` deploy playbook
- **CD check:** Verify no `link:` in lockfile before deploy

## Related Errors

- **ERR-003** (2026-08-22) — Initial pnpm → npm migration (commit 6bc4103)
- **ERR-012** (2026-09-04) — `vercel build --prod` fails on `link:` artifacts
- **ERR-013** (2026-09-10) — pnpm@6 + Node 24 incompatibility latest recurrence
