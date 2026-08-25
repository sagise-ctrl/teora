// Custom esbuild plugin to resolve @workspace/* packages.
// npm workspaces creates symlinks at the MONOREPO ROOT's node_modules/@workspace/.
// When running via `npm -w @workspace/api-server run build`, cwd may be the
// package directory (artifacts/api-server/), not the repo root. We walk up
// the directory tree to find the repo root (where workspaces are defined).
import path from "node:path";
import { existsSync } from "node:fs";

function findRepoRoot(startPath) {
  let current = startPath;
  const visited = new Set();
  while (current && !visited.has(current) && current !== path.sep && current !== "/") {
    visited.add(current);
    // The repo root has a node_modules/@workspace/ directory (npm workspaces)
    if (existsSync(path.join(current, "node_modules", "@workspace"))) {
      return current;
    }
    current = path.dirname(current);
  }
  // Fallback: use process.cwd()
  return process.cwd();
}

function workspacePlugin() {
  return {
    name: "workspace-resolver",
    setup(build) {
      build.onResolve({ filter: /^@workspace\// }, (args) => {
        const pkgName = args.path;
        const importer = args.importer;
        // Find repo root by walking up from the importing file
        const repoRoot = findRepoRoot(path.dirname(importer));

        // npm workspaces symlinks are at repoRoot/node_modules/@workspace/
        const npmWorkspacePath = path.join(repoRoot, "node_modules", pkgName);

        if (existsSync(npmWorkspacePath)) {
          // Resolve to the src/index.ts of the workspace package
          const srcPath = path.join(npmWorkspacePath, "src", "index.ts");
          if (existsSync(srcPath)) {
            return { path: srcPath };
          }
          // Package might export from root
          return { path: npmWorkspacePath };
        }

        return {
          errors: [
            {
              text: `Cannot resolve ${pkgName}. npm workspaces symlinks should be at ${npmWorkspacePath}. Run 'npm install' from the repo root.`,
              location: null,
            },
          ],
        };
      });
    },
  };
}

export default workspacePlugin;
