/**
 * Human-like browser verification for the Teora Dashboard.
 *
 * Drives the dev:bypass server (localhost:18543, MSW active) with Playwright
 * headless Chromium. Acts like a real user: navigates the dashboard, opens
 * the Teora Assistant chat sheet, sends a message, reads the response.
 */

import { chromium } from "playwright";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:18543";
const SCREENSHOT_DIR = path.resolve("tests/e2e/artifacts/human-verify");
const REPORT_PATH = path.resolve("tests/e2e/artifacts/human-verify/report.json");

await mkdir(SCREENSHOT_DIR, { recursive: true });

const findings = {
  console: [],
  pageErrors: [],
  failedRequests: [],
  badResponses: [],
  screenshots: [],
  steps: [],
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

// Capture page errors that reach the window (uncaught)
page.on("pageerror", (err) => {
  findings.pageErrors.push({
    name: err.name,
    message: err.message,
  });
});

// Capture failed network requests
page.on("requestfailed", (req) => {
  findings.failedRequests.push({
    url: req.url(),
    method: req.method(),
    failure: req.failure()?.errorText ?? "unknown",
  });
});

// Capture bad HTTP responses
page.on("response", async (resp) => {
  const status = resp.status();
  if (status >= 400) {
    let body = "";
    try {
      const ct = resp.headers()["content-type"] ?? "";
      if (ct.includes("json") || ct.includes("text")) body = (await resp.text()).slice(0, 500);
    } catch {}
    findings.badResponses.push({ url: resp.url(), status, body });
  }
});

// Capture console — filter MSW noise
page.on("console", (msg) => {
  const text = msg.text();
  const location = msg.location();
  // Skip MSW logs (worker boot, request tracing) and vite hot reload
  const url = location?.url ?? "";
  if (url.includes("mockServiceWorker")) return;
  if (url.includes("msw_browser")) return;
  if (url.includes("/@vite/")) return;
  if (url.includes("/@react-refresh")) return;
  if (text.includes("[vite]")) return;
  if (text.includes("[MSW]")) return;
  if (text.includes("Download the React DevTools")) return;
  if (text.includes("React DevTools")) return;

  findings.console.push({
    type: msg.type(),
    text: text.slice(0, 500),
    location: url.replace(BASE_URL, ""),
  });
});

const shoot = async (name) => {
  try {
    const file = path.join(SCREENSHOT_DIR, `${String(findings.screenshots.length + 1).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    findings.screenshots.push(file);
    console.log(`   📸 ${path.basename(file)}`);
  } catch (e) {
    console.log(`   📸 failed: ${e.message}`);
  }
};

const step = async (n, label, fn) => {
  console.log(`\n── STEP ${n}: ${label} ──`);
  const start = Date.now();
  let outcome = "ok";
  let detail = "";
  try {
    await fn();
  } catch (err) {
    outcome = "fail";
    detail = err.message.split("\n")[0];
    console.log(`   ❌ ${detail}`);
  }
  const ms = Date.now() - start;
  findings.steps.push({ n, label, outcome, ms, detail });
  console.log(`   ${outcome === "ok" ? "✅" : "❌"} ${outcome} in ${ms}ms`);
  await page.waitForTimeout(600);
};

try {
  await step(1, "Navigate to dashboard", async () => {
    await page.goto(BASE_URL + "/", { waitUntil: "load", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000); // let React render + queries settle
    await shoot("01-dashboard-loaded");
  });

  await step(2, "Verify dashboard header + cards", async () => {
    const title = await page.locator("h1").first().textContent();
    console.log(`   h1 = "${title}"`);
    if (!title || !title.toLowerCase().includes("welcome")) {
      throw new Error(`h1 doesn't contain 'welcome', got: ${title}`);
    }
    const assistantCount = await page.getByText("Teora Assistant").count();
    const mulaiCount = await page.getByRole("button", { name: /mulai chat/i }).count();
    const tasksCount = await page.getByRole("heading", { name: /your tasks/i }).count();
    console.log(`   Teora Assistant occurrences: ${assistantCount}`);
    console.log(`   Mulai Chat buttons: ${mulaiCount}`);
    console.log(`   Your Tasks headings: ${tasksCount}`);
    if (assistantCount === 0) throw new Error("Teora Assistant not visible");
    if (mulaiCount === 0) throw new Error("Mulai Chat button missing");
    if (tasksCount === 0) throw new Error("Your Tasks section missing");
  });

  await step(3, "Verify tasks rendered", async () => {
    const cards = await page.locator(".grid > a, .grid [class*='card']").count();
    console.log(`   project cards visible: ${cards}`);
    await shoot("02-dashboard-with-tasks");
  });

  await step(4, "Click Mulai Chat → open Teora Assistant Sheet", async () => {
    const mulaiBtn = page.getByRole("button", { name: /mulai chat/i }).first();
    await mulaiBtn.click({ timeout: 5000 });
    // Wait for SheetContent to appear (Sheet from shadcn)
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(1000); // slide animation
    await shoot("03-chat-sheet-opened");
  });

  await step(5, "Verify chat sheet content", async () => {
    const dialog = page.locator('[role="dialog"]').first();
    const dialogText = await dialog.textContent();
    console.log(`   dialog text length: ${dialogText?.length}`);
    if (!dialogText?.includes("Teora Assistant")) throw new Error("Sheet title missing");
    if (!dialogText?.includes("Tanyakan apa saja")) throw new Error("Sheet description missing");
    if (!dialogText?.includes("Tanya Teora")) throw new Error("Textarea placeholder missing");
    // Look for suggested prompts (only visible when empty chat)
    const prompts = await dialog.locator("text=/Jelaskan konsep fotosintesis singkat|Bantu bikin outline|Cara menulis sitasi|Bedakan metode/").count();
    console.log(`   suggested prompts visible: ${prompts}`);
  });

  await step(6, "Click suggested prompt → fills textarea", async () => {
    const dialog = page.locator('[role="dialog"]').first();
    const prompt = dialog.locator("text=Jelaskan konsep fotosintesis singkat").first();
    if (await prompt.isVisible({ timeout: 2000 })) {
      await prompt.click();
      await page.waitForTimeout(400);
      const textareaValue = await dialog.locator("textarea").inputValue();
      console.log(`   textarea after prompt click: "${textareaValue.slice(0, 50)}..."`);
      if (!textareaValue.includes("fotosintesis")) throw new Error("Prompt click did not fill textarea");
    } else {
      console.log("   suggested prompts NOT visible (chat may have history)");
    }
    await shoot("04-prompt-clicked");
  });

  await step(7, "Send the message", async () => {
    const dialog = page.locator('[role="dialog"]').first();
    const sendBtn = dialog.locator("button").last();
    await sendBtn.click({ timeout: 5000 });
    console.log("   send button clicked");
    await page.waitForTimeout(500);
    await shoot("05-after-send-click");
  });

  await step(8, "Wait for AI response", async () => {
    // Mock has 800ms delay + 3s poll interval. Wait long enough.
    await page.waitForTimeout(5000);
    const dialog = page.locator('[role="dialog"]').first();
    // Look for assistant message bubble (gradient bg, "Bot" icon)
    const bubbles = await dialog.locator("text=/Baik, saya pahami|Terima kasih atas|Saya telah memahami|Revisi sedang/").count();
    console.log(`   AI response bubbles found: ${bubbles}`);
    await shoot("06-ai-response");
  });

  await step(9, "Check clear chat button appears", async () => {
    const dialog = page.locator('[role="dialog"]').first();
    const trashBtn = dialog.locator("button[title='Hapus riwayat chat']");
    const trashVisible = await trashBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`   trash button visible: ${trashVisible}`);
    if (!trashVisible) throw new Error("Clear chat trash button did not appear after first message");
  });

  await step(10, "Close sheet, navigate to new-project", async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    const newTask = page.getByRole("link", { name: /new task/i }).first();
    await newTask.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    await shoot("07-new-project-page");
    const url = page.url();
    console.log(`   current URL: ${url}`);
    if (!url.includes("/projects/new")) throw new Error(`Expected /projects/new, got ${url}`);
  });

  await step(11, "Verify new-project form renders without crashing", async () => {
    // Just check it renders — don't fill anything
    const formHeading = await page.locator("h1").first().textContent();
    console.log(`   new-project h1: "${formHeading}"`);
    await shoot("08-new-project-form");
  });

  await step(12, "Try empty submit to trigger ZodError path", async () => {
    // Click submit button without filling instructionText
    const submitBtn = page.getByRole("button", { name: /buat|mulai|create/i }).first();
    if (await submitBtn.isVisible({ timeout: 2000 })) {
      const isDisabled = await submitBtn.isDisabled();
      console.log(`   submit button disabled: ${isDisabled}`);
      if (!isDisabled) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }
    await shoot("09-new-project-validation");
  });
} finally {
  await browser.close();
}

