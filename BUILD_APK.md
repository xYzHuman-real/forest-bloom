# Build TreeRise as an Android APK

This project is wired up with [Capacitor](https://capacitorjs.com) so you can ship the web app as a native Android APK.

## Prerequisites (install once)

- **Node.js 20+** and **Bun** (`npm i -g bun`)
- **Android Studio** (latest stable) — includes Android SDK + Platform-Tools
- **Java JDK 17** (Android Studio ships one; otherwise install Temurin 17)
- Set `ANDROID_HOME` env var (e.g. `~/Library/Android/sdk` on macOS or `%LOCALAPPDATA%\Android\Sdk` on Windows)

## 1. Clone & install

```bash
git clone <your-github-repo-url> treerise
cd treerise
bun install
```

Create a `.env` file at the project root with the values from Lovable (already provided in the project):

```
VITE_SUPABASE_URL=https://qtwckzurhdmngazkiook.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1...
VITE_SUPABASE_PROJECT_ID=qtwckzurhdmngazkiook
```

## 2. Add the Android platform

```bash
bunx cap add android
bunx cap sync android
```

This creates an `android/` folder (a full Gradle project).

## 3. Run on a device or emulator

Option A — open in Android Studio:
```bash
bunx cap open android
```
Then press the green ▶ Run button against an emulator or USB-connected phone (with USB debugging on).

Option B — straight from CLI:
```bash
bunx cap run android
```

## 4. Build a release APK

In `android/`:

```bash
cd android
./gradlew assembleRelease
```

The unsigned APK lands in:
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

To sign it for distribution, create a keystore and configure `android/app/build.gradle` `signingConfigs` — see https://capacitorjs.com/docs/android/deploying-to-google-play

## How the APK loads the app

`capacitor.config.ts` points `server.url` at the live Lovable preview URL, so the APK is a thin native shell that loads the always-up-to-date web app. No static export needed — push to GitHub → Lovable rebuilds → next app launch picks it up.

When you publish the project on Lovable, update `server.url` in `capacitor.config.ts` to your published domain (e.g. `https://treerise.lovable.app`) and re-run `bunx cap sync android`.

## Troubleshooting

- **White screen on launch** — check the device has internet; the APK loads the web app over HTTPS.
- **Gradle / SDK errors** — open `android/` in Android Studio once; it will prompt to install missing SDK components.
- **`cap` command not found** — use `bunx cap ...` (or `npx cap ...`).
