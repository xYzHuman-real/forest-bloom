import { cn } from "@/lib/utils";
import { SPECIES_BY_KEY } from "@/lib/treerise/species";
import type { TreeState } from "@/lib/treerise/logic";

interface TreeIconProps {
  species: string;
  state: TreeState;
  size?: number;
  className?: string;
}

// SVG tree drawn from canopy + trunk, colored by species hue and state
export function TreeIcon({ species, state, size = 120, className }: TreeIconProps) {
  const meta = SPECIES_BY_KEY[species] ?? SPECIES_BY_KEY["neem"];
  const dead = state === "dead";
  const dying = state === "dying";
  const weak = state === "weak";
  const canopy = dead ? "#7a6a55" : meta.hue;
  const canopy2 = dead ? "#5e503f" : shade(meta.hue, -0.18);
  const trunk = dead ? "#3e2f23" : "#6b4a2b";
  const opacity = dead ? 0.7 : dying ? 0.85 : 1;

  return (
    <svg viewBox="0 0 200 240" width={size} height={size} className={cn(className)} style={{ opacity }}>
      <defs>
        <radialGradient id={`g-${species}-${state}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={shade(canopy, 0.15)} />
          <stop offset="100%" stopColor={canopy2} />
        </radialGradient>
        <linearGradient id={`t-${species}-${state}`} x1="0" x2="1">
          <stop offset="0%" stopColor={shade(trunk, 0.1)} />
          <stop offset="100%" stopColor={shade(trunk, -0.15)} />
        </linearGradient>
      </defs>
      {/* ground shadow */}
      <ellipse cx="100" cy="220" rx="55" ry="8" fill="#000" opacity="0.08" />
      {/* trunk */}
      <path d="M88 220 Q92 170 96 130 L104 130 Q108 170 112 220 Z" fill={`url(#t-${species}-${state})`} />
      {dead ? (
        <>
          {/* bare branches */}
          <path d="M100 130 L70 80" stroke={trunk} strokeWidth="6" strokeLinecap="round" />
          <path d="M100 130 L130 75" stroke={trunk} strokeWidth="6" strokeLinecap="round" />
          <path d="M100 105 L85 70" stroke={trunk} strokeWidth="5" strokeLinecap="round" />
          <path d="M100 105 L118 65" stroke={trunk} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* canopy blobs */}
          <circle cx="100" cy="90" r="60" fill={`url(#g-${species}-${state})`} />
          <circle cx="65"  cy="115" r="35" fill={`url(#g-${species}-${state})`} />
          <circle cx="135" cy="115" r="35" fill={`url(#g-${species}-${state})`} />
          {/* highlights */}
          <circle cx="80" cy="65" r="14" fill="#fff" opacity="0.18" />
        </>
      )}
      {weak && (
        <>
          {/* falling leaves */}
          <circle cx="55" cy="170" r="4" fill={canopy} opacity="0.7" />
          <circle cx="148" cy="180" r="3.5" fill={canopy} opacity="0.7" />
          <circle cx="75" cy="200" r="3" fill={canopy} opacity="0.6" />
        </>
      )}
    </svg>
  );
}

function shade(hex: string, pct: number) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (pct > 0 ? 255 - v : v) * pct)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
