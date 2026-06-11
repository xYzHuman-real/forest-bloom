import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft } from "lucide-react";
import { getDayDetail } from "@/lib/treerise.functions";
import { SPECIES_BY_KEY, TRACKED_APP_META } from "@/lib/treerise/species";
import { TreeIcon } from "@/components/TreeIcon";

export const Route = createFileRoute("/_authenticated/forest/day/$day")({
  ssr: false,
  component: DayDetailPage,
});

const STATE_LABEL: Record<string, { label: string; emoji: string; tone: string }> = {
  healthy: { label: "Healthy day", emoji: "🌳", tone: "text-emerald-600" },
  reviving: { label: "Revived", emoji: "🌱", tone: "text-emerald-600" },
  weak: { label: "Weak day", emoji: "🍂", tone: "text-amber-600" },
  dying: { label: "Dying day", emoji: "🥀", tone: "text-orange-600" },
  dead: { label: "Dead day", emoji: "🪵", tone: "text-rose-600" },
  none: { label: "No data", emoji: "·", tone: "text-muted-foreground" },
};

function DayDetailPage() {
  const { day } = Route.useParams();
  const fetchDay = useServerFn(getDayDetail);
  const { data } = useQuery({ queryKey: ["day", day], queryFn: () => fetchDay({ data: { day } }) });

  const summary = data?.summary;
  const state = summary?.state ?? "none";
  const meta = STATE_LABEL[state] ?? STATE_LABEL.none;
  const species = data?.tree?.species ?? summary?.species ?? "neem";
  const speciesMeta = SPECIES_BY_KEY[species];
  const dateStr = new Date(day + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen pb-32 safe-top px-5 pt-4">
      <Link to="/forest/calendar" className="pill bg-card"><ChevronLeft className="size-3.5" /> Calendar</Link>

      <div className="mt-5 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{dateStr}</div>
        <div className={`font-display text-3xl mt-2 ${meta.tone}`}>{meta.emoji} {meta.label}</div>
      </div>

      <div className="soft-card mt-6 p-6 flex flex-col items-center bg-card">
        <TreeIcon species={species} state={state as any} size={140} />
        <div className="font-display text-xl mt-3">{speciesMeta?.name ?? species}</div>
        <div className="text-xs text-muted-foreground">{state === "none" ? "No tree this day" : `Planted ${data?.tree?.planted_on ?? day}`}</div>
      </div>

      <div className="mt-5 space-y-2">
        <h2 className="font-display text-lg mb-2">App usage</h2>
        {(data?.usage ?? []).length === 0 && (
          <div className="soft-card p-4 text-sm text-muted-foreground">No usage was logged.</div>
        )}
        {(data?.usage ?? []).map((u: any) => {
          const m = TRACKED_APP_META[u.app_key];
          return (
            <div key={u.app_key} className="soft-card p-3 flex items-center gap-3">
              <div className="text-2xl">{m?.emoji ?? "📱"}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{m?.name ?? u.app_key}</div>
                <div className="text-xs text-muted-foreground">{u.minutes_used} minutes</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 soft-card p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Coins earned</span>
        <span className="font-display text-xl">🪙 {summary?.coins_earned ?? 0}</span>
      </div>
    </div>
  );
}
