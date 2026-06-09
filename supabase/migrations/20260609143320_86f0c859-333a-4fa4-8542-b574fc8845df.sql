
-- Enums
CREATE TYPE public.tree_state AS ENUM ('healthy','weak','dying','dead','reviving');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_seed TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  coins INT NOT NULL DEFAULT 100,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid()=id) WITH CHECK (auth.uid()=id);

-- Tracked apps
CREATE TABLE public.tracked_apps (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  daily_limit_min INT NOT NULL DEFAULT 30,
  PRIMARY KEY (user_id, app_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_apps TO authenticated;
GRANT ALL ON public.tracked_apps TO service_role;
ALTER TABLE public.tracked_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracked apps" ON public.tracked_apps FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Usage logs
CREATE TABLE public.usage_logs (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day DATE NOT NULL,
  app_key TEXT NOT NULL,
  minutes_used INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, app_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_logs TO authenticated;
GRANT ALL ON public.usage_logs TO service_role;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage" ON public.usage_logs FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Trees
CREATE TABLE public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  species TEXT NOT NULL DEFAULT 'neem',
  planted_on DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  state public.tree_state NOT NULL DEFAULT 'healthy',
  growth_pct INT NOT NULL DEFAULT 5,
  position_x REAL NOT NULL DEFAULT 0,
  position_z REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trees_user_idx ON public.trees(user_id);
CREATE UNIQUE INDEX trees_user_day_idx ON public.trees(user_id, planted_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trees TO authenticated;
GRANT ALL ON public.trees TO service_role;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trees" ON public.trees FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Unlocked species
CREATE TABLE public.unlocked_species (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  species TEXT NOT NULL,
  unlocked_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, species)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unlocked_species TO authenticated;
GRANT ALL ON public.unlocked_species TO service_role;
ALTER TABLE public.unlocked_species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own species" ON public.unlocked_species FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Achievements
CREATE TABLE public.achievements (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key TEXT NOT NULL,
  unlocked_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.achievements FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Auto-create profile + defaults on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));

  INSERT INTO public.tracked_apps (user_id, app_key, daily_limit_min) VALUES
    (NEW.id, 'instagram', 30),
    (NEW.id, 'youtube', 45),
    (NEW.id, 'shorts', 20),
    (NEW.id, 'facebook', 30),
    (NEW.id, 'x', 20),
    (NEW.id, 'games', 30);

  INSERT INTO public.unlocked_species (user_id, species) VALUES
    (NEW.id, 'neem'),
    (NEW.id, 'mango');

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
