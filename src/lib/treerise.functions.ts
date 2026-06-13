import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateState, computeGrowth, todayUTC, type TreeState } from "./treerise/logic";
import { SPECIES_BY_KEY, MILESTONE_GIFTS, ACHIEVEMENT_DEFS } from "./treerise/species";
import { ISLAND_CAPACITY, levelFor } from "./treerise/levels";

// Sunflower / phyllotaxis layout — guarantees non-overlapping tree positions
// across an island regardless of how many trees have been planted.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
function phyllotaxisPos(index: number): { x: number; z: number } {
  const r = Math.sqrt((index + 0.5) / ISLAND_CAPACITY) * 5.6;
  const angle = index * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
}

async function ensureIslandForNewTree(supabase: any, userId: string): Promise<number> {
  const { data: islands } = await supabase
    .from("islands").select("index").eq("user_id", userId).order("index", { ascending: true });
  let list = (islands ?? []) as { index: number }[];
  if (list.length === 0) {
    await supabase.from("islands").insert({ user_id: userId, index: 0, level: 1, name: "Seedling Island" });
    list = [{ index: 0 }];
  }
  const lastIdx = list[list.length - 1].index;
  const { count } = await supabase
    .from("trees").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("island_index", lastIdx);
  if ((count ?? 0) >= ISLAND_CAPACITY) {
    const nextIdx = lastIdx + 1;
    await supabase.from("islands").insert({
      user_id: userId, index: nextIdx, level: 1,
      name: `Island ${nextIdx + 1}`,
    });
    return nextIdx;
  }
  return lastIdx;
}

async function upsertDailySummary(supabase: any, userId: string, day: string, payload: {
  state: TreeState | "none"; tree_id?: string | null; species?: string | null; coins_earned?: number; usage?: any[];
}) {
  await supabase.from("daily_summaries").upsert({
    user_id: userId, day,
    state: payload.state,
    tree_id: payload.tree_id ?? null,
    species: payload.species ?? null,
    coins_earned: payload.coins_earned ?? 0,
    usage_json: payload.usage ?? [],
  }, { onConflict: "user_id,day" });
}

async function progressRevivalMissions(supabase: any, userId: string, day: string, state: TreeState | "none") {
  if (state !== "healthy") return;
  const { data: missions } = await supabase
    .from("revival_missions").select("*").eq("user_id", userId).eq("completed", false);
  for (const m of (missions ?? []) as any[]) {
    if (m.last_progress_day === day) continue;
    const next = (m.successful_days ?? 0) + 1;
    if (next >= 3) {
      await supabase.from("revival_missions").update({
        successful_days: next, last_progress_day: day, completed: true, completed_at: new Date().toISOString(),
      }).eq("id", m.id);
      await supabase.from("trees").update({ state: "reviving" as TreeState, growth_pct: 50, revived_at: new Date().toISOString() })
        .eq("id", m.tree_id).eq("user_id", userId);
    } else {
      await supabase.from("revival_missions").update({ successful_days: next, last_progress_day: day }).eq("id", m.id);
    }
  }
}

async function refreshProfileTotals(supabase: any, userId: string) {
  const { data: trees } = await supabase.from("trees").select("state").eq("user_id", userId);
  const healthy = (trees ?? []).filter((t: any) => t.state === "healthy" || t.state === "reviving").length;
  const dead = (trees ?? []).filter((t: any) => t.state === "dead").length;
  const level = levelFor(healthy).level;
  await supabase.from("profiles").update({ total_healthy: healthy, total_dead: dead, forest_level: level }).eq("id", userId);
}

