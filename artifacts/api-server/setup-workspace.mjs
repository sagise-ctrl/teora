// Copies workspace packages into .bundled/ so esbuild can resolve them.
// DEPRECATED: Now using npm workspaces natively via `npm -w @workspace/api-server run build`.
// This file is kept for reference but no longer used by the CI workflow.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isLocalDev = __dirname.endsWith("artifacts/api-server") || __dirname.endsWith("artifacts\\api-server");
const apiServerDir = isLocalDev ? __dirname : join(__dirname, "artifacts/api-server");
const monorepoRoot = isLocalDev ? resolve(__dirname, "../..") : __dirname;

const libDbSrc = resolve(monorepoRoot, "lib/db/src");
const libApiZodSrc = resolve(monorepoRoot, "lib/api-zod/src");

const bundledDir = join(apiServerDir, ".bundled");
mkdirSync(bundledDir, { recursive: true });

const workspaces = [
  { name: "@workspace/db", src: libDbSrc },
  { name: "@workspace/api-zod", src: libApiZodSrc },
];

for (const ws of workspaces) {
  const destDir = join(bundledDir, ws.name);
  mkdirSync(destDir, { recursive: true });
  copyDir(ws.src, destDir);
  console.log(`Bundled ${ws.name}`);
}

function copyDir(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}
