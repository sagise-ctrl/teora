import { test, expect } from "@playwright/test";

// Mock all API routes needed for authenticated dashboard tests.
async function mockDashboard(page: import("@playwright/test").Page) {
  // Auth
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
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

  // Project stats
  await page.route("**/api/projects/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total: 5,
        byStatus: { completed: 1, writing: 1, waiting_revision: 1, analyzing: 1, draft: 1 },
        recentActivity: [
          { id: 1, projectId: 1, eventType: "document_revised", description: "Versi 2 dibuat", createdAt: new Date().toISOString() },
        ],
      }),
    });
  });

  // Project list
  await page.route("**/api/projects", async (route) => {
    const url = route.request().url();
    const searchParams = new URL(url).searchParams.get("search");
    const search = searchParams?.toLowerCase() ?? "";
    const projects = [
      { id: 1, title: "Dampak Media Sosial terhadap Perilaku Remaja", status: "completed", progress: 100, subject: "Psikologi Perkembangan", taskType: "Makalah", citationFormat: "APA 7th", outputFormat: "docx", minRefYear: 2019, minRefCount: 10, instructionText: "", createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: 2, title: "Penerapan Machine Learning dalam Deteksi Fraud", status: "writing", progress: 45, subject: "Sistem Informasi", taskType: "Skripsi", citationFormat: "APA 7th", outputFormat: "pdf", minRefYear: 2020, minRefCount: 15, instructionText: "", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: 3, title: "Strategi Green Marketing pada Produk Ramah Lingkungan", status: "waiting_revision", progress: 80, subject: "Manajemen Pemasaran", taskType: "Jurnal", citationFormat: "APA 7th", outputFormat: "pdf", minRefYear: 2018, minRefCount: 12, instructionText: "", createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: 4, title: "Efektivitas Game-Based Learning dalam Pembelajaran Matematika", status: "analyzing", progress: 15, subject: "Teknologi Pendidikan", taskType: "Skripsi", citationFormat: "APA 7th", outputFormat: "docx", minRefYear: 2020, minRefCount: 20, instructionText: "", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
      { id: 5, title: "Analisis Risiko Investasi Saham dengan Metode Value at Risk", status: "draft", progress: 0, subject: null, taskType: null, citationFormat: null, outputFormat: null, minRefYear: null, minRefCount: null, instructionText: "", createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    ];

    const filtered = search
      ? projects.filter(p => p.title.toLowerCase().includes(search) || p.subject?.toLowerCase().includes(search))
      : projects;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(filtered),
    });
  });
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboard(page);
    await page.goto("/");
  });

  test("dashboard renders welcome header with user name", async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText("What academic challenge are we solving today?")).toBeVisible();
  });

  test("token balance card is visible", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // Use first() since sidebar also has Token Balance text
    await expect(page.getByText("Token Balance").first()).toBeVisible();
    // Numbers are formatted with comma: 850 / 1,000
    await expect(page.getByText(/850\s*\/?\s*1[,\s]*000/i)).toBeVisible();
  });

  test("AI Writing Tools section is visible", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "AI Writing Tools" })).toBeVisible();
    // Use first() since sidebar nav also has Task Helper
    await expect(page.getByRole("heading", { name: "Task Helper" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scientific Paper Writer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proposal Creator" })).toBeVisible();
  });

  test("new thesis outline has NEW badge", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("New").first()).toBeVisible();
  });

  test("new project button is visible", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const newProjectBtn = page.getByRole("link", { name: /new project/i });
    await expect(newProjectBtn.first()).toBeVisible();
  });

  test("your projects section renders", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Your Projects" })).toBeVisible();
    // Search input should be visible for filtering
    await expect(page.getByPlaceholder("Search projects...")).toBeVisible();
    // New Project button should be visible
    await expect(page.getByRole("link", { name: /new project/i }).first()).toBeVisible();
  });

  test("clicking new project navigates to create page", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /new project/i }).first().click();
    await expect(page).toHaveURL("/projects/new");
  });
});
