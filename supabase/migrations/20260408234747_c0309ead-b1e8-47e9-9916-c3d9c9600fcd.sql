
-- Migration 1: racer_profiles
CREATE TABLE public.racer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name text NOT NULL DEFAULT '',
  total_track_hours numeric NOT NULL DEFAULT 0,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.racer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own racer profile" ON public.racer_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own racer profile" ON public.racer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own racer profile" ON public.racer_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view racer profiles" ON public.racer_profiles FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_racer_profiles_updated_at
  BEFORE UPDATE ON public.racer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration 2: grid_stamps
CREATE TABLE public.grid_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id uuid NOT NULL,
  organizer_id uuid NOT NULL,
  track_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  group_level text,
  hours numeric NOT NULL DEFAULT 1,
  rating integer,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grid_stamps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Racers can view own stamps" ON public.grid_stamps FOR SELECT TO authenticated USING (racer_id = auth.uid());
CREATE POLICY "Authenticated can view stamps" ON public.grid_stamps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers can insert stamps" ON public.grid_stamps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM organizer_profiles op WHERE op.user_id = auth.uid() AND op.approved = true AND op.id = grid_stamps.organizer_id));

-- Validation trigger instead of CHECK constraint for rating
CREATE OR REPLACE FUNCTION public.validate_grid_stamp_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating IS NOT NULL AND (NEW.rating < 1 OR NEW.rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_grid_stamp_rating
  BEFORE INSERT OR UPDATE ON public.grid_stamps
  FOR EACH ROW EXECUTE FUNCTION public.validate_grid_stamp_rating();

-- Migration 3: Auto-increment trigger
CREATE OR REPLACE FUNCTION public.increment_track_hours()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.racer_profiles (user_id, total_track_hours)
  VALUES (NEW.racer_id, NEW.hours)
  ON CONFLICT (user_id)
  DO UPDATE SET total_track_hours = racer_profiles.total_track_hours + NEW.hours,
               updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_track_hours
  AFTER INSERT ON public.grid_stamps
  FOR EACH ROW EXECUTE FUNCTION public.increment_track_hours();
