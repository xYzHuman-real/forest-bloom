import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Store, Trees as TreesIcon } from "lucide-react";
import { toast } from "sonner";
import { getDashboard, reviveTree } from "@/lib/treerise.functions";
import { forestHealthPct } from "@/lib/treerise/logic";
import { SPECIES_BY_KEY } from "@/lib/treerise/species";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { TreeIcon } from "@/components/TreeIcon";
import { CoinPill } from "@/components/CoinPill";

const ForestScene = lazy(() => import("@/components/ForestScene").then((m) => ({ default: m.ForestScene })));

export const Route = createFileRoute("/_authenticated/forest")({
  ssr: false,
  component: ForestPage,
});

function ForestPage() {
  const fetchDash = useServerFn(getDashboard);
  const revive = useServerFn(reviveTree);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const [selected, setSelected] = useState<any | null>(null);

  const reviveMut = useMutation({
    mutationFn: (id: string) => revive({ data: { tree_id: id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("New life flows through your tree 🌱"); setSelected(null); },
    onError: (e: any) => toast.error(e.message ?? "Could not revive"),
  });

  if (!data) {
    return <div className="min-h-screen grid place-items-center"><div className="size-12 rounded-full bg-primary/20 animate-pulse" /></div>;
  }

  const trees = data.trees;
  const healthy = trees.filter((t: any) => t.state === "healthy" || t.state === "reviving").length;
  const dead = trees.filter((t: any) => t.state === "dead").length;
  const oldest = trees.length ? trees[trees.length - 1] : null;
  const ageDays = oldest ? Math.max(1, Math.floor((Date.now() - new Date(oldest.planted_on).getTime()) / 86400000)) : 0;
  const health = forestHealthPct(trees);

  return (
    <div className="min-h-screen pb-28 relative">
      {/* Stats header floating */}
      <div className="absolute top-0 inset-x-0 z-20 safe-top px-4 pt-3">
        <div className="flex items-center justify-between">
          <CoinPill amount={data.profile?.coins ?? 0} />
          <Link to="/forest/shop" className="pill bg-primary text-primary-foreground"><Store className="size-3.5" /> Tree Shop</Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <MiniStat label="Healthy" value={healthy} />
          <MiniStat label="Dead" value={dead} />
          <MiniStat label="Age" value={`${ageDays}d`} />
          <MiniStat label="Health" value={`${health}%`} />
        </div>
      </div>

      {/* 3D Forest Canvas */}
      <div className="h-[calc(100vh-0px)] w-full">
        <Suspense fallback={<div className="h-full grid place-items-center"><TreesIcon className="size-10 text-primary animate-pulse" /></div>}>
          <ForestScene trees={trees} onTreeSelect={setSelected} />
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <Button disabled={reviveMut.isPending} onClick={() => reviveMut.mutate(selected.id)} className="w-full h-12 rounded-xl">
                    Revive for 200 coins
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">Or stay perfect for 3 days in a row to revive for free.</p>
                </motion.div>
              )}
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
