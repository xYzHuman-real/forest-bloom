## TreeRise — Core Slice Plan

A mobile-first PWA where daily screen-time discipline grows a virtual forest. Cloud-backed auth + persistence, premium white/green Apple-style UI, hybrid 3D island with 2D tree sprites.

### Stack & setup
- TanStack Start + Tailwind v4, mobile-first (max-w viewport, safe-area padding).
- Lovable Cloud: email auth (optional Google later), Postgres for user state.
- PWA manifest + icons (installable, no offline SW for MVP).
- `@react-three/fiber` + `@react-three/drei` for the 3D island; trees rendered as billboarded sprite planes.
- `framer-motion` for screen transitions, reward animations, growth-stage pops.
- Mock screen-time data with an editable "Log usage" sheet (browsers can't read OS usage).

### Design system (src/styles.css)
- Bright white background `oklch(0.99 0.005 145)`, soft green primary `oklch(0.72 0.13 150)`, deep forest accent, warm coin gold, leaf-fall amber, dying red.
- Display font: "Fraunces" (serif headings, premium feel); body: "Inter Tight".
- Rounded-3xl cards, soft layered shadows (`0 10px 30px -12px green/15%`), subtle noise/grain.
- Bottom tab bar: floating pill, 4 icons (Home, Forest, Goals, Profile).

### Data model (Cloud)
- `profiles` (id, display_name, avatar_seed, created_at, coins, current_streak, longest_streak)
- `tracked_apps` (user_id, app_key, daily_limit_min) — Instagram, YouTube, Shorts, Facebook, X, Games
- `usage_logs` (user_id, day, app_key, minutes_used)
- `trees` (id, user_id, species, planted_on, state: healthy|weak|dying|dead|reviving, growth_pct, position_x, position_y)
- `unlocked_species` (user_id, species)
- `achievements` (user_id, key, unlocked_on)
- `daily_summary` view → drives growth/death logic
- RLS scoped to `auth.uid()`; standard grants per template.

### Tree lifecycle (server fn `tickDay`)
Inputs: today's usage vs limits.
- All apps ≤ 100% → tree healthy, +growth (stage by age in days: 0–1 Seed, 2–3 Sprout, 4–6 Growing, 7–13 Thriving, 14+ Mature). +50 coins. +100 if usage ≤ 50% all apps.
- Any app 100–125% → state `weak`, leaves falling animation flag.
- Any app 125–175% → `dying`.
- Any app >175% or 2+ apps over → `dead`.
- Streak resets on dead; +500 at 7-day streak, +1000 weekly perfect.
- Revive: 200 coins OR 3 consecutive perfect days.

### Screens
1. **Onboarding** (3 slides + auth): concept, app picker w/ default limits, sign-in. Mock "Grant usage access" step with explainer.
2. **Home**: greeting, today's tree card (species, growth ring, stage illustration), forest-health %, coin pill, usage list with progress bars + dynamic warning copy, quick "+log usage" sheet for the MVP.
3. **Forest** (centerpiece):
   - R3F canvas: low-poly floating island (custom geometry + grass texture), animated water plane, drifting clouds, ambient birds/butterflies that unlock at milestones.
   - Trees placed via deterministic seed positioning; each tree is a textured plane (sprite per species/state) that always faces camera.
   - Touch: pinch-zoom, drag-pan (OrbitControls clamped). Tap tree → bottom sheet with name, age, state, planted date, revive button.
   - Stats header: healthy / dead / age / health %.
   - Floating "Shop" FAB.
4. **Tree Shop**: grid of seeds (Common/Rare/Legendary tabs), price, lock state, purchase confirm. Legendaries show milestone progress, not buy button.
5. **Goals**: app toggles, per-app daily limit sliders, weekly/monthly progress rings (Recharts radial), streak calendar.
6. **Profile**: avatar (DiceBear seed), stats grid, streak ring, achievements grid (locked/unlocked), settings (theme, sign out, reset).
7. **Reward overlay**: full-screen Framer Motion confetti + tree reveal for milestone unlocks.

### Routing (TanStack)
- Public: `/`, `/auth`, `/onboarding`
- Authenticated layout `/_authenticated/`: `home`, `forest`, `forest/shop`, `goals`, `profile`
- Server fns in `src/lib/treerise.functions.ts` (`getDashboard`, `logUsage`, `tickDay`, `purchaseTree`, `reviveTree`, `updateGoals`).

### Out of scope for this build (follow-up)
Weather system, seasons, milestone reward cinematics beyond basic confetti, ecosystem creatures past butterflies/birds toggle, deer/ancient forest visuals, native Capacitor wrap with real Android usage access.

### Deliverable
A polished, installable mobile web app you can use end-to-end with mock usage input; every system (growth, death, coins, shop, achievements, streaks) is wired to Cloud so progress persists across devices.
