// Copies workspace packages into .bundled/ so esbuild can resolve them.
// On Vercel, only api-server/ is available — this reaches up to lib/ via parent traversal.
import { cpSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bundledDir = resolve(__dirname, ".bundled");
mkdirSync(bundledDir, { recursive: true });

const workspaces = [
  { name: "@workspace/db", src: resolve(__dirname, "../../lib/db/src") },
  { name: "@workspace/api-zod", src: resolve(__dirname, "../../lib/api-zod/src") },
];

for (const ws of workspaces) {
  const destDir = resolve(bundledDir, ws.name);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
    copyDir(ws.src, destDir);
    console.log(`Bundled ${ws.name}`);
  } else {
    console.log(`Skipped ${ws.name} (already exists)`);
  }
}

function copyDir(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}
