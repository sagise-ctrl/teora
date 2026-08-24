// Copies workspace packages into .bundled/ so esbuild can resolve them.
// Script location determines the mode:
//   - If script is inside artifacts/api-server/ -> local dev (script dir IS apiServerDir)
//   - If script is at monorepo root -> Vercel deploy (project at artifacts/api-server/)
import { cpSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if package.json exists in the script's directory.
// On local dev: script is at artifacts/api-server/setup-workspace.mjs
//   -> package.json exists at artifacts/api-server/package.json -> apiServerDir = __dirname
// On Vercel: script is at /vercel/path0/setup-workspace.mjs
//   -> package.json does NOT exist at /vercel/path0/package.json -> apiServerDir = artifacts/api-server
const hasPackageJson = existsSync(join(__dirname, "package.json"));
const apiServerDir = hasPackageJson ? __dirname : join(__dirname, "artifacts/api-server");
const monorepoRoot = hasPackageJson ? resolve(__dirname, "../..") : __dirname;

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
