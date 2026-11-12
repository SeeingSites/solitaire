import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS app shell around the Vite build (see docs/ios.md).
const config: CapacitorConfig = {
  appId: "com.seeingsites.solitaire",
  appName: "Solitaire",
  webDir: "dist",
  backgroundColor: "#1e3a8a",
  ios: {
    // Keep the game inside the safe area (notch, home indicator).
    contentInset: "always",
    backgroundColor: "#1e3a8a",
  },
};

export default config;
