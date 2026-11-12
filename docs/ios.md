# iOS app

Solitaire ships as a native iOS app built with [Capacitor](https://capacitorjs.com): the same React game, bundled into an Xcode project in `frontend/ios/`. The app loads the game from files inside the app, so it works offline with no service worker.

| | |
|---|---|
| Bundle ID | `com.seeingsites.solitaire` (set in `frontend/capacitor.config.ts`) |
| App name | Solitaire |
| Native plugins | `@capacitor/status-bar` (light status-bar text over the blue table) |
| Web-only features turned off in the app | the offline service worker |

## Day-to-day

```bash
cd frontend
npm run ios:sync   # build the web app and copy it into the iOS project
npm run ios:open   # open the project in Xcode (macOS only)
```

Run `npm run ios:sync` after every web change before building in Xcode. The `iOS build` GitHub Actions workflow compiles the app for the simulator (unsigned) whenever iOS-related files change, so you can confirm the project builds without a Mac.

## What you need for the App Store

1. **An Apple Developer Program membership** ($99/year) at developer.apple.com.
2. **A Mac with Xcode** (or a cloud build service such as Xcode Cloud, Ionic Appflow or Codemagic).
3. **Register the bundle ID** `com.seeingsites.solitaire` under Certificates, Identifiers & Profiles, or change `appId` in `capacitor.config.ts` (then run `npx cap sync ios`) to one you own.
4. **Create the app in App Store Connect** with that bundle ID.

## First build on a device

1. `cd frontend && npm ci && npm run ios:sync && npm run ios:open`
2. In Xcode, select the **App** target → **Signing & Capabilities** → choose your team. Xcode creates the signing certificate and profile automatically.
3. Plug in an iPhone, select it as the run destination and press Run.

## Submitting

1. In Xcode, set the version and build number (App target → General).
2. **Product → Archive**, then **Distribute App → App Store Connect → Upload**.
3. In App Store Connect, add screenshots (6.9" and 6.5" iPhone sizes at minimum), a description, keywords, a support URL and a privacy policy URL.
4. **App Privacy:** the app collects no data. Play logs used by "Export Logs" stay on the device and are never sent anywhere, so answer *Data Not Collected*.
5. **Age rating:** answer the questionnaire; the game has no mature content.
6. `ITSAppUsesNonExemptEncryption` is already `false` in `Info.plist`, so no export-compliance documents are needed.
7. Submit for review.

## Review notes

Apple rejects apps that are "just a website" (guideline 4.2, Minimum Functionality), and the App Store already has many solitaire apps (guideline 4.3, Spam, can apply to crowded categories). This app is a complete game that runs offline from bundled files, which is the strongest position, but a distinctive feature such as the AI demo mode is worth highlighting in the listing and review notes. If that happens, adding native touches (haptic feedback when cards snap into place via `@capacitor/haptics`, Game Center leaderboards for fewest moves) and noting them in the review notes usually resolves it.
