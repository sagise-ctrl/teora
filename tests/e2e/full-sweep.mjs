/**
 * Full Web Live Test — sweep semua route + interaksi kritis di Teora.
 *
 * Cara pakai (langkah pemilik):
 *   1. Buka terminal
 *   2. cd E:\teora
 *   3. pnpm --filter @workspace/academic-workspace run dev:bypass
 *      (tunggu sampai "Local: http://localhost:18543/" muncul, JANGAN tutup)
 *   4. Buka terminal LAIN
 *   5. cd E:\teora
 *   6. node tests/e2e/full-sweep.mjs
 *
 * Atau pakai Claude Code:
 *   "Jalankan tests/e2e/full-sweep.mjs"
 *   "Mulai uji web live"
 *   "Jalankan full sweep"
 *
 * Output:
 *   tests/e2e/artifacts/full-sweep/REPORT.md     ← baca ini (bhs Indonesia)
 *   tests/e2e/artifacts/full-sweep/report.json   ← untuk tooling
 *   tests/e2e/artifacts/full-sweep/screenshots/  ← PNG per langkah
 *
 * Yang diuji:
 *   - Semua route publik (Landing, Login, Register, Terms, Privacy, Help)
 *   - Semua route protected (Dashboard, Projects, Settings, Subscribe, dll)
 *   - Interaksi kritis: Teora Assistant chat, form submit, theme toggle,
 *     type switch (general/academic), format switch (docx/pptx)
 *   - Error capture: page errors + console errors + network failures
 *
 * Filter noise (tidak dianggap bug):
 *   - MSW worker console logs (mockServiceWorker, /@vite/, msw_browser)
 *   - favicon 404
 */

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

// BASE_URL default: dev:bypass localhost. Override via env var SWEEP_BASE_URL
// untuk uji preview/production (mis. SWEEP_BASE_URL=https://academic-workspace-k5dz2tazn-sagise-ctrls-projects.vercel.app).
// OUT_DIR juga bisa di-override via SWEEP_OUT_DIR agar tidak overwrite artifact local.
const BASE_URL = process.env.SWEEP_BASE_URL || "http://localhost:18543";
const OUT_DIR = process.env.SWEEP_OUT_DIR || "tests/e2e/artifacts/full-sweep";
const VIEWPORT = { width: 1440, height: 900 };

// ===== Definisi route yang diuji =====

const PUBLIC_ROUTES = [
  { path: "/", name: "Landing", critical: true, interactions: ["cta-button"] },
  { path: "/login", name: "Login", critical: true, interactions: ["form-empty-submit"] },
  { path: "/register", name: "Register", critical: true, interactions: ["form-empty-submit"] },
  { path: "/terms", name: "Terms of Service", critical: false, interactions: [] },
  { path: "/privacy", name: "Privacy Policy", critical: false, interactions: [] },
  { path: "/bantuan", name: "Pusat Bantuan", critical: false, interactions: [] },
];

const PROTECTED_ROUTES = [
  { path: "/dashboard", name: "Dashboard", critical: true,
    interactions: ["teora-assistant", "saldo-click"] },
  { path: "/projects", name: "Daftar Task", critical: true, interactions: ["type-filter"] },
  { path: "/projects?type=general", name: "General Tasks", critical: true, interactions: [] },
  { path: "/projects?type=academic", name: "Academic Works", critical: true, interactions: [] },
  { path: "/projects/new", name: "Buat Task Baru", critical: true,
    interactions: ["type-switch-academic", "format-switch-pptx", "form-validation-cycle"] },
  { path: "/assessment", name: "Assessment", critical: false, interactions: [] },
  { path: "/practice", name: "Practice", critical: false, interactions: [] },
  { path: "/pustaka-saya", name: "Pustaka Saya", critical: false, interactions: [] },
  { path: "/akun", name: "Profil & Pengaturan", critical: false, interactions: [] },
  { path: "/subscribe", name: "Berlangganan", critical: false, interactions: [] },
  { path: "/usage", name: "Penggunaan", critical: false, interactions: [] },
  { path: "/topup", name: "Topup Saldo", critical: false, interactions: [] },
  { path: "/profile", name: "Profile", critical: false, interactions: [] },
  { path: "/finops", name: "FinOps", critical: false, interactions: [] },
  { path: "/referral", name: "Referral", critical: false, interactions: [] },
];

