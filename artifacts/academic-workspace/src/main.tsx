import { createRoot } from "react-dom/client";

import App from "./App";

import "./index.css";

async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK === "true") {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
    });
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