async function checkMilestonesAndAchievements(supabase: any, userId: string) {
  const { data: trees } = await supabase.from("trees").select("state, planted_on").eq("user_id", userId);
  const healthyCount = (trees ?? []).filter((t: any) => t.state === "healthy" || t.state === "reviving").length;
  const totalDays = trees?.length ?? 0;

  for (const g of MILESTONE_GIFTS) {
    if (totalDays >= g.day) {
      await supabase.from("unlocked_species").upsert({ user_id: userId, species: g.species }, { onConflict: "user_id,species" });
    }
  }
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
    const treeUpdate: any = { state, growth_pct: growth };
    if (state === "dead") treeUpdate.died_on = yesterday;
    await supabase.from("trees").update(treeUpdate).eq("id", yTree.id);

    const { data: prof } = await supabase.from("profiles").select("coins, current_streak, longest_streak").eq("id", userId).single();
    let coins = prof?.coins ?? 0;
    let streak = prof?.current_streak ?? 0;
    let longest = prof?.longest_streak ?? 0;
    let coinsEarned = 0;
    if (state === "healthy") {
      coins += 50; coinsEarned += 50;
      const allLight = usageEntries.every((u: { daily_limit_min: number; minutes_used: number }) => u.daily_limit_min === 0 || u.minutes_used / u.daily_limit_min <= 0.5);
      if (allLight) { coins += 50; coinsEarned += 50; }
      streak += 1;
      if (streak > longest) longest = streak;
      if (streak > 0 && streak % 7 === 0) { coins += 500; coinsEarned += 500; }
      // create chest (idempotent)
      await supabase.from("daily_chests").upsert({
        user_id: userId, day: yesterday, opened: false,
        reward_kind: "coins", reward_payload: { coins: 25 + Math.floor(Math.random() * 75) },
      }, { onConflict: "user_id,day" });
    } else if (state === "dead") {
      streak = 0;
    }
    await supabase.from("profiles").update({ coins, current_streak: streak, longest_streak: longest, updated_at: new Date().toISOString() }).eq("id", userId);

    await upsertDailySummary(supabase, userId, yesterday, {
      state, tree_id: yTree.id, species: yTree.species, coins_earned: coinsEarned, usage: usageEntries,
    });
    await progressRevivalMissions(supabase, userId, yesterday, state);
    await refreshProfileTotals(supabase, userId);
  }

  const { data: unlocked } = await supabase.from("unlocked_species").select("species").eq("user_id", userId);
  const speciesKeys = (unlocked ?? []).map((u: any) => u.species).filter((k: string) => SPECIES_BY_KEY[k]);
  const pool = speciesKeys.length ? speciesKeys : ["neem"];
  const species = pool[Math.floor(Math.random() * pool.length)];

  const islandIndex = await ensureIslandForNewTree(supabase, userId);
  const { count: islandTreeCount } = await supabase
    .from("trees").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("island_index", islandIndex);
  const pos = phyllotaxisPos(islandTreeCount ?? 0);
  const { data: inserted } = await supabase
    .from("trees")
    .insert({ user_id: userId, species, planted_on: today, state: "healthy", growth_pct: 5, position_x: pos.x, position_z: pos.z, island_index: islandIndex })
    .select()
    .single();

  await upsertDailySummary(supabase, userId, today, { state: "healthy", tree_id: inserted?.id, species, usage: [] });
  await checkMilestonesAndAchievements(supabase, userId);
  return inserted;
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = todayUTC();

    const todayTree = await ensureTodayTree(supabase, userId);

    const [{ data: profile }, { data: apps }, { data: usage }, { data: trees }, { data: unlocked }, { data: achievements }, { data: islands }, { data: chest }, { data: missions }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("tracked_apps").select("*").eq("user_id", userId).order("app_key"),
      supabase.from("usage_logs").select("*").eq("user_id", userId).eq("day", today),
      supabase.from("trees").select("*").eq("user_id", userId).order("planted_on", { ascending: false }),
      supabase.from("unlocked_species").select("species"),
      supabase.from("achievements").select("key, unlocked_on"),
      supabase.from("islands").select("*").eq("user_id", userId).order("index", { ascending: true }),
      supabase.from("daily_chests").select("*").eq("user_id", userId).eq("opened", false).order("day", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("revival_missions").select("*").eq("user_id", userId).eq("completed", false),
    ]);

    return {
      profile,
      apps: apps ?? [],
      usageToday: usage ?? [],
      trees: trees ?? [],
      todayTree,
      unlockedSpecies: (unlocked ?? []).map((u: any) => u.species),
      achievements: achievements ?? [],
      islands: islands ?? [],
      pendingChest: chest ?? null,
      activeRevivalMissions: missions ?? [],
    };
  });

