import { createFileRoute, Link } from "@tanstack/react-router";
import { Sprout, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/limited")({
  ssr: false,
  component: LimitedMode,
});

function LimitedMode() {
  return (
    <div className="min-h-screen px-6 pt-16 pb-10 safe-top safe-bottom flex flex-col">
      <div className="size-24 rounded-3xl bg-accent grid place-items-center mb-8">
        <Sprout className="size-12 text-primary" strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-3xl leading-tight">
        Your forest will still grow — just a bit slower
      </h1>
      <p className="mt-4 text-muted-foreground text-base">
        Without Usage Access, TreeRise can't read your app time automatically.
        You can still plant a tree every day and log usage by hand. Whenever
        you're ready, turn on Usage Access in Settings to switch to automatic
        tracking.
      </p>

      <div className="mt-8 space-y-3">
        <Button asChild className="w-full h-12 rounded-xl text-base font-semibold">
          <Link to="/home">Continue in limited mode</Link>
        </Button>
        <Button asChild variant="outline" className="w-full h-12 rounded-xl">
          <Link to="/permissions">
            <Settings className="size-4" /> Try permissions again
          </Link>
        </Button>
      </div>
    </div>
  );
}
