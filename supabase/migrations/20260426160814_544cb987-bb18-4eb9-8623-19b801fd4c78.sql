ALTER TABLE public.racer_profiles
ADD COLUMN IF NOT EXISTS last_active_mode TEXT NOT NULL DEFAULT 'racer';

ALTER TABLE public.racer_profiles
DROP CONSTRAINT IF EXISTS racer_profiles_last_active_mode_check;

ALTER TABLE public.racer_profiles
ADD CONSTRAINT racer_profiles_last_active_mode_check
CHECK (last_active_mode IN ('racer', 'organizer'));