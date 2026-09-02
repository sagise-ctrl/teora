// Custom esbuild plugin to resolve @workspace/* packages.
// Priority order:
// 1. Check NODE_PATH env var (set by CI to include repo root node_modules)
// 2. Walk up from the importer file to find repo root, then check repoRoot/node_modules/@workspace/
// 3. Fallback to npm workspaces via monorepoRoot/lib/ paths
import path from "node:path";
import { existsSync, lstatSync, readlinkSync } from "node:fs";

// Resolves a symlink to its real filesystem path.
// On Windows with Git Bash, npm workspaces creates symlinks with Unix-style
// absolute targets (/e/teora/...) that don't work with Node.js existsSync.
// This function converts them to native Windows paths.
function resolveSymlinkTarget(p) {
  try {
    const stats = lstatSync(p);
    if (stats.isSymbolicLink()) {
      const target = readlinkSync(p);
      return target.replace(/\//g, path.sep);
    }
    return p;
  } catch {
    return p;
  }
}

function workspacePlugin() {
  return {
    name: "workspace-resolver",
    setup(build) {
      build.onResolve({ filter: /^@workspace\// }, (args) => {
        const pkgName = args.path; // e.g. "@workspace/db"
        // pkgName includes the @workspace/ prefix — strip it for path construction
        const pkgRelative = pkgName.replace(/^@workspace\//, "");
        const importer = args.importer;

        // 0. Check .bundled/ first (most reliable — works on any platform)
        //    setup-workspace.mjs copies @workspace/* sources here at build time.
        //    Path: <repo-root>/artifacts/api-server/.bundled/@workspace/<pkg>/src/index.ts
        if (importer) {
          const importerDir = path.dirname(importer);
          // Walk up from importer to find the api-server dir (where .bundled/ lives)
          let current = importerDir;
          const visitedBundled = new Set();
          while (current && !visitedBundled.has(current) && current !== path.sep && current !== "/") {
            visitedBundled.add(current);
            const bundledSrc = path.join(current, ".bundled", pkgName, "src", "index.ts");
            if (existsSync(bundledSrc)) {
              return { path: bundledSrc };
            }
            current = path.dirname(current);
          }
        }

        // 1. Check NODE_PATH (CI environment sets this to repo root node_modules)
        if (process.env.NODE_PATH) {
          const nodePathDirs = process.env.NODE_PATH.split(path.delimiter);
          for (const dir of nodePathDirs) {
            const pkgPath = path.join(dir, pkgRelative, "src", "index.ts");
            if (existsSync(pkgPath)) {
              return { path: pkgPath };
            }
            const pkgRoot = path.join(dir, pkgRelative);
            if (existsSync(pkgRoot)) {
              const srcIndex = path.join(pkgRoot, "src", "index.ts");
              if (existsSync(srcIndex)) {
                return { path: srcIndex };
              }
              return { path: pkgRoot };
            }
            // Symlink resolution for cross-platform compatibility
            const resolved = resolveSymlinkTarget(pkgRoot);
            if (resolved !== pkgRoot && existsSync(resolved)) {
              const srcIndex = path.join(resolved, "src", "index.ts");
              if (existsSync(srcIndex)) {
                return { path: srcIndex };
              }
              return { path: resolved };
            }
          }
        }

        // 2. Walk up from importer to find repo root (where npm workspaces symlinks live)
        const importerDir = path.dirname(importer);
        let current = importerDir;
        const visited = new Set();
        while (current && !visited.has(current) && current !== path.sep && current !== "/") {
          visited.add(current);
          const workspaceDir = path.join(current, "node_modules", "@workspace");
          if (existsSync(workspaceDir)) {
            const pkgRoot = path.join(workspaceDir, pkgRelative);
            const srcIndex = path.join(pkgRoot, "src", "index.ts");
            if (existsSync(srcIndex)) {
              return { path: srcIndex };
            }
            if (existsSync(pkgRoot)) {
              return { path: pkgRoot };
            }
            // Symlink resolution for cross-platform compatibility
            const resolved = resolveSymlinkTarget(pkgRoot);
            if (resolved !== pkgRoot && existsSync(resolved)) {
              const srcIndex = path.join(resolved, "src", "index.ts");
              if (existsSync(srcIndex)) {
                return { path: srcIndex };
              }
              return { path: resolved };
            }
          }
          current = path.dirname(current);
        }

        // 3. Fallback: check lib/ in monorepo root (local development)
        const monorepoRoot = path.resolve(importerDir, "..", "..", "..");
        const libSrc = path.join(monorepoRoot, "lib", pkgRelative, "src", "index.ts");
        if (existsSync(libSrc)) {
          return { path: libSrc };
        }

        return {
          errors: [
            {
              text: `Cannot resolve ${pkgName}. importer=${importer}. NODE_PATH=${process.env.NODE_PATH || "(none)"}`,
              location: null,
            },
          ],
        };
      });
    },
  };
}

export default workspacePlugin;
