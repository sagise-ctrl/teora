/**
 * Verify the ZodError bug scope across all forms.
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:18543";
const OUT = path.resolve("tests/e2e/artifacts/zod-scope");
await mkdir(OUT, { recursive: true });

const pages = ["/", "/login", "/register", "/projects/new"];
const browser = await chromium.launch({ headless: true });
const results = [];

for (const route of pages) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push({ name: err.name, msg: err.message.split("\n")[0].slice(0, 200) }));
  try {
    await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, `${route.replace(/\//g, "_") || "_root"}.png`), fullPage: true });
  } catch (e) {
    results.push({ route, errors, fatal: e.message });
  } finally {
    results.push({ route, errors, fatal: null });
    await context.close();
  }
}

await browser.close();

console.log("\n════ SCOPE OF ZodError BUG ════");
for (const r of results) {
  const zodErrors = r.errors.filter((e) => e.name === "ZodError");
  console.log(`${r.route.padEnd(20)} → ${r.errors.length} page errors (${zodErrors.length} ZodError)`);
  for (const e of r.errors) {
    console.log(`     [${e.name}] ${e.msg.slice(0, 120)}`);
  }
}

await writeFile(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
