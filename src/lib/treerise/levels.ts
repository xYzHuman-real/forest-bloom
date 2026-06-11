export interface ForestLevel {
  level: number;
  name: string;
  minHealthy: number;
  blurb: string;
}

export const FOREST_LEVELS: ForestLevel[] = [
  { level: 1, name: "Seedling Island",   minHealthy: 0,   blurb: "Your forest begins." },
  { level: 2, name: "Young Forest",      minHealthy: 25,  blurb: "Roots taking hold." },
  { level: 3, name: "Growing Ecosystem", minHealthy: 75,  blurb: "Life finds your island." },
  { level: 4, name: "Nature Reserve",    minHealthy: 200, blurb: "A sanctuary thriving." },
  { level: 5, name: "Ancient Forest",    minHealthy: 500, blurb: "An old, sacred grove." },
];

export function levelFor(healthy: number): ForestLevel {
  let chosen = FOREST_LEVELS[0];
  for (const l of FOREST_LEVELS) if (healthy >= l.minHealthy) chosen = l;
  return chosen;
}

export function nextLevel(healthy: number): ForestLevel | null {
  return FOREST_LEVELS.find((l) => l.minHealthy > healthy) ?? null;
}

export interface EvolutionUnlock { kind: "birds" | "butterflies" | "pond" | "waterfall" | "deer" | "ancient"; threshold: number; emoji: string; label: string; }

export const EVOLUTION: EvolutionUnlock[] = [
  { kind: "birds",       threshold: 10,  emoji: "🐦", label: "Birds" },
  { kind: "butterflies", threshold: 20,  emoji: "🦋", label: "Butterflies" },
  { kind: "pond",        threshold: 50,  emoji: "💧", label: "Pond" },
  { kind: "waterfall",   threshold: 100, emoji: "🌊", label: "Waterfall" },
  { kind: "deer",        threshold: 200, emoji: "🦌", label: "Deer" },
  { kind: "ancient",     threshold: 500, emoji: "🌲", label: "Ancient grove" },
];

export const ISLAND_CAPACITY = 30;
