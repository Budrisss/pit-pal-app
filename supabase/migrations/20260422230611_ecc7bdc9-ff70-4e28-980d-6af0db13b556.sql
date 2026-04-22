ALTER TABLE public.racer_profiles
ADD COLUMN IF NOT EXISTS primary_car_id uuid NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;