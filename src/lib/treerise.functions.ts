import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateState, computeGrowth, todayUTC, type TreeState } from "./treerise/logic";
import { SPECIES_BY_KEY, MILESTONE_GIFTS, ACHIEVEMENT_DEFS } from "./treerise/species";

function pseudoPos(seed: string): { x: number; z: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const r1 = ((h >>> 0) % 1000) / 1000;
  const r2 = (((h >>> 10) >>> 0) % 1000) / 1000;
  const radius = 1.5 + r1 * 4.5;
  const angle = r2 * Math.PI * 2;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

async function checkMilestonesAndAchievements(supabase: any, userId: string) {
  // count healthy trees + total days for milestones
  const { data: trees } = await supabase.from("trees").select("state, planted_on").eq("user_id", userId);
  const healthyCount = (trees ?? []).filter((t: any) => t.state === "healthy" || t.state === "reviving").length;
  const totalDays = trees?.length ?? 0;

  // milestone species unlocks
  for (const g of MILESTONE_GIFTS) {
    if (totalDays >= g.day) {
      await supabase.from("unlocked_species").upsert({ user_id: userId, species: g.species }, { onConflict: "user_id,species" });
    }
  }
  // achievements
  const earned: string[] = [];
  if (totalDays >= 1) earned.push("first_tree");
  if (healthyCount >= 10) earned.push("trees_10", "first_bird");
  if (healthyCount >= 20) earned.push("first_butterfly");
  if (healthyCount >= 25) earned.push("trees_25");
  if (healthyCount >= 50) earned.push("trees_50", "first_waterfall");
  if (healthyCount >= 100) earned.push("trees_100");
  if (healthyCount >= 200) earned.push("forest_master");
  for (const key of earned) {
    await supabase.from("achievements").upsert({ user_id: userId, key }, { onConflict: "user_id,key" });
  }
}

async function ensureTodayTree(supabase: any, userId: string) {
  const today = todayUTC();
  const { data: existing } = await supabase.from("trees").select("*").eq("user_id", userId).eq("planted_on", today).maybeSingle();
  if (existing) return existing;

  // Finalize yesterday's tree (if exists and not already final). Pull yesterday's usage.
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: yTree } = await supabase.from("trees").select("*").eq("user_id", userId).eq("planted_on", yesterday).maybeSingle();
  if (yTree) {
    const { data: yUsage } = await supabase.from("usage_logs").select("app_key, minutes_used").eq("user_id", userId).eq("day", yesterday);
    const { data: apps } = await supabase.from("tracked_apps").select("app_key, daily_limit_min, enabled").eq("user_id", userId).eq("enabled", true);
    const usageEntries = (apps ?? []).map((a: any) => {
      const u = (yUsage ?? []).find((x: any) => x.app_key === a.app_key);
      return { app_key: a.app_key, minutes_used: u?.minutes_used ?? 0, daily_limit_min: a.daily_limit_min };
    });
    const { state } = evaluateState(usageEntries);
    const growth = computeGrowth(usageEntries, state);
    await supabase.from("trees").update({ state, growth_pct: growth }).eq("id", yTree.id);

    // streak + coin grants
    const { data: prof } = await supabase.from("profiles").select("coins, current_streak, longest_streak").eq("id", userId).single();
    let coins = prof?.coins ?? 0;
    let streak = prof?.current_streak ?? 0;
    let longest = prof?.longest_streak ?? 0;
    if (state === "healthy") {
      coins += 50;
      const allLight = usageEntries.every((u: { daily_limit_min: number; minutes_used: number }) => u.daily_limit_min === 0 || u.minutes_used / u.daily_limit_min <= 0.5);
      if (allLight) coins += 50; // perfect
      streak += 1;
      if (streak > longest) longest = streak;
      if (streak > 0 && streak % 7 === 0) coins += 500;
    } else if (state === "dead") {
      streak = 0;
    }
    await supabase.from("profiles").update({ coins, current_streak: streak, longest_streak: longest, updated_at: new Date().toISOString() }).eq("id", userId);
  }

  // Choose today's species: pick a random unlocked species (weighted toward common)
  const { data: unlocked } = await supabase.from("unlocked_species").select("species").eq("user_id", userId);
  const speciesKeys = (unlocked ?? []).map((u: any) => u.species).filter((k: string) => SPECIES_BY_KEY[k]);
  const pool = speciesKeys.length ? speciesKeys : ["neem"];
  const species = pool[Math.floor(Math.random() * pool.length)];

  const pos = pseudoPos(`${userId}-${today}`);
  const { data: inserted } = await supabase
    .from("trees")
    .insert({ user_id: userId, species, planted_on: today, state: "healthy", growth_pct: 5, position_x: pos.x, position_z: pos.z })
    .select()
    .single();

  await checkMilestonesAndAchievements(supabase, userId);
  return inserted;
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = todayUTC();

    const todayTree = await ensureTodayTree(supabase, userId);

    const [{ data: profile }, { data: apps }, { data: usage }, { data: trees }, { data: unlocked }, { data: achievements }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("tracked_apps").select("*").eq("user_id", userId).order("app_key"),
      supabase.from("usage_logs").select("*").eq("user_id", userId).eq("day", today),
      supabase.from("trees").select("*").eq("user_id", userId).order("planted_on", { ascending: false }),
      supabase.from("unlocked_species").select("species"),
      supabase.from("achievements").select("key, unlocked_on"),
    ]);

    return {
      profile,
      apps: apps ?? [],
      usageToday: usage ?? [],
      trees: trees ?? [],
      todayTree,
      unlockedSpecies: (unlocked ?? []).map((u: any) => u.species),
      achievements: achievements ?? [],
    };
  });

