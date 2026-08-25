// Custom esbuild plugin to resolve @workspace/* packages.
// Finds the api-server project root by looking for package.json,
// then resolves .bundled/ or lib/ paths.
import path from "node:path";
import { existsSync } from "node:fs";

function findProjectRoot(startPath) {
  let current = path.dirname(startPath);
  const visited = new Set();
  while (current && !visited.has(current) && current !== path.sep && current !== "/") {
    visited.add(current);
    if (existsSync(path.join(current, "package.json"))) return current;
    current = path.dirname(current);
  }
  // Fallback: use process.cwd() — should be api-server directory in both local dev and Vercel
  return process.cwd();
}

function workspacePlugin() {
  return {
    name: "workspace-resolver",
    setup(build) {
      build.onResolve({ filter: /^@workspace\// }, (args) => {
        const pkgName = args.path;
        const importer = args.importer;
        // projectRoot is used only to derive the lib/ fallback path
        const projectRoot = findProjectRoot(importer);

        // 1. Prefer .bundled/ — populated by setup-workspace.mjs before build.
        // Uses process.cwd() to locate .bundled/ in the api-server directory
        // (which is always process.cwd() when npm -w runs).
        const bundledPath = path.join(process.cwd(), ".bundled", pkgName, "index.ts");
        if (existsSync(bundledPath)) {
          return { path: bundledPath };
        }

        // 2. Fallback: lib/ in monorepo root (local dev only).
        // Derive monorepo root from projectRoot: api-server is at monorepoRoot/artifacts/api-server
        const monorepoRoot = path.resolve(projectRoot, "../..");
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
              text: `Cannot resolve ${pkgName}. Checked: ${bundledPath}, ${libSrc}. Run 'node ./setup-workspace.mjs' first.`,
              location: null,
            },
          ],
        };
      });
    },
  };
}

export default workspacePlugin;
