import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ChevronLeft, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { getDashboard, purchaseSpecies } from "@/lib/treerise.functions";
import { SPECIES, MILESTONE_GIFTS, type Rarity } from "@/lib/treerise/species";
import { TreeIcon } from "@/components/TreeIcon";
import { CoinPill } from "@/components/CoinPill";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/forest/shop")({
  ssr: false,
  component: Shop,
});

function Shop() {
  const nav = useNavigate();
  const fetchDash = useServerFn(getDashboard);
  const buy = useServerFn(purchaseSpecies);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const [tab, setTab] = useState<Rarity>("common");

  const purchaseMut = useMutation({
    mutationFn: (key: string) => buy({ data: { species: key } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("New seed unlocked 🌱"); },
    onError: (e: any) => toast.error(e.message ?? "Purchase failed"),
  });

  if (!data) return null;
  const unlocked = new Set(data.unlockedSpecies);
  const totalDays = data.trees.length;

  return (
    <div className="min-h-screen pb-28 safe-top px-5 pt-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => nav({ to: "/forest" })}><ChevronLeft className="size-5" /></Button>
        <h1 className="font-display text-xl">Tree Shop</h1>
        <CoinPill amount={data.profile?.coins ?? 0} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Rarity)} className="mt-2">
        <TabsList className="w-full grid grid-cols-3 h-11 rounded-2xl">
          <TabsTrigger value="common" className="rounded-xl">Common</TabsTrigger>
          <TabsTrigger value="rare" className="rounded-xl">Rare</TabsTrigger>
          <TabsTrigger value="legendary" className="rounded-xl">Legendary</TabsTrigger>
        </TabsList>

        {(["common", "rare", "legendary"] as Rarity[]).map((r) => (
          <TabsContent value={r} key={r} className="mt-5">
            <div className="grid grid-cols-2 gap-3">
              {SPECIES.filter((s) => s.rarity === r).map((s) => {
                const owned = unlocked.has(s.key);
                const milestoneDay = MILESTONE_GIFTS.find((m) => m.species === s.key)?.day;
                const canBuy = !owned && s.price != null && (data.profile?.coins ?? 0) >= s.price;
                return (
                  <motion.div key={s.key} whileTap={{ scale: 0.97 }} className="soft-card p-3 relative overflow-hidden"
                    style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${s.hue} 14%, white), white)` }}>
                    <div className="grid place-items-center"><TreeIcon species={s.key} state="healthy" size={90} /></div>
                    <div className="mt-2 text-center">
                      <div className="font-display text-base">{s.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.rarity}</div>
                    </div>
                    {owned ? (
                      <div className="mt-2 pill mx-auto bg-primary/15 text-primary justify-center w-full"><Check className="size-3.5" /> Owned</div>
                    ) : s.price != null ? (
                      <Button disabled={!canBuy || purchaseMut.isPending} onClick={() => purchaseMut.mutate(s.key)} className="mt-2 w-full h-9 rounded-full text-xs">
                        Unlock · {s.price}
                      </Button>
                    ) : (
                      <div className="mt-2 pill mx-auto bg-muted text-muted-foreground justify-center w-full">
                        <Lock className="size-3.5" /> Day {milestoneDay} · {Math.min(totalDays, milestoneDay ?? 0)}/{milestoneDay}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
