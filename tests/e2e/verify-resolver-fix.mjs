/**
 * Regression test: verify the new-project form still has working validation
 * UX after switching to the compat resolver.
 */
import { chromium } from "playwright";

const BASE_URL = "http://localhost:18543";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));

await page.goto(BASE_URL + "/projects/new", { waitUntil: "load" });
await page.waitForTimeout(2000);

// 1. Submit button should be disabled initially (empty instructionText)
const submitBtn = page.getByRole("button", { name: /mulai kerjakan/i }).first();
const initiallyDisabled = await submitBtn.isDisabled();
console.log(`1. Submit button initially disabled: ${initiallyDisabled}`);
if (!initiallyDisabled) throw new Error("Expected submit disabled with empty instructionText");

// 2. Type 1 character — still invalid (min 3)
const ta = page.locator("textarea").first();
await ta.fill("a");
await page.waitForTimeout(500);
const stillDisabled = await submitBtn.isDisabled();
console.log(`2. After typing 'a' (1 char): disabled=${stillDisabled}`);
if (!stillDisabled) throw new Error("Expected submit still disabled with 1 char");

// 3. Type 3 chars — should now be valid
await ta.fill("abc");
await page.waitForTimeout(500);
const enabledNow = !(await submitBtn.isDisabled());
console.log(`3. After typing 'abc' (3 chars): enabled=${enabledNow}`);
if (!enabledNow) throw new Error("Expected submit enabled with 3+ chars");

// 4. Clear back to empty — should disable again
await ta.fill("");
await page.waitForTimeout(500);
const disabledAgain = await submitBtn.isDisabled();
console.log(`4. After clearing back to empty: disabled=${disabledAgain}`);
if (!disabledAgain) throw new Error("Expected submit disabled after clearing");

console.log(`\npage errors during test: ${errors.length}`);
for (const e of errors) console.log(`  ${e.slice(0, 150)}`);

await browser.close();
console.log(errors.length === 0 && enabledNow && disabledAgain
  ? "\n✅ form validation UX intact + no page errors"
  : "\n❌ regression detected");
