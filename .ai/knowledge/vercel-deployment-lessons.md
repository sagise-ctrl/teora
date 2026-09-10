---
name: lessons-vercel-deployment
description: Lessons learned from Vercel deployment debugging session
metadata:
  type: reference
---

# Vercel Deployment Lessons Learned

## Date: 2026-08-22/23

## Root Causes (Root Level)

1. **npm workspaces hoisting is directory-scoped**: `npm install` in a workspace subdirectory does NOT hoist transitive deps from `file:` protocol workspace packages into that subdirectory's `node_modules`. The deps exist at root `node_modules/` but not accessible to esbuild running in the subdirectory.

2. **Vercel Framework Preset overrides vercel.json**: Setting "Express" framework preset in Vercel dashboard causes Vercel to ignore `installCommand` and `buildCommand` in `vercel.json`. Must be set to "Other" or deleted.

3. **`cd ../..` in vercel.json escapes project directory**: Vercel sandboxes builds within the project directory. `cd ../..` will fail because the parent directory is outside the deployment context.

4. **`workspace:` protocol not universally supported**: npm 11.12.1 does not support the `workspace:` protocol (even `workspace:*`). Only `file:` works.

5. **esbuild resolution is NOT Node.js resolution**: `require.resolve('@workspace/db')` works from subdirectory (uses Node module resolution algorithm), but esbuild does NOT use Node resolution — it has its own. Aliases must point to actual file paths, not package names.

6. **Vercel auto-detects serverless functions by filename**: Any `.ts` or `.js` file in `api/` directory that doesn't start with `_` is treated as a function source. Source and output cannot coexist with same basename. Solution: use `_handler.ts` as source, build to `_handler.mjs`, rename to `index.mjs`.

7. **`return;` at module scope breaks esbuild**: An `export` statement after a `return;` at module scope is a syntax error for esbuild's ESM bundler. Use if/else with variable declarations instead.

## What Failed

| Approach | Why It Failed |
|----------|--------------|
| `npm -w @workspace/api-server run build` from monorepo root | Framework preset overrides vercel.json on Vercel cloud |
| `cd ../.. && npm install` in buildCommand | `cd ../..` escapes Vercel project directory |
| Copy workspace packages to `.bundled/` | Missing transitive deps (drizzle-zod) not copied |
| `workspace:*` protocol | npm 11.12.1 doesn't support it |
| `api/index.ts` as source + `api/index.mjs` as output | Both seen as function sources by Vercel |
| `return;` early exit with exports after | esbuild rejects exports after return |

## What Worked (Locally)

- `npm -w @workspace/api-server run build` from monorepo root — works because all deps available at root node_modules
- `node ./build.mjs` with alias pointing to `../../lib/db` — works locally because `lib/` exists
- GitHub Actions CI already works correctly (checks out entire monorepo)

## What Needed (Vercel Cloud)

On Vercel build machine, only `artifacts/api-server/` is available. The `lib/` directory does NOT exist.

**Solution approaches**:
- **Option A**: Pre-bundle locally and upload artifact (tested, works — not autonomous)
- **Option B**: Bundle via GitHub Actions, deploy artifact (autonomous, CI-driven)
- **Option C**: Find esbuild plugin or technique to inline workspace packages without filesystem access
- **Option D**: Use `vercel.json` `rootDirectory` field to point to monorepo root

## Action Items

- [ ] Vercel Framework Preset was changed to "Other" — verify it takes effect
- [ ] Verify `vercel.json` is respected after framework preset removal
- [ ] Test build from clean state on Vercel cloud
- [ ] Consider Option B (GitHub Actions → artifact deploy) for truly autonomous pipeline

## Related

- The GitHub Actions workflow (`.github/workflows/ci.yml`) already has the correct build step: `npm ci` from root + `npm -w @workspace/api-server run build`
- The issue is only with manual Vercel CLI deploys (`vercel --yes`)
