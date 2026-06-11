# TreeRise V2 Build Plan

Keeps all V1 features intact. Adds long-term retention + progression on top.

## 1. Database changes (one migration)

New + altered tables:

- `trees`: add `island_index int default 0`, `revived_at timestamptz`, `died_on date`.
- `daily_summaries` (new) — one row per user per day, the source of truth for the calendar:
  - `user_id, day date, state ('healthy'|'weak'|'dying'|'dead'|'none'), tree_id uuid null, species text null, coins_earned int, usage_json jsonb` (per-app minutes snapshot).
  - Filled when `logUsage` runs / at end of day; back-filled lazily when calendar is opened.
- `daily_chests` (new) — `user_id, day date, opened bool, reward_kind, reward_payload jsonb`. One chest per successful day, claimable for 48h.
- `islands` (new) — `user_id, index int, level int, unlocked_on date, name text`.
- `profiles`: add `forest_started_on date`, `total_healthy int`, `total_dead int` (denormalized counters, updated by trigger on trees).

All with RLS scoped to `auth.uid()` and the standard GRANTs.

## 2. Server functions (`src/lib/treerise.functions.ts`)

- `getCalendar({ year, month })` — returns 42 day cells with state + summary.
- `getDayDetail({ day })` — full breakdown for one date.
- `getIslands()` — list + current island; auto-creates next island when current is full (cap 30 trees/island).
- `getForestStats()` — age, healthy/dead totals, success %, level.
- `claimChest({ day })` — atomic claim, grants coins/seed/decoration.
- `startRevivalMission({ tree_id })` / `progressRevivalMission()` — tracks 3-day streak; on success flips tree to `reviving` for free.
- Extend `logUsage` to write `daily_summaries` and create a chest when day is healthy.

## 3. Frontend routes

- `/_authenticated/forest` — add top toggle `🌳 Forest | 📅 Calendar`. Forest view unchanged + horizontal island swiper (Embla).
- `/_authenticated/forest/calendar` — month grid, prev/next month, year picker. Each cell renders a small emoji/icon for state.
- `/_authenticated/forest/day/$day` — Day Details screen with tree illustration, usage bars, coins, status.
- `/_authenticated/profile` — append Forest Age, totals, success %, level card.
- New components: `CalendarMonth`, `DayCell`, `IslandSwiper`, `LevelBadge`, `EvolutionLayer` (renders birds/butterflies/pond/waterfall/deer based on healthy count — extends existing `ForestScene`), `RewardChest` (framer-motion open animation), `RevivalMissionCard`.

## 4. Forest levels + evolution

Pure derived state from `total_healthy`:
- Levels: 0/25/75/200/500 healthy → Seedling / Young / Growing / Reserve / Ancient.
- Evolution thresholds (10/20/50/100/200/500) wired into `ForestScene` — birds and butterflies already exist; add pond upgrade, waterfall mesh, deer billboard, denser tree backdrop for Ancient.

## 5. Multi-island

- New trees default to current island (last with <30 trees). When full, auto-insert next island row. UI shows dots + swipe between islands; each island is its own `<ForestScene trees={...} level={...} />`.

## 6. Daily chest + revival missions

- After a healthy day, show `RewardChest` on Home with tap-to-open animation (spring scale + confetti via framer-motion only, no extra deps).
- Revival mission: from tree drawer on a dead tree, "Start revival mission" → tracked via 3 consecutive successful daily_summaries; auto-completes and animates tree → reviving.

## 7. Notifications

Extend `src/native/notifications.ts` with a new supportive template:
`"🍂 Your {species} Tree is losing leaves."` — fired by the existing native sync when any tracked app crosses 85% of its limit.

## 8. Out of scope (explicit)

No chatbot, feed, posts, reels, marketplace. No changes to auth, onboarding, or APK pipeline.

## Order of execution

1. Migration (single call, awaits approval).
2. After approval: server fns + frontend components + routes in parallel batches.
3. Wire evolution thresholds into `ForestScene`.
4. Smoke-test in preview, then ready for next APK build.

Estimated ~15 new files + edits to 6 existing. No new npm deps.