export const logUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ app_key: z.string(), minutes_used: z.number().int().min(0).max(1440) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = todayUTC();
    await supabase.from("usage_logs").upsert({ user_id: userId, day: today, app_key: data.app_key, minutes_used: data.minutes_used }, { onConflict: "user_id,day,app_key" });

    // Live-update today's tree state based on current usage
    const { data: apps } = await supabase.from("tracked_apps").select("app_key, daily_limit_min, enabled").eq("user_id", userId).eq("enabled", true);
    const { data: usage } = await supabase.from("usage_logs").select("app_key, minutes_used").eq("user_id", userId).eq("day", today);
    const entries = (apps ?? []).map((a: any) => {
      const u = (usage ?? []).find((x: any) => x.app_key === a.app_key);
      return { app_key: a.app_key, minutes_used: u?.minutes_used ?? 0, daily_limit_min: a.daily_limit_min };
    });
    const { state } = evaluateState(entries);
    const growth = computeGrowth(entries, state);
    await supabase.from("trees").update({ state, growth_pct: growth }).eq("user_id", userId).eq("planted_on", today);
    return { ok: true };
  });

export const updateGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ apps: z.array(z.object({ app_key: z.string(), enabled: z.boolean(), daily_limit_min: z.number().int().min(0).max(1440) })) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    for (const a of data.apps) {
      await supabase.from("tracked_apps").upsert({ user_id: userId, app_key: a.app_key, enabled: a.enabled, daily_limit_min: a.daily_limit_min }, { onConflict: "user_id,app_key" });
    }
    return { ok: true };
  });

export const purchaseSpecies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ species: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const meta = SPECIES_BY_KEY[data.species];
    if (!meta) throw new Error("Unknown species");
    if (meta.price == null) throw new Error("This species is unlocked via milestones");
    const { data: profile } = await supabase.from("profiles").select("coins").eq("id", userId).single();
    const coins = profile?.coins ?? 0;
    if (coins < meta.price) throw new Error("Not enough coins");
    await supabase.from("profiles").update({ coins: coins - meta.price }).eq("id", userId);
    await supabase.from("unlocked_species").upsert({ user_id: userId, species: data.species }, { onConflict: "user_id,species" });
    return { ok: true };
  });

export const reviveTree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tree_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("coins").eq("id", userId).single();
    const coins = profile?.coins ?? 0;
    if (coins < 200) throw new Error("Need 200 coins to revive");
    await supabase.from("profiles").update({ coins: coins - 200 }).eq("id", userId);
    await supabase.from("trees").update({ state: "reviving" as TreeState, growth_pct: 50 }).eq("id", data.tree_id).eq("user_id", userId);
    return { ok: true };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ display_name: z.string().min(1).max(40).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const update: any = { onboarded: true };
    if (data.display_name) update.display_name = data.display_name;
    await supabase.from("profiles").update(update).eq("id", userId);
    return { ok: true };
  });

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
// re-export for convenience
export { ACHIEVEMENT_DEFS };
