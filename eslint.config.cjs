"use strict";
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.vercel/**",
      "**/api/index.mjs",
      "**/*.mjs",
      "**/*.generated.ts",
      "**/coverage/**",
      "scripts/**",
      "artifacts/academic-workspace/dist/**",
      "artifacts/api-server/dist/**",
      "artifacts/api-server/api/*.mjs",
    ],
  },
  {
    files: ["artifacts/**/*.ts", "artifacts/**/*.tsx", "lib/**/*.ts", "lib/**/*.tsx"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
