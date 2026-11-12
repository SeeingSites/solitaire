import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Offline support: cache the game so it works with no connection after one
// visit. Production web builds only; never inside a native app shell.
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  window.isSecureContext &&
  !(window as { Capacitor?: unknown }).Capacitor
) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
