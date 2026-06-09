export type TreeState = "healthy" | "weak" | "dying" | "dead" | "reviving";

export interface UsageEntry { app_key: string; minutes_used: number; daily_limit_min: number }

export function evaluateState(usage: UsageEntry[]): { state: TreeState; maxRatio: number; overCount: number } {
  let maxRatio = 0;
  let overCount = 0;
  for (const u of usage) {
    const ratio = u.daily_limit_min <= 0 ? 0 : u.minutes_used / u.daily_limit_min;
    if (ratio > maxRatio) maxRatio = ratio;
    if (ratio > 1) overCount++;
  }
  let state: TreeState = "healthy";
  if (maxRatio > 1.75 || overCount >= 2) state = "dead";
  else if (maxRatio > 1.25) state = "dying";
  else if (maxRatio > 1.0) state = "weak";
  return { state, maxRatio, overCount };
}

export function computeGrowth(usage: UsageEntry[], state: TreeState): number {
  if (state === "dead") return Math.max(2, Math.round(Math.random() * 5));
  if (state === "dying") return 20;
  if (state === "weak") return 45;
  // healthy — scale by how light usage is
  const avg = usage.length === 0 ? 0 : usage.reduce((s, u) => s + (u.daily_limit_min <= 0 ? 0 : u.minutes_used / u.daily_limit_min), 0) / usage.length;
  const efficiency = Math.max(0, 1 - avg); // 0..1
  return Math.round(60 + efficiency * 40);
}

export function growthStage(daysOld: number): { key: string; label: string; size: number } {
  if (daysOld < 1) return { key: "seed", label: "Seed", size: 0.4 };
  if (daysOld < 3) return { key: "sprout", label: "Sprout", size: 0.6 };
  if (daysOld < 7) return { key: "growing", label: "Growing", size: 0.8 };
  if (daysOld < 14) return { key: "thriving", label: "Thriving", size: 1.0 };
  return { key: "mature", label: "Mature", size: 1.15 };
}

export function forestHealthPct(trees: Array<{ state: TreeState }>): number {
  if (trees.length === 0) return 100;
  const weights: Record<TreeState, number> = { healthy: 1, reviving: 0.7, weak: 0.5, dying: 0.25, dead: 0 };
  const total = trees.reduce((s, t) => s + weights[t.state], 0);
  return Math.round((total / trees.length) * 100);
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function warningCopy(usage: UsageEntry[]): string | null {
  // pick app closest to limit but not over
  let best: { app: string; remaining: number } | null = null;
  for (const u of usage) {
    if (u.minutes_used >= u.daily_limit_min) continue;
    const remaining = u.daily_limit_min - u.minutes_used;
    if (remaining < u.daily_limit_min * 0.35 && (!best || remaining < best.remaining)) {
      best = { app: u.app_key, remaining };
    }
  }
  if (!best) return null;
  return `${best.remaining} more min on ${best.app[0].toUpperCase() + best.app.slice(1)} and your tree will start losing leaves.`;
}
