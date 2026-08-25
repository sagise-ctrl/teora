// Copies workspace packages into .bundled/ so esbuild can resolve them.
// Handles both local dev (artifacts/api-server/) and Vercel (repo root extraction via --cwd).
//   Local dev:  __dirname ends with "artifacts/api-server"
//   Vercel:     __dirname is repo root (/vercel/path0), cwd is artifacts/api-server
import { cpSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect mode: if __dirname ends with "artifacts/api-server", we're in local dev.
// Otherwise, assume we're at repo root (Vercel with --cwd=artifacts/api-server).
const isLocalDev = __dirname.endsWith("artifacts/api-server") || __dirname.endsWith("artifacts\\api-server");

const apiServerDir = isLocalDev ? __dirname : join(__dirname, "artifacts/api-server");
const monorepoRoot = isLocalDev ? resolve(__dirname, "../..") : __dirname;

const libDbSrc = resolve(monorepoRoot, "lib/db/src");
const libApiZodSrc = resolve(monorepoRoot, "lib/api-zod/src");

// Bundled packages go to api-server directory so they're included in the Vercel deployment
// artifact (which is the api-server subdirectory, not the monorepo root).
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
