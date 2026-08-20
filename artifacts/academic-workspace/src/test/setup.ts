import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Stub VITE_MOCK before any module loads — .env sets VITE_MOCK=true
// which would cause useAuth and other hooks to skip real API calls
vi.stubEnv("VITE_MOCK", "false");

afterEach(() => {
  cleanup();
});
