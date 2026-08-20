import { test, expect } from "@playwright/test";

async function mockFinOps(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "mock-user-001",
        email: "demo@teora.app",
        displayName: "Demo User",
        avatarUrl: null,
        isOwner: true,
        referralCode: "DEMO1234",
      }),
    });
  });
  await page.route("**/api/ai-usage/stats", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalRequests: 42,
        totalInputTokens: 125000,
        totalOutputTokens: 87500,
        totalCostUsd: 0.1842,
        byRequestType: {
          chat: { requests: 20, inputTokens: 50000, outputTokens: 30000, costUsd: 0.082 },
          analyze: { requests: 15, inputTokens: 40000, outputTokens: 25000, costUsd: 0.056 },
          write: { requests: 7, inputTokens: 35000, outputTokens: 32500, costUsd: 0.0462 },
        },
      }),
    });
  });
  await page.route(/\/api\/ai-usage(?!\/stats)/, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: 1,
            userId: "mock-user-001",
            projectId: 1,
            model: "claude-3-5-sonnet-20241022",
            provider: "anthropic",
            inputTokens: 2500,
            outputTokens: 1500,
            estimatedCostUsd: 0.0041,
            requestType: "chat",
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            userId: "mock-user-001",
            projectId: 1,
            model: "claude-3-5-sonnet-20241022",
            provider: "anthropic",
            inputTokens: 4200,
            outputTokens: 2100,
            estimatedCostUsd: 0.0063,
            requestType: "analyze",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 3,
            userId: "mock-user-001",
            projectId: null,
            model: "claude-3-5-sonnet-20241022",
            provider: "anthropic",
            inputTokens: 800,
            outputTokens: 320,
            estimatedCostUsd: 0.00112,
            requestType: "write",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
        ],
        total: 3,
      }),
    });
  });
}

test.describe("FinOps Usage Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockFinOps(page);
  });

  test("finops page renders heading and summary cards", async ({ page }) => {
    await page.goto("/finops");
    await expect(page.getByRole("heading", { name: "AI Usage & Cost" })).toBeVisible();
    await page.waitForFunction(
      () => document.body.textContent?.includes("42"),
      { timeout: 8000 }
    );
    await expect(page.getByText("Total Requests")).toBeVisible();
    await expect(page.getByText("Input Tokens")).toBeVisible();
    await expect(page.getByText("Output Tokens")).toBeVisible();
    await expect(page.getByText("Estimated Cost")).toBeVisible();
  });

  test("finops shows stat values from mock data", async ({ page }) => {
    await page.goto("/finops");
    await page.waitForFunction(
      () => document.body.textContent?.includes("42") && document.body.textContent?.includes("$0.1842"),
      { timeout: 8000 }
    );
    await expect(page.getByText("$0.1842", { exact: false })).toBeVisible();
    await expect(page.getByText("125.0K", { exact: false })).toBeVisible();
  });

  test("finops shows charts section", async ({ page }) => {
    await page.goto("/finops");
    await page.waitForFunction(
      () => document.body.textContent?.includes("42"),
      { timeout: 8000 }
    );
    await expect(page.getByText("Cost by Feature")).toBeVisible();
    await expect(page.getByText("Token Usage by Feature")).toBeVisible();
  });

  test("finops shows usage breakdown", async ({ page }) => {
    await page.goto("/finops");
    await page.waitForFunction(
      () => document.body.textContent?.includes("Usage Breakdown"),
      { timeout: 8000 }
    );
    await expect(page.getByText("Usage Breakdown")).toBeVisible();
    await expect(page.getByText(/20 requests/i)).toBeVisible();
    await expect(page.getByText("Analisis").first()).toBeVisible();
  });

  test("finops shows recent requests table", async ({ page }) => {
    await page.goto("/finops");
    await page.waitForFunction(
      () => document.body.textContent?.includes("Recent Requests"),
      { timeout: 8000 }
    );
    await expect(page.getByRole("heading", { name: "Recent Requests" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "claude-3-5-sonnet-20241022" }).first()).toBeVisible();
    await expect(page.getByText("3 total records")).toBeVisible();
  });

  test("finops accessible from sidebar navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(
      () => document.body.textContent?.includes("AI Usage"),
      { timeout: 8000 }
    );
    await page.getByRole("link", { name: "AI Usage" }).click();
    await expect(page).toHaveURL(/\/finops/);
    await page.waitForFunction(
      () => document.body.textContent?.includes("AI Usage & Cost"),
      { timeout: 8000 }
    );
    await expect(page.getByRole("heading", { name: "AI Usage & Cost" })).toBeVisible();
  });
});