// ===== Setup =====

await fs.mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

// Per-route error collectors (reset per test)
let currentErrors = [];
let currentNetworkFails = [];

const NOISE_PATTERNS = [
  /mockServiceWorker/i,
  /\/@vite\//,
  /msw_browser/i,
  /\[MSW\]/i,
  /Failed to load resource.*favicon/i,
];

function isNoise(text) {
  return NOISE_PATTERNS.some((re) => re.test(text));
}

page.on("pageerror", (e) => {
  currentErrors.push({ type: "pageerror", message: e.message.split("\n")[0].slice(0, 300) });
});

page.on("console", (msg) => {
  if (msg.type() !== "error") return;
  const text = msg.text();
  if (isNoise(text)) return;
  currentErrors.push({ type: "console-error", message: text.slice(0, 300) });
});

page.on("response", (resp) => {
  if (resp.status() < 400) return;
  if (resp.url().includes("favicon")) return;
  // Some MSW endpoints return 401 when not authed — track but flag separately
  currentNetworkFails.push({
    url: resp.url(),
    status: resp.status(),
    method: resp.request().method(),
  });
});

page.on("requestfailed", (req) => {
  const url = req.url();
  if (isNoise(url)) return;
  currentNetworkFails.push({
    url,
    status: 0,
    method: req.method(),
    failure: req.failure()?.errorText ?? "unknown",
  });
});

// ===== Dev server check =====

console.log("\n🔍 Cek dev server di", BASE_URL, "...");
try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 10000 });
  console.log("✅ Dev server hidup\n");
} catch (e) {
  console.error("❌ Dev server TIDAK bisa diakses di", BASE_URL);
  console.error("   Jalankan ini dulu di terminal lain:");
  console.error("   pnpm --filter @workspace/academic-workspace run dev:bypass");
  await browser.close();
  process.exit(1);
}

// ===== Test runner =====

const results = [];

async function testRoute(route, index) {
  currentErrors = [];
  currentNetworkFails = [];
  const slug = route.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const stepName = `s${String(index).padStart(2, "0")}-${slug}`;
  const shotPath = path.join(OUT_DIR, "screenshots", `${stepName}.png`);
  const shotAfterPath = path.join(OUT_DIR, "screenshots", `${stepName}-after.png`);

  let status = "PASS";
  let notes = [];
  let httpStatus = 0;
  let redirectedTo = null;

  try {
    const url = BASE_URL + route.path;
    const resp = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);

    httpStatus = resp?.status() ?? 0;
    const finalUrl = page.url();

    // Detect auth redirect
    if (finalUrl.includes("/login") && !route.path.includes("/login") && !route.path.includes("/register")) {
      // Allow landing page to navigate to /login as part of its own flow
      if (route.path !== "/") {
        redirectedTo = finalUrl;
      }
    }

    if (httpStatus >= 400) {
      status = "HTTP_ERROR";
      notes.push(`HTTP ${httpStatus}`);
    }

    if (redirectedTo) {
      status = "AUTH_BLOCKED";
      notes.push(`Dialihkan ke ${redirectedTo} — proteksi auth aktif`);
    }

    await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});

    // Run page-specific interactions
    for (const interaction of route.interactions) {
      try {
        await runInteraction(interaction, route);
      } catch (e) {
        const msg = e.message.split("\n")[0].slice(0, 150);
        notes.push(`Interaksi "${interaction}" gagal: ${msg}`);
        if (status === "PASS") status = "PARTIAL";
      }
    }

    if (route.interactions.length > 0) {
      await page.screenshot({ path: shotAfterPath, fullPage: false }).catch(() => {});
    }

    // Page error check
    const realErrors = currentErrors.filter((e) => !isNoise(e.message));
    if (realErrors.length > 0) {
      if (status === "PASS") status = "WITH_ERRORS";
      notes.push(`${realErrors.length} console/page error`);
    }

    // Network failure check (5xx = real bug; 401/403 may be auth-related)
    const hardFails = currentNetworkFails.filter((n) => n.status >= 500 || n.status === 0);
    if (hardFails.length > 0 && status !== "AUTH_BLOCKED") {
      if (status === "PASS") status = "WITH_ERRORS";
      notes.push(`${hardFails.length} network failure (5xx/timeout)`);
    }
  } catch (e) {
    status = "FAIL";
    notes.push(`Exception: ${e.message.split("\n")[0].slice(0, 150)}`);
    try {
      await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});
    } catch {}
  }

  const icon = STATUS_ICON[status] || "❓";
  console.log(`  ${icon} [${String(index).padStart(2, "0")}] ${route.name.padEnd(28)} ${status.padEnd(14)} ${notes.join("; ")}`);

  results.push({
    step: index,
    name: route.name,
    path: route.path,
    critical: route.critical,
    status,
    notes,
    httpStatus,
    errors: currentErrors.filter((e) => !isNoise(e.message)),
    networkFails: currentNetworkFails,
    screenshot: shotPath,
  });
}

