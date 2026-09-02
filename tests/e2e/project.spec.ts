import { test, expect } from "@playwright/test";

// Project workspace tests require comprehensive auth + API mocking.
// For now, we test navigation links exist in the sidebar.

test.describe("Project Workspace", () => {
  test("project navigation link exists in sidebar", async ({ page }) => {
    await page.goto("/");
    // The History link should exist in the sidebar (pointing to a sample project)
    const historyLink = page.getByRole("link", { name: /history/i });
    await expect(historyLink).toBeVisible();
  });

  test("task helper link exists in sidebar", async ({ page }) => {
    await page.goto("/");
    // The Task Helper link should exist
    const taskHelperLink = page.getByRole("link", { name: /task helper/i });
    await expect(taskHelperLink).toBeVisible();
  });

  test("paper writer link exists in sidebar", async ({ page }) => {
    await page.goto("/");
    // The Paper Writer link should exist
    const paperWriterLink = page.getByRole("link", { name: /paper writer/i });
    await expect(paperWriterLink).toBeVisible();
  });
});
