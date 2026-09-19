/**
 * Focused investigation of the ZodError that fires when navigating to /projects/new
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:18543";
const OUT = path.resolve("tests/e2e/artifacts/zod-investigate");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const pageErrors = [];
const allConsole = [];

page.on("pageerror", (err) => {
  pageErrors.push({ name: err.name, message: err.message, stack: err.stack });
});

page.on("console", (msg) => {
  allConsole.push({ type: msg.type(), text: msg.text(), location: msg.location()?.url ?? "" });
});

await page.goto(BASE_URL + "/", { waitUntil: "load" });
await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);

console.log("After / load — pageErrors:", pageErrors.length);

await page.goto(BASE_URL + "/projects/new", { waitUntil: "load" });
await page.waitForTimeout(2500);

console.log("After /projects/new load — pageErrors:", pageErrors.length);
for (const e of pageErrors) {
  console.log(`  ${e.name}: ${e.message.slice(0, 300)}`);
}

// Try interacting with the form to see if errors accumulate
console.log("\nTyping into instructionText...");
const instructionField = page.locator("textarea").first();
if (await instructionField.isVisible({ timeout: 3000 })) {
  await instructionField.fill("Halo ini test");
  await page.waitForTimeout(800);
  console.log("After fill — pageErrors:", pageErrors.length);

  await page.screenshot({ path: path.join(OUT, "after-typing.png"), fullPage: true });
}

// Clear it back to empty
console.log("\nClearing instructionText back to empty...");
await instructionField.fill("");
await page.waitForTimeout(800);
console.log("After clear — pageErrors:", pageErrors.length);
for (const e of pageErrors) {
  console.log(`  ${e.name}: ${e.message.slice(0, 300)}`);
}

await page.screenshot({ path: path.join(OUT, "after-clear.png"), fullPage: true });

// Save report
await writeFile(path.join(OUT, "report.json"), JSON.stringify({ pageErrors, allConsole: allConsole.slice(-30) }, null, 2));

await browser.close();
console.log(`\nReport: ${path.join(OUT, "report.json")}`);
