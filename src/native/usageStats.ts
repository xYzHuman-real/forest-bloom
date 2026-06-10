// Bridge to the custom Kotlin UsageStats plugin.
// On web/preview this is a no-op so the app keeps working in Lovable.
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface InstalledApp {
  packageName: string;
  appName: string;
}

export interface UsageEntry {
  packageName: string;
  minutes: number;
}

export interface UsageStatsPlugin {
  hasUsageAccess(): Promise<{ granted: boolean }>;
  requestUsageAccess(): Promise<void>;
  listInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  getTodayUsage(): Promise<{ entries: UsageEntry[] }>;
  scheduleHourlySync(opts: { endpoint: string; bearer: string }): Promise<void>;
  cancelHourlySync(): Promise<void>;
  isIgnoringBatteryOptimizations(): Promise<{ ignoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
}

const noop = async () => {
  throw new Error("UsageStats is only available in the Android app.");
};

const webStub: UsageStatsPlugin = {
  hasUsageAccess: async () => ({ granted: false }),
  requestUsageAccess: noop,
  listInstalledApps: async () => ({ apps: [] }),
  getTodayUsage: async () => ({ entries: [] }),
  scheduleHourlySync: noop,
  cancelHourlySync: async () => {},
  isIgnoringBatteryOptimizations: async () => ({ ignoring: true }),
  requestIgnoreBatteryOptimizations: noop,
};

export const UsageStats = registerPlugin<UsageStatsPlugin>("UsageStats", {
  web: webStub,
});

export const isNativeAndroid = () =>
  Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform();
