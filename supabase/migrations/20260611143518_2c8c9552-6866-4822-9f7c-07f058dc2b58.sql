
-- 1. Extend trees
ALTER TABLE public.trees
  ADD COLUMN IF NOT EXISTS island_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revived_at timestamptz,
  ADD COLUMN IF NOT EXISTS died_on date;

-- 2. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS forest_started_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  ADD COLUMN IF NOT EXISTS total_healthy integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_dead integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forest_level integer NOT NULL DEFAULT 1;

-- 3. daily_summaries
CREATE TABLE IF NOT EXISTS public.daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  state text NOT NULL DEFAULT 'none',
  tree_id uuid,
  species text,
  coins_earned integer NOT NULL DEFAULT 0,
  usage_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_summaries TO authenticated;
GRANT ALL ON public.daily_summaries TO service_role;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily summaries" ON public.daily_summaries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. daily_chests
CREATE TABLE IF NOT EXISTS public.daily_chests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  opened boolean NOT NULL DEFAULT false,
  reward_kind text,
  reward_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  UNIQUE (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_chests TO authenticated;
GRANT ALL ON public.daily_chests TO service_role;
ALTER TABLE public.daily_chests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chests" ON public.daily_chests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. islands
CREATE TABLE IF NOT EXISTS public.islands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  index integer NOT NULL,
  level integer NOT NULL DEFAULT 1,
  name text NOT NULL DEFAULT 'Seedling Island',
  unlocked_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.islands TO authenticated;
GRANT ALL ON public.islands TO service_role;
ALTER TABLE public.islands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own islands" ON public.islands
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. revival_missions
CREATE TABLE IF NOT EXISTS public.revival_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_id uuid NOT NULL,
  started_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  successful_days integer NOT NULL DEFAULT 0,
  last_progress_day date,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tree_id, completed)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revival_missions TO authenticated;
GRANT ALL ON public.revival_missions TO service_role;
ALTER TABLE public.revival_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own revival missions" ON public.revival_missions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. updated_at trigger helper (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS set_daily_summaries_updated_at ON public.daily_summaries;
CREATE TRIGGER set_daily_summaries_updated_at
  BEFORE UPDATE ON public.daily_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Seed first island for existing users
INSERT INTO public.islands (user_id, index, level, name)
SELECT id, 0, 1, 'Seedling Island' FROM public.profiles
ON CONFLICT (user_id, index) DO NOTHING;
