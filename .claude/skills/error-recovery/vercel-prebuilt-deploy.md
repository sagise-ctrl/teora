# Error Recovery: Vercel `--prebuilt` Deploy

> Procedural knowledge untuk pattern `vercel_prebuilt_cache_or_routing`.
> **PROMOTED 2026-09-10** setelah 4 confirmed occurrences (ERR-010, ERR-011, ERR-014, ERR-015).

## Trigger

Gejala atau error signature yang mengindikasikan pattern ini:

- `vercel deploy --prebuilt` upload sukses tapi served content stale (hash tidak match local `dist/`)
- `vercel inspect` menunjukkan "Builds [0ms]" — terlalu cepat, artinya pakai cache
- Vite SPA deep routes (`/projects/stats`, `/langganan`) return 404 atau 200/0 bytes setelah deploy
- `.vercel/output/` dari build sebelumnya masih ada di filesystem
- `.vercelignore` punya `**/dist` atau pattern yang exclude output yang di-prebuilt

## Investigation Procedure

1. **Verify served bundle vs local bundle hash**:
   ```bash
   # Local
   ls dist/assets/*.js | head -5

   # Deployed
   curl -s https://your-app.vercel.app | grep -o 'index-[A-Za-z0-9_-]*\.js'
   ```

2. **Inspect `.vercel/output/`**:
   ```bash
   ls -la .vercel/output/
   cat .vercel/output/config.json | grep -A 10 rewrites
   ```

3. **Inspect `.vercelignore`**:
   ```bash
   cat .vercelignore
   # Look for: **/dist, dist, etc.
   ```

4. **Inspect build config**:
   ```bash
   cat vercel.json
   # Look for: outputDirectory, rewrites, buildCommand
   ```

## Common Failed Approaches (JANGAN)

- ❌ **Re-run `vercel build` lalu deploy tanpa clean** — `.vercel/output/` akan dipakai incremental
- ❌ **Trust `--prebuilt` di CI** — environment cache berbeda dari local
- ❌ **Edit `vercel.json` rewrites lalu expect `--prebuilt` untuk embed** — rewrites di-strip during prebuild, harus include manual di `.vercel/output/config.json` post-build
- ❌ **Add `.vercelignore` rule untuk exclude `.vercel/`** — breaks the build output sendiri

## Recommended Fix

### For `--prebuilt` stale content (ERR-010, ERR-014, ERR-015):

```bash
# 1. Clean previous build
rm -rf .vercel/output/

# 2. Fresh build
vercel build

# 3. Verify output structure
ls -la .vercel/output/
cat .vercel/output/config.json | head -20

# 4. Deploy
vercel deploy --prebuilt --prod
```

### For Vite SPA 404 (ERR-011):

**JANGAN pakai `--prebuilt` untuk Vite SPA projects.** Pakai direct deploy:

```bash
vercel deploy --prod --yes
# Vercel handles buildCommand remote + SPA fallback properly
```

Atau kalau harus pakai `--prebuilt`, ensure post-build step:

```bash
vercel build

# Inject SPA fallback rewrites into config.json
cat .vercel/output/config.json | jq '.rewrites = [
  {"source": "/(.*)", "destination": "/index.html"}
] + .rewrites' > .vercel/output/config.json.tmp
mv .vercel/output/config.json.tmp .vercel/output/config.json

vercel deploy --prebuilt --prod
```

### For `.vercelignore` excluding dist (ERR-015, ERR-004):

Remove or comment `**/dist` from `.vercelignore`:

```diff
- **/dist
+ # **/dist  # Removed — needed for --prebuilt uploads
```

### Verification

- Method: Production URL bundle hash check + deep route navigation
- Command:
  ```bash
  curl -s https://your-app.vercel.app | grep -o 'index-[A-Za-z0-9_-]*\.js'
  curl -sI https://your-app.vercel.app/projects/stats
  ```
- Expected: bundle hash matches local `dist/`, deep routes return 200
- Status: VERIFIED required

## Prevention

- **Test:** Add post-deploy smoke test (curl key routes) to CI
- **Guardrail:** `.claude/rules/teora-guardrails.md` — warn against `vercel deploy --prebuilt` without clean
- **Pre-deploy checklist:**
  1. `rm -rf .vercel/output/`
  2. `vercel build` (fresh)
  3. Verify output structure
  4. THEN deploy
- **`.vercelignore` audit:** Quarterly review for `**/dist` or output-exclusion patterns

## Related Errors

- **ERR-004** (2026-08-29) — Production stale from `.vercelignore` excluding prebuilt dist
- **ERR-010** (2026-09-04) — `--prebuilt` serves stale cache
- **ERR-011** (2026-09-04) — `--prebuilt` strips SPA rewrites for Vite
- **ERR-014** (2026-09-04) — Workflow consistency (comprehensive playbook)
- **ERR-015** (2026-09-04) — `.vercelignore` recurring confusion
