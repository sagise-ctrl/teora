import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome to Teora" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("New to Teora?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
  });

  test("can navigate from login to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL("/register");
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Start your journey" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password").first()).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(page.getByText("Already have an account?")).toBeVisible();
  });

  test("can navigate from register to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("password toggle works on login page", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    await page.locator("input[type='password']").first().locator("..").locator("button[type='button']").click();
  });

  test("password toggle works on register page", async ({ page }) => {
    await page.goto("/register");
    const passwordInputs = page.locator("input[type='password']");
    await expect(passwordInputs.first()).toBeVisible();
    await page.locator("input[type='password']").first().locator("..").locator("button[type='button']").click();
  });

  test("register with referral code shows invitation notice", async ({ page }) => {
    await page.goto("/register?ref=DEMO1234");
    await expect(page.getByText("You were invited by a friend")).toBeVisible();
  });
});