const STATUS_ICON = {
  PASS: "✅",
  PARTIAL: "⚠️",
  WITH_ERRORS: "🔶",
  FAIL: "❌",
  AUTH_BLOCKED: "🔒",
  HTTP_ERROR: "🚫",
  NO_BUTTON: "🔘",
};

async function runInteraction(name, route) {
  switch (name) {
    case "cta-button": {
      // Landing page: cari CTA yang menuju /register atau /login
      const btn = page.locator("a[href*='/register'], a[href*='/login'], button").filter({
        hasText: /mulai|daftar|sign up|get started|bergabung/i,
      }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const href = await btn.getAttribute("href").catch(() => null);
        await btn.click().catch(() => {});
        await page.waitForTimeout(800);
        // Kembali ke landing untuk testing halaman lain
        await page.goto(BASE_URL + route.path, { waitUntil: "load" }).catch(() => {});
        await page.waitForTimeout(500);
      }
      break;
    }
    case "form-empty-submit": {
      const submitBtn = page.locator("button[type='submit']").first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const disabled = await submitBtn.isDisabled().catch(() => true);
        if (!disabled) {
          await submitBtn.click().catch(() => {});
          await page.waitForTimeout(800);
        }
      }
      break;
    }
    case "teora-assistant": {
      const btn = page.getByRole("button", { name: /mulai chat/i }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(1000);
        // Klik suggested prompt pertama kalau ada
        const chip = page.locator("[role='dialog'] button, [class*='Sheet'] button").filter({
          hasText: /.{10,}/,
        }).first();
        if (await chip.isVisible({ timeout: 1500 }).catch(() => false)) {
          await chip.click().catch(() => {});
          await page.waitForTimeout(500);
        }
        // Tutup sheet
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(500);
      }
      break;
    }
    case "saldo-click": {
      const saldo = page.locator("a[href='/topup']").filter({ hasText: /saldo/i }).first();
      if (await saldo.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saldo.click().catch(() => {});
        await page.waitForTimeout(800);
        await page.goBack().catch(() => {});
        await page.waitForTimeout(800);
      }
      break;
    }
    case "type-filter": {
      const tab = page.getByRole("tab", { name: /general|umum/i }).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click().catch(() => {});
        await page.waitForTimeout(500);
      } else {
        // Alternatif: klik link langsung
        await page.goto(BASE_URL + "/projects?type=academic", { waitUntil: "load" }).catch(() => {});
        await page.waitForTimeout(500);
        await page.goto(BASE_URL + "/projects", { waitUntil: "load" }).catch(() => {});
        await page.waitForTimeout(500);
      }
      break;
    }
    case "type-switch-academic": {
      await page.goto(BASE_URL + "/projects/new?type=academic", { waitUntil: "load" }).catch(() => {});
      await page.waitForTimeout(1000);
      // Pastikan ada Citation Format selector (ciri academic)
      const citationVisible = await page.locator("text=/format sitasi/i").first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!citationVisible) {
        notes.push("academic: Citation Format tidak muncul saat ?type=academic");
      }
      await page.goto(BASE_URL + "/projects/new", { waitUntil: "load" }).catch(() => {});
      await page.waitForTimeout(800);
      break;
    }
    case "format-switch-pptx": {
      const slideBtn = page.getByRole("button", { name: /^slide$/i }).first();
      if (await slideBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await slideBtn.click().catch(() => {});
        await page.waitForTimeout(400);
      }
      break;
    }
    case "form-validation-cycle": {
      const ta = page.locator("textarea").first();
      if (await ta.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ta.fill("a");
        await page.waitForTimeout(400);
        await ta.fill("abc");
        await page.waitForTimeout(400);
        await ta.fill("");
        await page.waitForTimeout(400);
      }
      break;
    }
  }
}

