#!/usr/bin/env node
// Injects the custom UsageStats Java plugin into the Capacitor-generated android/ project.
// Idempotent: safe to re-run after `cap sync`.

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

console.log("[inject] Copying Java sources …");
copyDir(JAVA_SRC, JAVA_DEST);

// --- Register plugin in MainActivity (Java) ---
const mainActivityPath = path.join(
  ANDROID,
  "app/src/main/java/com/treerise/app/MainActivity.java",
);
if (fs.existsSync(mainActivityPath)) {
  let src = fs.readFileSync(mainActivityPath, "utf8");
  if (!src.includes("UsageStatsPlugin")) {
    if (!src.includes("import com.treerise.app.usage.UsageStatsPlugin;")) {
      src = src.replace(
        /(package [^;]+;\s*)/,
        `$1\nimport android.os.Bundle;\nimport com.treerise.app.usage.UsageStatsPlugin;\n`,
      );
    }
    src = src.replace(
      /public class MainActivity[^{]*\{/,
      (m) =>
        `${m}\n  @Override\n  public void onCreate(Bundle savedInstanceState) {\n    registerPlugin(UsageStatsPlugin.class);\n    super.onCreate(savedInstanceState);\n  }\n`,
    );
    fs.writeFileSync(mainActivityPath, src);
    console.log("[inject] Registered UsageStatsPlugin in MainActivity");
  } else {
    console.log("[inject] MainActivity already registers UsageStatsPlugin");
  }
} else {
  console.warn("[inject] MainActivity.java not found — skipped registration");
}

// --- Patch AndroidManifest.xml ---
const manifestPath = path.join(ANDROID, "app/src/main/AndroidManifest.xml");
if (fs.existsSync(manifestPath)) {
  let mf = fs.readFileSync(manifestPath, "utf8");
  if (!mf.includes("xmlns:tools=")) {
    mf = mf.replace(
      /<manifest /,
      '<manifest xmlns:tools="http://schemas.android.com/tools" ',
    );
  }
  const perms = fs
    .readFileSync(
      path.join(root, "android-plugin-src/manifest/permissions.xml"),
      "utf8",
    )
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

// --- Add WorkManager runtime dependency ---
const gradlePath = path.join(ANDROID, "app/build.gradle");
if (fs.existsSync(gradlePath)) {
  let g = fs.readFileSync(gradlePath, "utf8");
  if (!g.includes("androidx.work:work-runtime")) {
    g = g.replace(
      /dependencies\s*\{/,
      (m) => `${m}\n    implementation "androidx.work:work-runtime:2.9.1"`,
    );
    fs.writeFileSync(gradlePath, g);
    console.log("[inject] Added WorkManager dependency");
  }
}

console.log("[inject] Done.");
