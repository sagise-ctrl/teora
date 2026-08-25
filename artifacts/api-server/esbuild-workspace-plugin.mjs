// Custom esbuild plugin to resolve @workspace/* packages.
// Priority order:
// 1. Check NODE_PATH env var (set by CI to include repo root node_modules)
// 2. Walk up from the importer file to find repo root, then check repoRoot/node_modules/@workspace/
// 3. Fallback to npm workspaces via monorepoRoot/lib/ paths
import path from "node:path";
import { existsSync } from "node:fs";

function workspacePlugin() {
  return {
    name: "workspace-resolver",
    setup(build) {
      build.onResolve({ filter: /^@workspace\// }, (args) => {
        const pkgName = args.path;
        const importer = args.importer;

        // 1. Check NODE_PATH (CI environment sets this to repo root node_modules)
        if (process.env.NODE_PATH) {
          const nodePathDirs = process.env.NODE_PATH.split(path.delimiter);
          for (const dir of nodePathDirs) {
            const pkgPath = path.join(dir, pkgName, "src", "index.ts");
            if (existsSync(pkgPath)) {
              return { path: pkgPath };
            }
            // Also check if the package itself exists (not under src/)
            const pkgRoot = path.join(dir, pkgName);
            if (existsSync(pkgRoot)) {
              const srcIndex = path.join(pkgRoot, "src", "index.ts");
              if (existsSync(srcIndex)) {
                return { path: srcIndex };
              }
              return { path: pkgRoot };
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
            const pkgRoot = path.join(workspaceDir, pkgName);
            const srcIndex = path.join(pkgRoot, "src", "index.ts");
            if (existsSync(srcIndex)) {
              return { path: srcIndex };
            }
            if (existsSync(pkgRoot)) {
              return { path: pkgRoot };
            }
          }
          current = path.dirname(current);
        }

        // 3. Fallback: check lib/ in monorepo root (local development)
        // Assume importerDir is something like /repo/artifacts/api-server/src
        // So monorepo root is at importerDir/../../../.. = /repo
        const monorepoRoot = path.resolve(importerDir, "..", "..", "..");
        const libSrc = path.join(
          monorepoRoot,
          "lib",
          pkgName.replace("@workspace/", ""),
          "src",
          "index.ts"
        );
        if (existsSync(libSrc)) {
          return { path: libSrc };
        }

        return {
          errors: [
            {
              text: `Cannot resolve ${pkgName}. Checked: NODE_PATH=${process.env.NODE_PATH||'(none)'}, ${pkgName}/src/index.ts in workspace dirs, ${libSrc}. Set NODE_PATH or ensure 'npm install' ran from repo root.`,
              location: null,
            },
          ],
        };
      });
    },
  };
}

export default workspacePlugin;
