// Custom esbuild plugin to resolve @workspace/* packages.
// Strategy: 1) monorepo root, 2) .bundled/ (setup-workspace.mjs), 3) local node_modules.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function workspacePlugin() {
  return {
    name: "workspace-resolver",
    setup(build) {
      build.onResolve({ filter: /^@workspace\// }, (args) => {
        const pkgName = args.path; // e.g., "@workspace/db"

        // 1. Try monorepo root (local dev)
        const monorepoRoot = path.resolve(__dirname, "../..");
        if (existsSync(path.resolve(monorepoRoot, "lib/" + pkgName.replace("@workspace/", "") + "/src/index.ts"))) {
          return { path: path.resolve(monorepoRoot, "lib/" + pkgName.replace("@workspace/", "") + "/src/index.ts") };
        }

        // 2. Try .bundled/ (populated by setup-workspace.mjs — Vercel build)
        const bundledPath = path.resolve(__dirname, ".bundled", pkgName, "index.ts");
        if (existsSync(bundledPath)) {
          return { path: bundledPath };
        }

        // 3. Try local node_modules
        const localPath = path.resolve(__dirname, "node_modules", pkgName, "src/index.ts");
        if (existsSync(localPath)) {
          return { path: localPath };
        }

        return {
          errors: [{ text: `Cannot resolve ${pkgName}. Run 'node ./setup-workspace.mjs' first.`, location: null }],
        };
      });
    },
  };
}

export default workspacePlugin;
