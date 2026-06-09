export type Rarity = "common" | "rare" | "legendary";
export interface Species {
  key: string;
  name: string;
  rarity: Rarity;
  price: number | null; // null = milestone unlock
  emoji: string;
  hue: string; // hex for canopy color
  unlockDays?: number; // for legendary
}

export const SPECIES: Species[] = [
  { key: "neem",    name: "Neem",    rarity: "common", price: 0,    emoji: "🌳", hue: "#6fbf73" },
  { key: "mango",   name: "Mango",   rarity: "common", price: 120,  emoji: "🥭", hue: "#7fc97a" },
  { key: "amla",    name: "Amla",    rarity: "common", price: 200,  emoji: "🌿", hue: "#86c98c" },
  { key: "jamun",   name: "Jamun",   rarity: "common", price: 280,  emoji: "🫐", hue: "#5e8a6d" },
  { key: "banyan",  name: "Banyan",  rarity: "common", price: 450,  emoji: "🌳", hue: "#3f7a52" },

  { key: "cherry",  name: "Cherry Blossom", rarity: "rare", price: 700,  emoji: "🌸", hue: "#f4a3c5" },
  { key: "maple",   name: "Japanese Maple", rarity: "rare", price: 900,  emoji: "🍁", hue: "#d96a4a" },
  { key: "bluepine",name: "Blue Pine",      rarity: "rare", price: 1200, emoji: "🌲", hue: "#6aa6c4" },

  { key: "golden",  name: "Golden Tree",  rarity: "legendary", price: null, emoji: "✨", hue: "#e8c34a", unlockDays: 100 },
  { key: "crystal", name: "Crystal Tree", rarity: "legendary", price: null, emoji: "💎", hue: "#9fd9e6", unlockDays: 200 },
  { key: "phoenix", name: "Phoenix Tree", rarity: "legendary", price: null, emoji: "🔥", hue: "#f08157", unlockDays: 365 },
];

export const SPECIES_BY_KEY: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.key, s]));

export const TRACKED_APP_META: Record<string, { name: string; emoji: string; color: string }> = {
  instagram: { name: "Instagram", emoji: "📸", color: "#e1306c" },
  youtube:   { name: "YouTube",   emoji: "▶️", color: "#ff0033" },
  shorts:    { name: "Shorts",    emoji: "⚡", color: "#ff5630" },
  facebook:  { name: "Facebook",  emoji: "👥", color: "#1877f2" },
  x:         { name: "X",         emoji: "✖️", color: "#111111" },
  games:     { name: "Games",     emoji: "🎮", color: "#7c3aed" },
};

export const MILESTONE_GIFTS: Array<{ day: number; species: string; label: string }> = [
  { day: 10,  species: "amla",   label: "Amla Tree" },
  { day: 20,  species: "jamun",  label: "Jamun Tree" },
  { day: 30,  species: "banyan", label: "Banyan Tree" },
  { day: 50,  species: "cherry", label: "Cherry Blossom" },
  { day: 100, species: "golden", label: "Golden Tree" },
  { day: 200, species: "crystal",label: "Crystal Tree" },
  { day: 365, species: "phoenix",label: "Phoenix Tree" },
];

export const ACHIEVEMENT_DEFS: Array<{ key: string; name: string; desc: string; emoji: string }> = [
  { key: "first_tree",   name: "First Tree",      desc: "Plant your first tree",       emoji: "🌱" },
  { key: "trees_10",     name: "Sapling Saver",   desc: "10 healthy trees",            emoji: "🌿" },
  { key: "trees_25",     name: "Grove Keeper",    desc: "25 healthy trees",            emoji: "🌳" },
  { key: "trees_50",     name: "Forest Guardian", desc: "50 healthy trees",            emoji: "🌲" },
  { key: "trees_100",    name: "Centurion",       desc: "100 healthy trees",           emoji: "🏆" },
  { key: "first_bird",   name: "First Bird",      desc: "Birds visit your forest",     emoji: "🐦" },
  { key: "first_butterfly", name: "First Butterfly", desc: "Butterflies arrive",       emoji: "🦋" },
  { key: "first_waterfall", name: "Waterfall",    desc: "Unlock the waterfall",        emoji: "💧" },
  { key: "forest_master",name: "Forest Master",   desc: "200+ healthy trees",          emoji: "👑" },
];
