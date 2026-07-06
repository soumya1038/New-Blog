# Android OAuth and Permissions Verification Protocol

Last updated: June 27, 2026

## 1. Purpose

This protocol defines how Lekhon verifies the Android app before internal testing, Play Store preparation, or any release claim that mobile Help, OAuth, permissions, back navigation, and offline/local-save guidance are ready.

It is separate from web verification because the Android app runs the React app through Capacitor WebView, packages built web assets, handles the Android back button differently from a browser, and depends on runtime permission and OAuth provider behavior that must be checked on a real phone.

Run `npm run help:android-readiness` from the repository root to summarize current Capacitor configuration, Android manifest, native routing, OAuth callback routes, Android Help articles, Android release gates, and remaining physical-device evidence.

Run `npm run help:android-device-evidence` from the repository root after connecting a physical Android phone with USB debugging enabled. This captures adb, device identity, installed package, version, and runtime permission snapshot evidence without installing, launching, or changing the device.

Run `npm run help:android-evidence -- --name <android-pass-name>` from the repository root to generate a dated Android evidence packet for device/package evidence, install, navigation, OAuth provider return, permissions, TalkBack, artifact identity, and final Android decisions. Use `--dry-run` first to confirm the target path and current source counts.

Run `npm run help:android-worksheet -- --name <android-pass-name>` from the repository root to generate a dated physical-device verification worksheet under `docs/help-center-planning/android-verification/`. Use `--dry-run` first to confirm the target path and current Android-related gate counts.

## 2. Current Android Build Assumptions

| Area | Current value | Evidence source |
|---|---|---|
| App ID | `com.lekhon.app` | `redirect/capacitor.config.ts` |
| App name | `Lekhon` | `redirect/capacitor.config.ts` |
| Web asset directory | `build` | `redirect/capacitor.config.ts` |
| Android scheme | `https` | `redirect/capacitor.config.ts` |
| Native root route | `/` redirects to `/home` in native app mode | `redirect/src/App.js` |
| Android back behavior | Navigates back inside app history; minimizes at `/` or `/home` | `redirect/src/App.js` |
| OAuth callback routes | `/auth/google/callback`, `/auth/facebook/callback`, `/auth/twitter/callback`, `/auth/linkedin/callback` | `redirect/src/App.js` |
| Permissions | Internet, camera, microphone, audio settings | `redirect/android/app/src/main/AndroidManifest.xml` |
| Optional device features | Camera and microphone are not required hardware | `redirect/android/app/src/main/AndroidManifest.xml` |

## 3. Required Build Checks

Run from `redirect`:

```text
npm run build
npx cap sync android
```

Run from `redirect/android` with Android Studio JBR:

```text
.\gradlew.bat assembleDebug
```

Then verify:

- APK exists at `redirect/android/app/build/outputs/apk/debug/app-debug.apk`.
- APK signature verifies with `apksigner verify --verbose`.
- APK contains current `assets/public/static/js` and `assets/public/static/css` bundles.
- App ID, version code, version name, min SDK, target SDK, and permissions are recorded in `09-release-evidence-record.md`.
- `npm run help:android-device-evidence` records the connected physical phone, installed package, app version, target SDK, and runtime permission snapshot.

Debug APK evidence is useful for development, but it is not Play Store production signing evidence.

## 4. Physical-Device Test Matrix

| Area | Required evidence | Pass criteria |
|---|---|---|
| Install | Install on a real Android phone through Android Studio, ADB, or APK file | App installs without clearing data unexpectedly unless uninstall was intentional |
| Start route | Launch app from icon | App opens Home, not landing page, login page, or failed-content screen |
| Help navigation | Open `/help`, category, article, support form, footer accordion | Routes render, links work, no horizontal overflow |
| Android back | Navigate Home to Help to article to support form, then press back step by step | Back returns to prior page until root, then minimizes |
| Seller/dashboard back | Seller dashboard to store and back | Returns to Seller Dashboard, not Home |
| Order back | Order list to order detail to Help article and back | Returns to previous order state |
| Offline/local save | Add-product section save, close form, reopen before and after expiry window | Only explicitly saved sections return; unsaved fields do not return |
| Clear storage | Clear app storage from Android settings | User is signed out and device-only data is removed, server account remains |

## 5. OAuth Provider Test Matrix

Test each provider on a physical phone with the latest deployed frontend and backend configuration:

| Provider | Required checks |
|---|---|
| Google | Provider opens in app or browser, user approves, callback exchanges code, session opens Home |
| Facebook | Provider opens in app or browser, user approves, callback exchanges code, session opens Home |
| X/Twitter | Provider opens in app or browser, user approves, callback exchanges code, session opens Home or email setup path |
| LinkedIn | Provider opens in app or browser, user approves, callback exchanges code, session opens Home or email setup path |

For each provider, record:

- Starting route.
- Start URL from the backend.
- Redirect URI sent to the backend.
- Provider account used.
- Whether the installed provider app or browser opened.
- Final callback URL domain.
- Final app state.
- Error text if failure occurs.

If a provider returns `redirect_uri is not allowed`, the deployed frontend callback and provider console configuration do not match. Update provider redirect URLs, not only local `.env`, unless the backend is also using stale environment values.

## 6. Permission Test Matrix

| Permission | Required feature check | Denied-permission check |
|---|---|---|
| Camera | Add-product image capture or camera-supported media flow | Denial shows recoverable path and Help guidance explains Settings recovery |
| Microphone | Voice note, direct call, or group call flow | Denial shows recoverable path and Help guidance explains Settings recovery |
| Audio settings | Call audio behavior where applicable | App does not crash if unavailable |
| Files/photos | Media or file selection where available | Unsupported or denied access gives clear guidance |

The Android manifest must match actual runtime prompts and the mobile permissions notice before Play Store submission.

## 7. TalkBack and Accessibility

Follow `14-accessibility-verification-protocol.md` for TalkBack. At minimum verify:

- Home announces meaningful content after launch.
- Help search, categories, article workflow strips, footer accordions, support/report/appeal forms, and success reference numbers are reachable.
- OAuth handoff does not strand focus.
- Camera and microphone permission prompts are understandable.
- Android back does not create confusing focus jumps.

## 8. Evidence Template

```markdown
## Android evidence

Release:
APK path:
APK SHA-256:
Device:
Android version:
Tester:
Date:

### Build

- Build command:
- Sync command:
- Signature verification:
- Bundle inspection:

### Navigation

- Start route:
- Help route:
- Back behavior:
- Seller/store behavior:
- Order/help behavior:

### OAuth

- Google:
- Facebook:
- X/Twitter:
- LinkedIn:

### Permissions

- Camera:
- Microphone:
- Files/photos:

### Accessibility

- TalkBack:
- Text size/display size:

### Issues

- Issue:
- Severity:
- Owner:
- Release decision:
```

## 9. Release Rule

The Android Help Center system is not release-complete if:

- The physical phone cannot install and open the app.
- The connected physical device, installed package, and runtime permission snapshot are not recorded.
- The app starts on the wrong route or shows failed-content state.
- Android back minimizes the app before returning through in-app history.
- OAuth provider return is unverified or fails without documented resolution.
- Camera or microphone permission behavior is undocumented or crashes.
- TalkBack cannot navigate Help, footer, support/report/appeal, or OAuth handoff.
- The app claims Play Store production readiness while only a debug APK has been verified.
