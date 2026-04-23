-- Add Toe + Caster columns to setup_data
ALTER TABLE public.setup_data
  ADD COLUMN IF NOT EXISTS lf_toe numeric,
  ADD COLUMN IF NOT EXISTS rf_toe numeric,
  ADD COLUMN IF NOT EXISTS lr_toe numeric,
  ADD COLUMN IF NOT EXISTS rr_toe numeric,
  ADD COLUMN IF NOT EXISTS lf_caster numeric,
  ADD COLUMN IF NOT EXISTS rf_caster numeric;

-- Create tire wear photos table
CREATE TABLE IF NOT EXISTS public.setup_tire_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id uuid NULL REFERENCES public.setup_data(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  corner text NOT NULL CHECK (corner IN ('LF','RF','LR','RR')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_setup_tire_photos_setup_id ON public.setup_tire_photos(setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_tire_photos_user_id ON public.setup_tire_photos(user_id);

ALTER TABLE public.setup_tire_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tire photos"
  ON public.setup_tire_photos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tire photos"
  ON public.setup_tire_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tire photos"
  ON public.setup_tire_photos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tire photos"
  ON public.setup_tire_photos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);