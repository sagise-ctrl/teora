// Custom esbuild plugin to resolve @workspace/* packages.
// Finds the api-server project root by looking for .vercel marker or package.json,
// then resolves .bundled/ or monorepo lib/ paths.
import path from "node:path";
import { existsSync } from "node:fs";

function findProjectRoot(startPath) {
  let current = path.dirname(startPath);
  const visited = new Set();
  while (current && !visited.has(current) && current !== path.sep && current !== "/") {
    visited.add(current);
    if (existsSync(path.join(current, ".vercel"))) return current;
    if (existsSync(path.join(current, "package.json"))) return current;
    current = path.dirname(current);
  }
  // Fallback: assume 4 levels up from api-server/src/*
  return path.dirname(path.dirname(path.dirname(path.dirname(startPath))));
}

function workspacePlugin() {
  return {
    name: "workspace-resolver",
    setup(build) {
      build.onResolve({ filter: /^@workspace\// }, (args) => {
        const pkgName = args.path;
        const importer = args.importer;
        const projectRoot = findProjectRoot(importer);

        const bundledPath = path.join(projectRoot, ".bundled", pkgName, "index.ts");

        // 1. Prefer .bundled/ — populated by setup-workspace.mjs before build.
        if (existsSync(bundledPath)) {
          return { path: bundledPath };
        }

        // 2. Fallback: monorepo root (local dev where lib/ is accessible).
        const monorepoRoot = path.resolve(projectRoot, "../..");
        const monorepoSrc = path.join(
          monorepoRoot,
          "lib",
          pkgName.replace("@workspace/", ""),
          "src",
          "index.ts"
        );
        if (existsSync(monorepoSrc)) {
          return { path: monorepoSrc };
        }

        return {
          errors: [
            {
              text: `Cannot resolve ${pkgName}. Checked: ${bundledPath}, ${monorepoSrc}. Run 'node ./setup-workspace.mjs' first.`,
              location: null,
            },
          ],
        };
      });
    },
  };
}

export default workspacePlugin;
