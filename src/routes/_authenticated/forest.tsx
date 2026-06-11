import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Store, Trees as TreesIcon, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getDashboard, reviveTree, startRevivalMission, claimChest } from "@/lib/treerise.functions";
import { forestHealthPct } from "@/lib/treerise/logic";
import { SPECIES_BY_KEY } from "@/lib/treerise/species";
import { levelFor, nextLevel, EVOLUTION, ISLAND_CAPACITY } from "@/lib/treerise/levels";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { TreeIcon } from "@/components/TreeIcon";
import { CoinPill } from "@/components/CoinPill";
import { RewardChest } from "@/components/RewardChest";

const ForestScene = lazy(() => import("@/components/ForestScene").then((m) => ({ default: m.ForestScene })));

export const Route = createFileRoute("/_authenticated/forest")({
  ssr: false,
  component: ForestPage,
});

function ForestPage() {
  const fetchDash = useServerFn(getDashboard);
  const revive = useServerFn(reviveTree);
  const startMission = useServerFn(startRevivalMission);
  const claim = useServerFn(claimChest);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const [selected, setSelected] = useState<any | null>(null);
  const [islandIdx, setIslandIdx] = useState(0);

  const reviveMut = useMutation({
    mutationFn: (id: string) => revive({ data: { tree_id: id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("New life flows through your tree 🌱"); setSelected(null); },
    onError: (e: any) => toast.error(e.message ?? "Could not revive"),
  });
  const missionMut = useMutation({
    mutationFn: (id: string) => startMission({ data: { tree_id: id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Revival mission started — 3 healthy days to bring it back"); setSelected(null); },
    onError: (e: any) => toast.error(e.message ?? "Could not start mission"),
  });
  const claimMut = useMutation({
    mutationFn: (day: string) => claim({ data: { day } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });

  const trees = data?.trees ?? [];
  const islands = useMemo(() => {
    const list = (data?.islands ?? []) as Array<{ index: number; name: string }>;
    if (list.length === 0) return [{ index: 0, name: "Seedling Island" }];
    return list;
  }, [data?.islands]);
  const safeIdx = Math.min(islandIdx, islands.length - 1);
  const island = islands[safeIdx];
  const islandTrees = useMemo(() => trees.filter((t: any) => (t.island_index ?? 0) === island.index), [trees, island.index]);
  const allHealthy = trees.filter((t: any) => t.state === "healthy" || t.state === "reviving").length;
  const dead = trees.filter((t: any) => t.state === "dead").length;
  const oldest = trees.length ? trees[trees.length - 1] : null;
  const ageDays = oldest ? Math.max(1, Math.floor((Date.now() - new Date(oldest.planted_on).getTime()) / 86400000)) : 0;
  const health = forestHealthPct(trees);
  const level = levelFor(allHealthy);
  const nl = nextLevel(allHealthy);
  const activeMissions = new Set((data?.activeRevivalMissions ?? []).map((m: any) => m.tree_id));

  if (!data) {
    return <div className="min-h-screen grid place-items-center"><div className="size-12 rounded-full bg-primary/20 animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen pb-28 relative">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 safe-top px-4 pt-3">
        <div className="flex items-center justify-between">
          <CoinPill amount={data.profile?.coins ?? 0} />
          <div className="flex gap-2">
            <Link to="/forest/calendar" className="pill bg-card"><CalendarIcon className="size-3.5" /> Calendar</Link>
            <Link to="/forest/shop" className="pill bg-primary text-primary-foreground"><Store className="size-3.5" /> Shop</Link>
          </div>
        </div>

        {/* Forest level card */}
        <div className="mt-3 soft-card px-3 py-2 bg-card/90 backdrop-blur flex items-center gap-3">
          <div className="size-10 rounded-2xl grid place-items-center bg-primary/15 font-display text-primary">L{level.level}</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm truncate">{level.name}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {nl ? `${nl.minHealthy - allHealthy} healthy to ${nl.name}` : "Maximum level — keep tending"}
            </div>
          </div>
          <Sparkles className="size-4 text-amber-500" />
        </div>

        {/* Pending chest */}
        {data.pendingChest && (
          <div className="mt-2">
            <RewardChest day={(data.pendingChest as any).day} claiming={claimMut.isPending} onClaim={async () => await claimMut.mutateAsync((data.pendingChest as any).day)} />
          </div>
        )}

        <div className="mt-3 grid grid-cols-4 gap-2">
          <MiniStat label="Healthy" value={allHealthy} />
          <MiniStat label="Dead" value={dead} />
          <MiniStat label="Age" value={`${ageDays}d`} />
          <MiniStat label="Health" value={`${health}%`} />
        </div>

        {/* Island swiper */}
        {islands.length > 1 && (
          <div className="mt-3 flex items-center justify-between soft-card bg-card/90 px-2 py-1.5">
            <button onClick={() => setIslandIdx(Math.max(0, safeIdx - 1))} disabled={safeIdx === 0} className="size-8 grid place-items-center disabled:opacity-30"><ChevronLeft className="size-4" /></button>
            <div className="text-xs font-display">{island.name} · {islandTrees.length}/{ISLAND_CAPACITY}</div>
            <button onClick={() => setIslandIdx(Math.min(islands.length - 1, safeIdx + 1))} disabled={safeIdx === islands.length - 1} className="size-8 grid place-items-center disabled:opacity-30"><ChevronRight className="size-4" /></button>
          </div>
        )}

        {/* Evolution unlocked badges */}
        <div className="mt-2 flex flex-wrap gap-1">
          {EVOLUTION.map((e) => {
            const unlocked = allHealthy >= e.threshold;
            return (
              <span key={e.kind} className={`pill text-[10px] ${unlocked ? "bg-emerald-50 text-emerald-700" : "bg-muted/60 text-muted-foreground opacity-60"}`}>
                {e.emoji} {unlocked ? e.label : `${e.threshold}`}
              </span>
            );
          })}
        </div>
      </div>

      {/* 3D Forest Canvas */}
      <div className="h-[calc(100vh-0px)] w-full">
        <Suspense fallback={<div className="h-full grid place-items-center"><TreesIcon className="size-10 text-primary animate-pulse" /></div>}>
          <ForestScene trees={islandTrees} onTreeSelect={setSelected} />
        </Suspense>
      </div>

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <div className="mx-auto max-w-[480px] w-full px-5 pb-8">
              <DrawerHeader className="px-0">
                <DrawerTitle className="font-display text-2xl">{SPECIES_BY_KEY[selected.species]?.name ?? selected.species}</DrawerTitle>
              </DrawerHeader>
              <div className="flex items-center gap-4">
                <TreeIcon species={selected.species} state={selected.state} size={110} />
                <div className="flex-1 space-y-1.5 text-sm">
                  <Row label="State" value={<span className="capitalize">{selected.state}</span>} />
                  <Row label="Planted" value={new Date(selected.planted_on).toLocaleDateString()} />
                  <Row label="Growth" value={`${selected.growth_pct}%`} />
                  <Row label="Age" value={`${Math.max(0, Math.floor((Date.now() - new Date(selected.planted_on).getTime()) / 86400000))} days`} />
                </div>
              </div>
              {selected.state === "dead" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2">
                  <Button disabled={reviveMut.isPending} onClick={() => reviveMut.mutate(selected.id)} className="w-full h-12 rounded-xl">
                    Revive for 200 coins
                  </Button>
                  {activeMissions.has(selected.id) ? (
                    <div className="soft-card p-3 text-center text-sm bg-emerald-50">
                      🌱 Revival mission in progress — stay healthy for 3 days
                    </div>
                  ) : (
                    <Button variant="outline" disabled={missionMut.isPending} onClick={() => missionMut.mutate(selected.id)} className="w-full h-12 rounded-xl">
                      Start free revival mission (3 healthy days)
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground text-center mt-1">Or stay perfect for 3 days in a row to revive for free.</p>
                </motion.div>
              )}
              <Link to="/forest/day/$day" params={{ day: selected.planted_on }} className="block mt-4 text-center pill bg-card mx-auto w-fit">
                View this day's story →
              </Link>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="soft-card px-2 py-1.5 text-center bg-card/90 backdrop-blur">
      <div className="font-display text-base leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
