import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DaySummary { day: string; state: string; species?: string | null; coins_earned?: number }

const STATE_EMOJI: Record<string, string> = {
  healthy: "🌳", reviving: "🌱", weak: "🍂", dying: "🥀", dead: "🪵", none: "",
};

export function CalendarMonth({
  year, month, days, onPrev, onNext,
}: {
  year: number; month: number; days: DaySummary[];
  onPrev: () => void; onNext: () => void;
}) {
  const map = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);
  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ key: string; date?: string; n?: number }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: `b${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key: ds, date: ds, n: d });
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="soft-card p-4 bg-card/90 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="size-9 rounded-full grid place-items-center hover:bg-muted"><ChevronLeft className="size-5" /></button>
        <div className="font-display text-lg">{monthName} {year}</div>
        <button onClick={onNext} className="size-9 rounded-full grid place-items-center hover:bg-muted"><ChevronRight className="size-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          if (!c.date) return <div key={c.key} className="aspect-square" />;
          const s = map.get(c.date);
          const emoji = s ? STATE_EMOJI[s.state] ?? "" : "";
          const isToday = c.date === today;
          const content = (
            <div className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-base
              ${isToday ? "border-primary bg-primary/5" : "border-border bg-background/60"}
              ${emoji ? "" : "opacity-60"}`}>
              <div className="text-[10px] text-muted-foreground leading-none">{c.n}</div>
              <div className="text-lg leading-none">{emoji || "·"}</div>
            </div>
          );
          return s ? (
            <Link key={c.key} to="/forest/day/$day" params={{ day: c.date }}>{content}</Link>
          ) : <div key={c.key}>{content}</div>;
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <Legend e="🌳" l="Healthy" /><Legend e="🍂" l="Weak" /><Legend e="🥀" l="Dying" /><Legend e="🪵" l="Dead" />
      </div>
    </div>
  );
}

function Legend({ e, l }: { e: string; l: string }) {
  return <span className="inline-flex items-center gap-1"><span>{e}</span>{l}</span>;
}
