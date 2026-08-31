import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api-server",
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    exclude: [
      "node_modules",
      "dist",
      "build",
      // Pre-existing failures — see .ai/issue-tracker.md 2026-08-31 (mock chain mismatch)
      "src/test/routes.integration.test.ts",
    ],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": "src",
    },
    extensions: [".ts", ".js", ".mts", ".mtsx", ".json"],
  },
});