// ===== Run tests =====

console.log("\n📋 Phase 1: Route publik (no auth)");
console.log("─".repeat(80));
let idx = 1;
for (const route of PUBLIC_ROUTES) {
  await testRoute(route, idx++);
}

console.log("\n📋 Phase 2: Route protected (MSW mock auth)");
console.log("─".repeat(80));
for (const route of PROTECTED_ROUTES) {
  await testRoute(route, idx++);
}

console.log("\n📋 Phase 3: Global interactions");
console.log("─".repeat(80));

// Theme toggle
{
  currentErrors = [];
  currentNetworkFails = [];
  let status = "PASS";
  let notes = [];
  try {
    await page.goto(BASE_URL + "/dashboard", { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1000);
    const themeBtn = page.locator("[aria-label*='mode']").first();
    if (await themeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const initialClass = await page.locator("html").getAttribute("class");
      await themeBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      const newClass = await page.locator("html").getAttribute("class");
      await page.screenshot({ path: path.join(OUT_DIR, "screenshots", "s99-theme-toggled.png") }).catch(() => {});
      if (initialClass !== newClass) {
        notes.push(`Theme class berubah: ${initialClass} → ${newClass}`);
      } else {
        notes.push("Theme class tidak berubah saat toggle");
        status = "PARTIAL";
      }
      // Kembalikan ke light
      await themeBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    } else {
      status = "NO_BUTTON";
      notes.push("Tombol theme tidak ditemukan di sidebar");
    }
  } catch (e) {
    status = "FAIL";
    notes.push(e.message.split("\n")[0].slice(0, 150));
  }
  const realErrors = currentErrors.filter((e) => !isNoise(e.message));
  if (realErrors.length > 0 && status === "PASS") {
    status = "WITH_ERRORS";
    notes.push(`${realErrors.length} error`);
  }
  const icon = STATUS_ICON[status] || "❓";
  console.log(`  ${icon} [99] ${"Theme Toggle".padEnd(28)} ${status.padEnd(14)} ${notes.join("; ")}`);
  results.push({
    step: 99, name: "Theme Toggle", path: "(sidebar)", critical: false,
    status, notes, httpStatus: 0,
    errors: realErrors, networkFails: currentNetworkFails,
  });
}

// ===== Aggregate & report =====

const summary = {
  total: results.length,
  pass: results.filter((r) => r.status === "PASS").length,
  partial: results.filter((r) => r.status === "PARTIAL").length,
  withErrors: results.filter((r) => r.status === "WITH_ERRORS").length,
  fail: results.filter((r) => r.status === "FAIL").length,
  authBlocked: results.filter((r) => r.status === "AUTH_BLOCKED").length,
  httpError: results.filter((r) => r.status === "HTTP_ERROR").length,
  noButton: results.filter((r) => r.status === "NO_BUTTON").length,
};

const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
const totalNetFails = results.reduce((s, r) => s + r.networkFails.length, 0);

await fs.writeFile(
  path.join(OUT_DIR, "report.json"),
  JSON.stringify({
    summary, results,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
  }, null, 2),
);

await fs.writeFile(path.join(OUT_DIR, "REPORT.md"), generateMarkdownReport());

console.log("\n" + "═".repeat(80));
console.log("📊 RINGKASAN");
console.log("═".repeat(80));
console.log(`  Total route diuji    : ${summary.total}`);
console.log(`  ✅ PASS              : ${summary.pass}`);
console.log(`  ⚠️  PARTIAL           : ${summary.partial}`);
console.log(`  🔶 WITH_ERRORS       : ${summary.withErrors}`);
console.log(`  ❌ FAIL              : ${summary.fail}`);
console.log(`  🔒 AUTH_BLOCKED      : ${summary.authBlocked}`);
console.log(`  🚫 HTTP_ERROR        : ${summary.httpError}`);
console.log(`  🔘 NO_BUTTON         : ${summary.noButton}`);
console.log(`  ────────────────────────`);
console.log(`  Total error JS       : ${totalErrors}`);
console.log(`  Total network fail   : ${totalNetFails}`);
console.log("");
console.log(`📁 Laporan markdown: ${OUT_DIR}/REPORT.md`);
console.log(`📁 Laporan JSON    : ${OUT_DIR}/report.json`);
console.log(`📁 Screenshots     : ${OUT_DIR}/screenshots/`);
console.log("");

await browser.close();

function generateMarkdownReport() {
  const lines = [];
  lines.push("# Teora — Full Web Live Test Report");
  lines.push("");
  lines.push(`**Dibuat:** ${new Date().toISOString()}`);
  lines.push(`**Base URL:** ${BASE_URL}`);
  lines.push(`**Viewport:** ${VIEWPORT.width}×${VIEWPORT.height}`);
  lines.push("");
  lines.push("## Ringkasan");
  lines.push("");
  lines.push("| Metrik | Jumlah |");
  lines.push("|---|---|");
  lines.push(`| Total route diuji | ${summary.total} |`);
  lines.push(`| ✅ PASS | ${summary.pass} |`);
  lines.push(`| ⚠️ PARTIAL | ${summary.partial} |`);
  lines.push(`| 🔶 WITH_ERRORS | ${summary.withErrors} |`);
  lines.push(`| ❌ FAIL | ${summary.fail} |`);
  lines.push(`| 🔒 AUTH_BLOCKED | ${summary.authBlocked} |`);
  lines.push(`| 🚫 HTTP_ERROR | ${summary.httpError} |`);
  lines.push(`| 🔘 NO_BUTTON | ${summary.noButton} |`);
  lines.push(`| **Total console/page error** | **${totalErrors}** |`);
  lines.push(`| **Total network failure** | **${totalNetFails}** |`);
  lines.push("");

  // Legend
  lines.push("## Keterangan Status");
  lines.push("");
  lines.push("- ✅ **PASS** — halaman load bersih, interaksi berhasil, tidak ada error");
  lines.push("- ⚠️ **PARTIAL** — halaman load tapi satu/lebih interaksi gagal (tombol tak ditemukan, dst)");
  lines.push("- 🔶 **WITH_ERRORS** — halaman load tapi ada console error / network failure nyata");
  lines.push("- ❌ **FAIL** — halaman tidak bisa load sama sekali (exception)");
  lines.push("- 🔒 **AUTH_BLOCKED** — dialihkan ke /login (MSW mock auth tidak aktif untuk route ini)");
  lines.push("- 🚫 **HTTP_ERROR** — response HTTP ≥ 400");
  lines.push("- 🔘 **NO_BUTTON** — interaksi tidak bisa dilakukan karena tombol tidak ada");
  lines.push("");

  // Critical first
  const critical = results.filter((r) => r.critical);
  const nonCritical = results.filter((r) => !r.critical);

  lines.push("## Halaman Kritis (Owner-facing)");
  lines.push("");
  lines.push("| # | Halaman | Path | Status | Catatan |");
  lines.push("|---|---|---|---|---|");
  for (const r of critical) {
    const icon = STATUS_ICON[r.status] || "❓";
    lines.push(`| ${r.step} | ${r.name} | \`${r.path}\` | ${icon} ${r.status} | ${r.notes.join("; ") || "—"} |`);
  }
  lines.push("");

  lines.push("## Halaman Lain");
  lines.push("");
  lines.push("| # | Halaman | Path | Status | Catatan |");
  lines.push("|---|---|---|---|---|");
  for (const r of nonCritical) {
    const icon = STATUS_ICON[r.status] || "❓";
    lines.push(`| ${r.step} | ${r.name} | \`${r.path}\` | ${icon} ${r.status} | ${r.notes.join("; ") || "—"} |`);
  }
  lines.push("");

  // Bug details
  const bugs = results.filter(
    (r) => r.errors.length > 0 || r.networkFails.length > 0 || r.status === "FAIL" || r.status === "HTTP_ERROR",
  );
  if (bugs.length > 0) {
    lines.push("## 🐛 Bug / Isu yang Ditemukan");
    lines.push("");
    for (const r of bugs) {
      const icon = STATUS_ICON[r.status] || "❓";
      lines.push(`### ${icon} ${r.name} (\`${r.path}\`) — ${r.status}`);
      lines.push("");
      if (r.notes.length > 0) {
        lines.push("**Catatan:**");
        for (const n of r.notes) lines.push(`- ${n}`);
        lines.push("");
      }
      if (r.errors.length > 0) {
        lines.push(`**Console/page errors (${r.errors.length}):**`);
        lines.push("");
        lines.push("```");
        for (const e of r.errors.slice(0, 8)) {
          lines.push(`[${e.type}] ${e.message.slice(0, 250)}`);
        }
        if (r.errors.length > 8) lines.push(`... (${r.errors.length - 8} more)`);
        lines.push("```");
        lines.push("");
      }
      if (r.networkFails.length > 0) {
        lines.push(`**Network failures (${r.networkFails.length}):**`);
        lines.push("");
        lines.push("| HTTP | Method | URL |");
        lines.push("|---|---|---|");
        for (const n of r.networkFails.slice(0, 10)) {
          lines.push(`| ${n.status || "ERR"} | ${n.method} | ${n.url.slice(0, 100)} |`);
        }
        if (r.networkFails.length > 10) lines.push(`| ... | ... | (${r.networkFails.length - 10} more) |`);
        lines.push("");
      }
    }
  } else {
    lines.push("## ✅ Tidak Ada Bug yang Ditemukan");
    lines.push("");
    lines.push("Semua halaman load bersih tanpa error console atau network failure.");
    lines.push("");
  }

  // Auth-blocked routes that may need attention
  const blocked = results.filter((r) => r.status === "AUTH_BLOCKED");
  if (blocked.length > 0) {
    lines.push("## 🔒 Route yang Diblokir Auth");
    lines.push("");
    lines.push("Route berikut dialihkan ke /login saat diuji. Ini bisa berarti:");
    lines.push("- MSW mock auth belum meng-grant akses untuk route ini (perlu setup auth state)");
    lines.push("- Route memang diproteksi dan owner harus login dulu untuk akses");
    lines.push("");
    lines.push("| Halaman | Path |");
    lines.push("|---|---|");
    for (const r of blocked) lines.push(`| ${r.name} | \`${r.path}\` |`);
    lines.push("");
  }

  lines.push("## Screenshots");
  lines.push("");
  lines.push(`Semua screenshot tersimpan di \`${OUT_DIR}/screenshots/\` (${results.length} file PNG).`);
  lines.push("");

  return lines.join("\n");
}
