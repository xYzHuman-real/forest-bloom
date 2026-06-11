import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LogOut, Award, Heart, HelpCircle, Settings, Shield } from "lucide-react";
import { toast } from "sonner";
import { getDashboard } from "@/lib/treerise.functions";
import { ACHIEVEMENT_DEFS } from "@/lib/treerise/species";
import { forestHealthPct } from "@/lib/treerise/logic";
import { levelFor, FOREST_LEVELS } from "@/lib/treerise/levels";
import { CoinPill } from "@/components/CoinPill";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isDebugMode, setDebugMode } from "@/native/debugMode";

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  component: ProfilePage,
});

function ProfilePage() {
  const fetchDash = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const nav = useNavigate();
  const qc = useQueryClient();

  if (!data) return null;
  const earnedKeys = new Set(data.achievements.map((a: any) => a.key));
  const healthy = data.trees.filter((t: any) => t.state === "healthy" || t.state === "reviving").length;
  const dead = data.trees.filter((t: any) => t.state === "dead").length;
  const ageDays = data.trees.length ? Math.max(1, Math.floor((Date.now() - new Date(data.trees[data.trees.length - 1].planted_on).getTime()) / 86400000)) : 0;
  const health = forestHealthPct(data.trees);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const avatarBg = `linear-gradient(135deg, oklch(0.85 0.12 ${(data.profile?.avatar_seed ?? "0").charCodeAt(0) * 7 % 360}), oklch(0.7 0.15 ${(data.profile?.avatar_seed ?? "0").charCodeAt(1) * 11 % 360}))`;

  return (
    <div className="min-h-screen pb-32 safe-top px-5 pt-6">
      <div className="flex items-center gap-4">
        <div className="size-20 rounded-3xl grid place-items-center font-display text-2xl text-white shadow-md" style={{ background: avatarBg }}>
          {(data.profile?.display_name ?? "T")[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-display text-2xl leading-tight">{data.profile?.display_name ?? "Friend"}</div>
          <div className="text-xs text-muted-foreground mt-1">Forest age · {ageDays} days</div>
          <div className="mt-2"><CoinPill amount={data.profile?.coins ?? 0} /></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-6">
        <Stat label="Healthy" value={healthy} />
        <Stat label="Dead" value={dead} />
        <Stat label="Streak" value={`${data.profile?.current_streak ?? 0}`} />
        <Stat label="Health" value={`${health}%`} />
      </div>

      <Section title="Forest" icon={Award}>
        <ForestStats trees={data.trees} profile={data.profile} />
      </Section>

      <Section title="Achievements" icon={Award}>
        <div className="grid grid-cols-3 gap-2.5">
          {ACHIEVEMENT_DEFS.map((a) => {
            const unlocked = earnedKeys.has(a.key);
            return (
              <div key={a.key} className={`soft-card p-3 text-center ${unlocked ? "" : "opacity-40 grayscale"}`}>
                <div className="text-3xl">{a.emoji}</div>
                <div className="text-[11px] font-semibold mt-1.5 leading-tight">{a.name}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{a.desc}</div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Impact" icon={Heart}>
        <div className="soft-card p-4 text-sm">
          <p>You've grown <strong>{healthy} healthy trees</strong> by reclaiming your attention. That's roughly <strong>{healthy * 40} minutes</strong> of focus reinvested in your life.</p>
        </div>
      </Section>

      <Section title="Settings" icon={Settings}>
        <div className="soft-card divide-y divide-border">
          <Link to="/permissions" className="block">
            <Row label="Permissions &amp; tracking" onClick={() => {}} icon={Shield} />
          </Link>
          <Row label="Sign out" onClick={signOut} icon={LogOut} />
        </div>
      </Section>

      <Section title="Help" icon={HelpCircle}>
        <div className="soft-card p-4 text-sm text-muted-foreground">
          TreeRise reads only app names and minutes — never your content. You can revoke Usage Access in Android settings at any time.
        </div>
      </Section>

      <VersionFooter />
    </div>
  );
}

function VersionFooter() {
  const [taps, setTaps] = useState(0);
  const [debug, setDebug] = useState(isDebugMode());
  const onTap = () => {
    const n = taps + 1;
    setTaps(n);
    if (n >= 5) {
      const next = !debug;
      setDebugMode(next);
      setDebug(next);
      setTaps(0);
      toast.message(next ? "Debug mode on — manual Log enabled" : "Debug mode off");
    }
  };
  return (
    <p
      onClick={onTap}
      className="text-center text-[10px] text-muted-foreground mt-8 select-none"
    >
      TreeRise · v0.1 · grow gently {debug ? "· debug" : ""}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="soft-card p-2.5 text-center">
      <div className="font-display text-lg leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="font-display text-lg mb-3 flex items-center gap-2"><Icon className="size-4 text-primary" />{title}</h2>
      {children}
    </div>
  );
}
function Row({ label, icon: Icon, onClick }: { label: string; icon: any; onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} className="w-full justify-between rounded-none px-4 py-4 h-auto font-normal">
      <span className="flex items-center gap-3"><Icon className="size-4" />{label}</span>
      <span className="text-muted-foreground">›</span>
    </Button>
  );
}
