import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Show splash for at least 1.2s so users see the app is loading
const splash = document.getElementById("splash-screen");
const MINIMUM_SPLASH_MS = 1200;
const splashStart = performance.now();

function dismissSplash() {
  if (!splash) return;
  const elapsed = performance.now() - splashStart;
  const remaining = Math.max(0, MINIMUM_SPLASH_MS - elapsed);
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 500);
  }, remaining);
}

dismissSplash();

createRoot(document.getElementById("root")!).render(<App />);
