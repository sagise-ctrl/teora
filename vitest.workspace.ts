import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./artifacts/api-server/vitest.config.ts",
    root: "./artifacts/api-server",
  },
  {
    extends: "./artifacts/academic-workspace/vitest.config.ts",
    root: "./artifacts/academic-workspace",
  },
  {
    extends: "./lib/db/vitest.config.ts",
    root: "./lib/db",
  },
  {
    extends: "./lib/api-zod/vitest.config.ts",
    root: "./lib/api-zod",
  },
]);
