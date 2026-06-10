#!/usr/bin/env node
// Injects the custom UsageStats Kotlin plugin into the Capacitor-generated android/ project.
// Idempotent: safe to re-run after `cap sync`.
//
// - Copies android-plugin-src/java/** into android/app/src/main/java/**
// - Registers the plugin in MainActivity.java
// - Adds required <uses-permission> entries to AndroidManifest.xml
// - Adds the WorkManager runtime dependency to app/build.gradle

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ANDROID = path.join(root, "android");
if (!fs.existsSync(ANDROID)) {
  console.error("[inject] android/ not found. Run `bunx cap add android` first.");
  process.exit(0);
}

const JAVA_SRC = path.join(root, "android-plugin-src/java");
const JAVA_DEST = path.join(ANDROID, "app/src/main/java");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log("[inject] Copying Kotlin sources …");
copyDir(JAVA_SRC, JAVA_DEST);

// --- Register plugin in MainActivity ---
const mainActivityCandidates = [
  "android/app/src/main/java/com/treerise/app/MainActivity.java",
  "android/app/src/main/java/com/treerise/app/MainActivity.kt",
];
let mainActivityPath = mainActivityCandidates
  .map((p) => path.join(root, p))
  .find((p) => fs.existsSync(p));

if (mainActivityPath) {
  let src = fs.readFileSync(mainActivityPath, "utf8");
  const isKotlin = mainActivityPath.endsWith(".kt");
  if (!src.includes("UsageStatsPlugin")) {
    if (isKotlin) {
      src = src.replace(
        /class MainActivity[^{]*\{/,
        (m) =>
          `import com.treerise.app.usage.UsageStatsPlugin\nimport android.os.Bundle\n\n${m}\n  override fun onCreate(savedInstanceState: Bundle?) {\n    registerPlugin(UsageStatsPlugin::class.java)\n    super.onCreate(savedInstanceState)\n  }\n`,
      );
    } else {
      src = src.replace(
        /public class MainActivity[^{]*\{/,
        (m) =>
          `import com.treerise.app.usage.UsageStatsPlugin;\nimport android.os.Bundle;\n\n${m}\n  @Override\n  public void onCreate(Bundle savedInstanceState) {\n    registerPlugin(UsageStatsPlugin.class);\n    super.onCreate(savedInstanceState);\n  }\n`,
      );
    }
    fs.writeFileSync(mainActivityPath, src);
    console.log("[inject] Registered UsageStatsPlugin in MainActivity");
  } else {
    console.log("[inject] MainActivity already registers UsageStatsPlugin");
  }
} else {
  console.warn("[inject] MainActivity not found — skipped registration");
}

// --- Patch AndroidManifest.xml ---
const manifestPath = path.join(ANDROID, "app/src/main/AndroidManifest.xml");
if (fs.existsSync(manifestPath)) {
  let mf = fs.readFileSync(manifestPath, "utf8");
  if (!mf.includes('xmlns:tools=')) {
    mf = mf.replace(
      /<manifest /,
      '<manifest xmlns:tools="http://schemas.android.com/tools" ',
    );
  }
  const perms = fs
    .readFileSync(path.join(root, "android-plugin-src/manifest/permissions.xml"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("<uses-permission"));
  for (const p of perms) {
    const nameMatch = p.match(/android:name="([^"]+)"/);
    if (!nameMatch) continue;
    if (mf.includes(nameMatch[1])) continue;
    mf = mf.replace(/<application/, `    ${p}\n\n    <application`);
  }
  fs.writeFileSync(manifestPath, mf);
  console.log("[inject] Manifest permissions ensured");
}

// --- Add WorkManager dependency to app/build.gradle ---
const gradlePath = path.join(ANDROID, "app/build.gradle");
if (fs.existsSync(gradlePath)) {
  let g = fs.readFileSync(gradlePath, "utf8");
  if (!g.includes("androidx.work:work-runtime")) {
    g = g.replace(
      /dependencies\s*\{/,
      (m) =>
        `${m}\n    implementation "androidx.work:work-runtime-ktx:2.9.1"\n    implementation "org.jetbrains.kotlin:kotlin-stdlib:1.9.24"`,
    );
    fs.writeFileSync(gradlePath, g);
    console.log("[inject] Added WorkManager + Kotlin stdlib dependency");
  }
}

// --- Ensure project-level kotlin plugin ---
const projectGradle = path.join(ANDROID, "build.gradle");
if (fs.existsSync(projectGradle)) {
  let g = fs.readFileSync(projectGradle, "utf8");
  if (!g.includes("kotlin-gradle-plugin")) {
    g = g.replace(
      /dependencies\s*\{/,
      (m) =>
        `${m}\n        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24"`,
    );
    fs.writeFileSync(projectGradle, g);
    console.log("[inject] Added Kotlin gradle plugin to project build.gradle");
  }
}

// --- Apply kotlin-android plugin in app/build.gradle ---
if (fs.existsSync(gradlePath)) {
  let g = fs.readFileSync(gradlePath, "utf8");
  if (!g.includes("kotlin-android")) {
    g = g.replace(
      /apply plugin: 'com\.android\.application'/,
      `apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'`,
    );
    fs.writeFileSync(gradlePath, g);
    console.log("[inject] Applied kotlin-android plugin");
  }
}

console.log("[inject] Done.");
