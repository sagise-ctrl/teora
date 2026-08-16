import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "lib-api-zod",
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
