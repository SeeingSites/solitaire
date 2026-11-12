import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
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
// (@capacitor/core defines window.Capacitor on the web too, so ask it directly.)
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  window.isSecureContext &&
  !Capacitor.isNativePlatform()
) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// iOS app: light status-bar text over the blue table.
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
}
