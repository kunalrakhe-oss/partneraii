import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Fade out and remove the HTML splash screen once React mounts
const splash = document.getElementById("splash-screen");
if (splash) {
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 500);
}

createRoot(document.getElementById("root")!).render(<App />);
