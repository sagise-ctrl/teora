import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import workspacePlugin from "./esbuild-workspace-plugin.mjs";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect project root: if api/ exists in script dir, use script dir as project root.
// Otherwise, assume script dir is monorepo root and project is artifacts/api-server/.
const apiDirCandidate = path.join(__dirname, "api");
let apiServerDir;
if (existsSync(apiDirCandidate)) {
  apiServerDir = __dirname;
} else {
  apiServerDir = path.resolve(__dirname, "artifacts/api-server");
}
const EXTERNAL = [
  "@vercel/node",
  "*.node",
  "sharp",
  "better-sqlite3",
  "sqlite3",
  "canvas",
  "bcrypt",
  "argon2",
  "fsevents",
  "re2",
  "farmhash",
  "xxhash-addon",
  "bufferutil",
  "utf-8-validate",
  "ssh2",
  "cpu-features",
  "dtrace-provider",
  "isolated-vm",
  "lightningcss",
  "pg-native",
  "oracledb",
  "mongodb-client-encryption",
  "nodemailer",
  "handlebars",
  "knex",
  "typeorm",
  "protobufjs",
  "onnxruntime-node",
  "@tensorflow/*",
  "@prisma/client",
  "@mikro-orm/*",
  "@grpc/*",
  "@swc/*",
  "@aws-sdk/*",
  "@azure/*",
  "@opentelemetry/*",
  "@google-cloud/*",
  "@google/*",
  "googleapis",
  "firebase-admin",
  "@parcel/watcher",
  "@sentry/profiling-node",
  "@tree-sitter/*",
  "aws-sdk",
  "classic-level",
  "dd-trace",
  "ffi-napi",
  "grpc",
  "hiredis",
  "kerberos",
  "leveldown",
  "miniflare",
  "mysql2",
  "newrelic",
  "odbc",
  "piscina",
  "realm",
  "ref-napi",
  "rocksdb",
  "sass-embedded",
  "sequelize",
  "serialport",
  "snappy",
  "tinypool",
  "usb",
  "workerd",
  "wrangler",
  "zeromq",
  "zeromq-prebuilt",
  "playwright",
  "puppeteer",
  "puppeteer-core",
  "electron",
  "pg",
  "zod",
  "zod/v4",
  "drizzle-orm",
  "drizzle-zod",
];

const BANNER = `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`;

const PLUGINS = [workspacePlugin()];

// Build the Vercel HTTP handler (api/index.ts) -> api/index.mjs
// Vercel auto-detects serverless functions in the api/ directory
async function buildApiHandler() {
const apiDir = path.resolve(apiServerDir, "api");

  await esbuild({
    entryPoints: [path.resolve(apiServerDir, "api/_handler.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: apiDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: EXTERNAL,
    sourcemap: "linked",
    plugins: PLUGINS,
    banner: { js: BANNER },
  });
  // Rename _handler.mjs → index.mjs (Vercel expects api/index.mjs as the function entry)
  await rename(path.resolve(apiDir, "_handler.mjs"), path.resolve(apiDir, "index.mjs"));
}

// Build the Express server (src/index.ts) -> dist/index.mjs (local dev)
async function buildServer() {
  const distDir = path.resolve(apiServerDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(apiServerDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: EXTERNAL,
    sourcemap: "linked",
    plugins: PLUGINS,
    banner: { js: BANNER },
  });
}

async function buildAll() {
  // Build API handler first (Vercel Function — auto-detected in api/ dir)
  await buildApiHandler();
  // Build Express server for local dev
  await buildServer();
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
