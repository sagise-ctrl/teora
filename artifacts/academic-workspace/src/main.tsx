import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// In E2E test mode (VITE_E2E=true), skip MSW — Playwright's page.route handles all mocking.
async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK === "true" && import.meta.env.VITE_E2E !== "true") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
