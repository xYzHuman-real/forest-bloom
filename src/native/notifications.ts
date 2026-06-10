import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const SUPPORTIVE_LINES = [
  { title: "Your forest is waking up 🌱", body: "A new tree is ready to grow today." },
  { title: "Check in on your tree 🌿", body: "A quick glance keeps today's tree thriving." },
  { title: "Your forest is doing well today 🌳", body: "Keep going — your streak is growing." },
];

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const status = await LocalNotifications.checkPermissions();
  if (status.display === "granted") return true;
  const req = await LocalNotifications.requestPermissions();
  return req.display === "granted";
}

export async function scheduleDailyTreeNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    const now = new Date();
    const hours = [9, 14, 20];
    const notifications = hours.map((h, i) => {
      const at = new Date(now);
      at.setHours(h, 0, 0, 0);
      if (at.getTime() < now.getTime()) at.setDate(at.getDate() + 1);
      return {
        id: 1000 + i,
        title: SUPPORTIVE_LINES[i].title,
        body: SUPPORTIVE_LINES[i].body,
        schedule: { at, repeats: true, every: "day" as const, allowWhileIdle: true },
        smallIcon: "ic_stat_icon",
      };
    });
    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn("scheduleDailyTreeNotifications failed", e);
  }
}

export async function notifyAtRisk(appName: string, remainingMin: number) {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Math.random() * 100000),
        title: `${appName} limit is almost reached`,
        body: `Just ${remainingMin} more min — protect today's tree.`,
        smallIcon: "ic_stat_icon",
      },
    ],
  });
}