// ── Report ──
const report = {
  baseUrl: BASE_URL,
  totalConsole: findings.console.length,
  totalPageErrors: findings.pageErrors.length,
  totalFailedRequests: findings.failedRequests.length,
  totalBadResponses: findings.badResponses.length,
  totalScreenshots: findings.screenshots.length,
  steps: findings.steps,
  steps_passed: findings.steps.filter((s) => s.outcome === "ok").length,
  steps_failed: findings.steps.filter((s) => s.outcome === "fail").length,
  console: findings.console,
  pageErrors: findings.pageErrors,
  failedRequests: findings.failedRequests,
  badResponses: findings.badResponses,
  screenshots: findings.screenshots,
};

await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

console.log("\n══════ SUMMARY ══════");
console.log(`steps          : ${report.steps_passed}/${findings.steps.length} passed`);
console.log(`console msgs   : ${report.totalConsole}`);
console.log(`page errors    : ${report.totalPageErrors}`);
console.log(`failed reqs    : ${report.totalFailedRequests}`);
console.log(`bad responses  : ${report.totalBadResponses}`);
console.log(`screenshots    : ${report.totalScreenshots}`);
console.log(`\nReport: ${REPORT_PATH}`);

if (report.totalPageErrors || report.totalFailedRequests || report.totalBadResponses) {
  console.log("\n── PAGE ERRORS ──");
  for (const e of findings.pageErrors) console.log(`${e.name}: ${e.message.split("\n")[0]}`);
  console.log("\n── FAILED REQUESTS ──");
  for (const r of findings.failedRequests) console.log(`${r.method} ${r.url} → ${r.failure}`);
  console.log("\n── BAD RESPONSES ──");
  for (const r of findings.badResponses) console.log(`${r.status} ${r.url}\n   body: ${r.body.slice(0, 200)}`);
  if (findings.console.length > 0) {
    console.log("\n── CONSOLE (warn/error only) ──");
    for (const c of findings.console.filter((c) => c.type === "warning" || c.type === "error")) {
      console.log(`[${c.type}] ${c.text}`);
    }
  }
  process.exit(1);
}
console.log("\n✅ no uncaught errors / network failures detected");
