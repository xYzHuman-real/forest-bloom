import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getDashboard, logUsage } from "@/lib/treerise.functions";
import { SPECIES_BY_KEY, TRACKED_APP_META } from "@/lib/treerise/species";
import { evaluateState, growthStage, forestHealthPct, warningCopy, type TreeState } from "@/lib/treerise/logic";
import { TreeIcon } from "@/components/TreeIcon";
import { CoinPill } from "@/components/CoinPill";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UsageStats, isNativeAndroid } from "@/native/usageStats";
import { isDebugMode } from "@/native/debugMode";

export const Route = createFileRoute("/_authenticated/home")({
  ssr: false,
  component: HomePage,
});

function HomePage() {
  const fetchDash = useServerFn(getDashboard);
  const log = useServerFn(logUsage);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const logMut = useMutation({
    mutationFn: (v: { app_key: string; minutes_used: number }) => log({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  if (isLoading || !data) {
    return <div className="min-h-screen grid place-items-center"><div className="size-12 rounded-full bg-primary/20 animate-pulse" /></div>;
  }

  const { profile, todayTree, apps, usageToday, trees } = data;
  const usageEntries = apps.map((a: any) => ({
    app_key: a.app_key, daily_limit_min: a.daily_limit_min,
    minutes_used: usageToday.find((u: any) => u.app_key === a.app_key)?.minutes_used ?? 0,
    enabled: a.enabled,
  }));
  const enabledUsage = usageEntries.filter((u: any) => u.enabled);
  const { state } = evaluateState(enabledUsage);
  const daysOld = Math.max(0, Math.floor((Date.now() - new Date(todayTree.planted_on).getTime()) / 86400000));
  const stage = growthStage(daysOld);
  const health = forestHealthPct(trees);
  const warning = warningCopy(enabledUsage);
  const species = SPECIES_BY_KEY[todayTree.species] ?? SPECIES_BY_KEY["neem"];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen pb-32 safe-top px-5 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-muted-foreground">{greeting}</div>
          <div className="font-display text-2xl">{profile?.display_name ?? "Friend"}</div>
        </div>
        <CoinPill amount={profile?.coins ?? 0} />
      </div>

      {/* Today's tree hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="soft-card p-5 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${species.hue} 18%, white), white)` }}
      >
        <div className="absolute -top-10 -right-8 size-40 rounded-full" style={{ background: `${species.hue}25` }} />
        <div className="flex items-start justify-between relative">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Today's tree</div>
            <div className="font-display text-2xl mt-0.5">{species.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Stage · {stage.label}</div>
            <StateBadge state={state as TreeState} />
          </div>
          <motion.div
            key={state}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <TreeIcon species={todayTree.species} state={state as TreeState} size={130} />
          </motion.div>
        </div>

        <div className="relative mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Growth</span>
            <span className="font-semibold">{todayTree.growth_pct}%</span>
          </div>
          <Progress value={todayTree.growth_pct} className="h-2" />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatCard label="Forest health" value={`${health}%`} accent="oklch(0.95 0.06 150)" />
        <StatCard label="Streak" value={`${profile?.current_streak ?? 0} 🔥`} accent="oklch(0.96 0.06 70)" />
      </div>

      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 flex items-start gap-3 rounded-2xl border border-[oklch(0.85_0.12_70)] bg-[oklch(0.98_0.04_85)] p-3.5"
          >
            <AlertCircle className="size-5 text-[oklch(0.55_0.18_55)] shrink-0 mt-0.5" />
            <p className="text-sm text-[oklch(0.35_0.08_60)]">{warning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usage list */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Today's usage</h2>
          <Drawer>
            <DrawerTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full h-9 gap-1"><Plus className="size-4" /> Log</Button>
            </DrawerTrigger>
            <LogUsageDrawer apps={apps.filter((a: any) => a.enabled)} current={usageEntries} onLog={(app, mins) => logMut.mutate({ app_key: app, minutes_used: mins })} />
          </Drawer>
        </div>
        <div className="space-y-2.5">
          {usageEntries.filter((u: any) => u.enabled).map((u: any) => <UsageRow key={u.app_key} u={u} />)}
        </div>
      </div>

      {/* Hint */}
      <div className="mt-6 rounded-2xl bg-accent/40 p-4 flex gap-3 items-start">
        <Sparkles className="size-5 text-primary mt-0.5" />
        <div className="text-xs text-foreground/80">
          <strong>Tip:</strong> in the published mobile app we'll read Android Usage Access automatically. Until then, tap <em>Log</em> to enter how long you've used each app today.
        </div>
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: TreeState }) {
  const map: Record<TreeState, { label: string; bg: string; color: string }> = {
    healthy:  { label: "Healthy",  bg: "oklch(0.94 0.08 150)", color: "oklch(0.32 0.12 150)" },
    weak:     { label: "Weak",     bg: "oklch(0.95 0.1 75)",   color: "oklch(0.45 0.14 60)" },
    dying:    { label: "Dying",    bg: "oklch(0.95 0.12 40)",  color: "oklch(0.45 0.18 30)" },
    dead:     { label: "Dead",     bg: "oklch(0.9 0.02 40)",   color: "oklch(0.35 0.04 40)" },
    reviving: { label: "Reviving", bg: "oklch(0.94 0.08 150)", color: "oklch(0.32 0.12 150)" },
  };
  const s = map[state];
  return <span className="pill mt-2" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="soft-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
      <div className="mt-2 h-1 rounded-full" style={{ background: accent }} />
    </div>
  );
}

function UsageRow({ u }: { u: { app_key: string; minutes_used: number; daily_limit_min: number } }) {
  const meta = TRACKED_APP_META[u.app_key] ?? { name: u.app_key, emoji: "📱", color: "#999" };
  const ratio = u.daily_limit_min === 0 ? 0 : u.minutes_used / u.daily_limit_min;
  const pct = Math.min(100, ratio * 100);
  const over = ratio > 1;
  return (
    <div className="soft-card px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl grid place-items-center text-base" style={{ background: `${meta.color}1a` }}>{meta.emoji}</div>
          <div className="font-semibold">{meta.name}</div>
        </div>
        <div className={over ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {u.minutes_used}<span className="text-muted-foreground">/{u.daily_limit_min}</span> min
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? "var(--color-destructive)" : ratio > 0.75 ? "var(--color-warn)" : "var(--color-primary)" }} />
      </div>
    </div>
  );
}

function LogUsageDrawer({ apps, current, onLog }: { apps: any[]; current: any[]; onLog: (app: string, min: number) => void }) {
  const [app, setApp] = useState(apps[0]?.app_key ?? "instagram");
  const cur = current.find((u: any) => u.app_key === app)?.minutes_used ?? 0;
  const [val, setVal] = useState(cur);
  const meta = TRACKED_APP_META[app];
  return (
    <DrawerContent>
      <div className="mx-auto max-w-[480px] w-full px-5 pb-8">
        <DrawerHeader className="px-0">
          <DrawerTitle className="font-display text-2xl">Log your usage</DrawerTitle>
        </DrawerHeader>
        <div className="flex gap-2 flex-wrap mb-5">
          {apps.map((a: any) => {
            const m = TRACKED_APP_META[a.app_key];
            const sel = a.app_key === app;
            return (
              <button key={a.app_key} onClick={() => { setApp(a.app_key); setVal(current.find((u: any) => u.app_key === a.app_key)?.minutes_used ?? 0); }}
                className={`pill border ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                <span>{m?.emoji}</span><span>{m?.name}</span>
              </button>
            );
          })}
        </div>
        <div className="text-center mb-4">
          <div className="font-display text-5xl">{val}<span className="text-base text-muted-foreground"> min</span></div>
          <div className="text-xs text-muted-foreground mt-1">Limit: {apps.find((a: any) => a.app_key === app)?.daily_limit_min} min</div>
        </div>
        <Slider value={[val]} onValueChange={(v) => setVal(v[0])} min={0} max={180} step={1} />
        <Button onClick={() => { onLog(app, val); toast.success(`Logged ${val} min of ${meta?.name}`); }} className="w-full mt-6 h-12 rounded-xl text-base font-semibold">
          Save
        </Button>
      </div>
    </DrawerContent>
  );
}
