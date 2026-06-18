# Lekhon Android App

This folder is configured as the source for the Lekhon Android app through Capacitor.

## Local Requirements

- Android Studio installed
- Android SDK installed at `C:/Users/soumy/AppData/Local/Android/Sdk`
- Java 21. Android Studio provides this at `D:/Apps/Android Studio/jbr`

If the terminal still uses Java 17, run Android commands like this from `redirect/android`:

```powershell
$env:JAVA_HOME='D:\Apps\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
```

## Common Commands

From `redirect`:

```powershell
npm run build
npx cap sync android
npx cap open android
```

Or use the package scripts:

```powershell
npm run android:sync
npm run android:open
npm run android:run
```

## API Origin Requirement

The Android app runs inside Capacitor with origin:

```text
https://localhost
```

The backend CORS allowlist must include that origin. `backend/server.js` has been updated locally, but the deployed backend must be redeployed/restarted before the installed Android app can load remote content from Render.

## Verified Locally

- React production build passes.
- Capacitor Android project is generated.
- Debug APK builds with Android Studio Java 21.
- App installs and launches on emulator `emulator-5554`.
