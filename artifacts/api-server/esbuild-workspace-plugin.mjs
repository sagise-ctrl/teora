// Custom esbuild plugin to resolve @workspace/* packages.
// With npm workspaces, packages are symlinked at node_modules/@workspace/ in the repo root.
// When running via `npm -w @workspace/api-server run build`, cwd is the repo root,
// so process.cwd() points to the repo root where the symlinks live.
import path from "node:path";
import { existsSync } from "node:fs";

function workspacePlugin() {
  return {
    name: "workspace-resolver",
    setup(build) {
      build.onResolve({ filter: /^@workspace\// }, (args) => {
        const pkgName = args.path;
        // In npm workspaces (cwd = repo root after npm -w), the symlinks are at node_modules/@workspace/
        const repoRoot = process.cwd();
        const npmWorkspacePath = path.join(repoRoot, "node_modules", pkgName);

        if (existsSync(npmWorkspacePath)) {
          // For ESM source files, resolve to the src/index.ts of the workspace package
          const srcPath = path.join(npmWorkspacePath, "src", "index.ts");
          if (existsSync(srcPath)) {
            return { path: srcPath };
          }
          // The package might export directly from the root
          return { path: npmWorkspacePath };
        }

        // Fallback: check if the package has a package.json with a main field
        const pkgJson = path.join(npmWorkspacePath, "package.json");
        if (existsSync(pkgJson)) {
          return { path: npmWorkspacePath };
        }

        return {
          errors: [
            {
              text: `Cannot resolve ${pkgName}. npm workspaces should create symlinks at ${npmWorkspacePath}. Run 'npm install' from the repo root first.`,
              location: null,
            },
          ],
        };
      });
    },
  };
}

export default workspacePlugin;
