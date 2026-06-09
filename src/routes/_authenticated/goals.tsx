import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { getDashboard, updateGoals } from "@/lib/treerise.functions";
import { TRACKED_APP_META } from "@/lib/treerise/species";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/goals")({
  ssr: false,
  component: GoalsPage,
});

interface AppRow { app_key: string; enabled: boolean; daily_limit_min: number }

function GoalsPage() {
  const fetchDash = useServerFn(getDashboard);
  const save = useServerFn(updateGoals);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const [rows, setRows] = useState<AppRow[]>([]);

  useEffect(() => { if (data) setRows(data.apps.map((a: any) => ({ app_key: a.app_key, enabled: a.enabled, daily_limit_min: a.daily_limit_min }))); }, [data]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { apps: rows } }),
    onSuccess: () => { toast.success("Goals updated"); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });

  const weekTotal = rows.filter((r) => r.enabled).reduce((s, r) => s + r.daily_limit_min, 0) * 7;

  return (
    <div className="min-h-screen pb-32 safe-top px-5 pt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="size-11 rounded-2xl bg-accent grid place-items-center"><Target className="size-5 text-primary" /></div>
        <div>
          <h1 className="font-display text-2xl leading-none">Your goals</h1>
          <p className="text-xs text-muted-foreground mt-1">Set a daily limit for each distracting app.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Daily cap" value={`${rows.filter((r) => r.enabled).reduce((s, r) => s + r.daily_limit_min, 0)}m`} />
        <Stat label="Weekly" value={`${Math.round(weekTotal / 60)}h`} />
        <Stat label="Streak" value={`${data?.profile?.current_streak ?? 0}d`} />
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => {
          const meta = TRACKED_APP_META[r.app_key];
          return (
            <div key={r.app_key} className="soft-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl grid place-items-center text-lg" style={{ background: `${meta.color}1a` }}>{meta.emoji}</div>
                  <div>
                    <div className="font-semibold">{meta.name}</div>
                    <div className="text-xs text-muted-foreground">{r.daily_limit_min} min / day</div>
                  </div>
                </div>
                <Switch checked={r.enabled} onCheckedChange={(v) => { const c = [...rows]; c[i] = { ...c[i], enabled: v }; setRows(c); }} />
              </div>
              <div className="mt-3">
                <Slider disabled={!r.enabled} value={[r.daily_limit_min]} min={5} max={180} step={5}
                  onValueChange={(v) => { const c = [...rows]; c[i] = { ...c[i], daily_limit_min: v[0] }; setRows(c); }} />
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="w-full h-12 rounded-xl mt-6 text-base font-semibold">
        {saveMut.isPending ? "Saving..." : "Save goals"}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-card p-3 text-center">
      <div className="font-display text-xl">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
