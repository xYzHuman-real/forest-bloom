import { Link, useLocation } from "@tanstack/react-router";
import { Home, Trees, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home" as const,    label: "Home",   icon: Home },
  { to: "/forest" as const,  label: "Forest", icon: Trees },
  { to: "/goals" as const,   label: "Goals",  icon: Target },
  { to: "/profile" as const, label: "Profile",icon: User },
];

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none safe-bottom">
      <div className="mx-auto max-w-[480px] px-4 pb-2">
        <div className="pointer-events-auto soft-card flex items-center justify-around px-2 py-2 backdrop-blur bg-card/95">
          {items.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-2xl px-4 py-1.5 transition-all",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                <span className={cn("text-[10px] font-semibold tracking-wide", active && "text-primary-foreground")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