export const logUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ app_key: z.string(), minutes_used: z.number().int().min(0).max(1440) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = todayUTC();
    await supabase.from("usage_logs").upsert({ user_id: userId, day: today, app_key: data.app_key, minutes_used: data.minutes_used }, { onConflict: "user_id,day,app_key" });

    const { data: apps } = await supabase.from("tracked_apps").select("app_key, daily_limit_min, enabled").eq("user_id", userId).eq("enabled", true);
    const { data: usage } = await supabase.from("usage_logs").select("app_key, minutes_used").eq("user_id", userId).eq("day", today);
    const entries = (apps ?? []).map((a: any) => {
      const u = (usage ?? []).find((x: any) => x.app_key === a.app_key);
      return { app_key: a.app_key, minutes_used: u?.minutes_used ?? 0, daily_limit_min: a.daily_limit_min };
    });
    const { state } = evaluateState(entries);
    const growth = computeGrowth(entries, state);
    await supabase.from("trees").update({ state, growth_pct: growth }).eq("user_id", userId).eq("planted_on", today);

    const { data: todayTree } = await supabase.from("trees").select("id, species").eq("user_id", userId).eq("planted_on", today).maybeSingle();
    await upsertDailySummary(supabase, userId, today, {
      state, tree_id: todayTree?.id, species: todayTree?.species, usage: entries,
    });
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
    await supabase.from("trees").update({ state: "reviving" as TreeState, growth_pct: 50, revived_at: new Date().toISOString() }).eq("id", data.tree_id).eq("user_id", userId);
    await refreshProfileTotals(supabase, userId);
    return { ok: true };
  });

export const startRevivalMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tree_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tree } = await supabase.from("trees").select("state").eq("id", data.tree_id).eq("user_id", userId).maybeSingle();
    if (!tree) throw new Error("Tree not found");
    if (tree.state !== "dead") throw new Error("Only dead trees need revival");
    const { data: existing } = await supabase.from("revival_missions").select("id").eq("user_id", userId).eq("tree_id", data.tree_id).eq("completed", false).maybeSingle();
    if (existing) return { ok: true, already: true };
    await supabase.from("revival_missions").insert({ user_id: userId, tree_id: data.tree_id, successful_days: 0 });
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

// ===== V2 server functions =====

export const getCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = new Date(Date.UTC(data.year, data.month - 1, 1));
    const end = new Date(Date.UTC(data.year, data.month, 0));
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("daily_summaries").select("day, state, species, coins_earned, tree_id")
      .eq("user_id", userId).gte("day", startStr).lte("day", endStr);
    return { year: data.year, month: data.month, days: rows ?? [] };
  });

export const getDayDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: summary } = await supabase.from("daily_summaries").select("*").eq("user_id", userId).eq("day", data.day).maybeSingle();
    const { data: usage } = await supabase.from("usage_logs").select("app_key, minutes_used").eq("user_id", userId).eq("day", data.day);
    let tree: any = null;
    if (summary?.tree_id) {
      const { data: t } = await supabase.from("trees").select("*").eq("id", summary.tree_id).maybeSingle();
      tree = t;
    }
    return { day: data.day, summary, usage: usage ?? [], tree };
  });

export const getForestStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { count: totalDays }, { count: healthyDays }, { data: islands }] = await Promise.all([
      supabase.from("profiles").select("forest_started_on, total_healthy, total_dead, forest_level, current_streak, longest_streak").eq("id", userId).single(),
      supabase.from("daily_summaries").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("state", "none"),
      supabase.from("daily_summaries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("state", "healthy"),
      supabase.from("islands").select("*").eq("user_id", userId).order("index", { ascending: true }),
    ]);
    const days = (totalDays ?? 0);
    const successRate = days === 0 ? 0 : Math.round(((healthyDays ?? 0) / days) * 100);
    return { profile, successRate, totalDays: days, healthyDays: healthyDays ?? 0, islands: islands ?? [] };
  });

export const claimChest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: chest } = await supabase.from("daily_chests").select("*").eq("user_id", userId).eq("day", data.day).maybeSingle();
    if (!chest) throw new Error("No chest for that day");
    if (chest.opened) return { ok: true, alreadyOpened: true, reward: chest.reward_payload as any };
    const reward = (chest.reward_payload as any) ?? { coins: 50 };
    const coinsReward = Number(reward?.coins ?? 0);
    if (coinsReward > 0) {
      const { data: prof } = await supabase.from("profiles").select("coins").eq("id", userId).single();
      await supabase.from("profiles").update({ coins: (prof?.coins ?? 0) + coinsReward }).eq("id", userId);
    }
    await supabase.from("daily_chests").update({ opened: true, opened_at: new Date().toISOString() }).eq("id", chest.id);
    return { ok: true, reward };
  });

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
export { ACHIEVEMENT_DEFS };
