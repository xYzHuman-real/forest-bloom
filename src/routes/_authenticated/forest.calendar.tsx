import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Trees } from "lucide-react";
import { getCalendar } from "@/lib/treerise.functions";
import { CalendarMonth } from "@/components/CalendarMonth";

export const Route = createFileRoute("/_authenticated/forest/calendar")({
  ssr: false,
  component: CalendarPage,
});

function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const fetchCal = useServerFn(getCalendar);
  const { data } = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: () => fetchCal({ data: { year, month } }),
  });

  const prev = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); };
  const next = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); };

  return (
    <div className="min-h-screen pb-32 safe-top px-4 pt-3">
      <div className="flex items-center justify-between mb-4">
        <Link to="/forest" className="pill bg-card"><ChevronLeft className="size-3.5" /> Back</Link>
        <Link to="/forest" className="pill bg-primary text-primary-foreground"><Trees className="size-3.5" /> Forest</Link>
      </div>
      <h1 className="font-display text-2xl mb-4">Your forest journey</h1>
      <CalendarMonth
        year={year} month={month}
        days={data?.days ?? []}
        onPrev={prev} onNext={next}
      />
      <div className="mt-4 flex items-center justify-between">
        <select
          className="soft-card px-3 py-2 text-sm bg-card"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }} className="pill bg-card">Today</button>
      </div>
    </div>
  );
}
