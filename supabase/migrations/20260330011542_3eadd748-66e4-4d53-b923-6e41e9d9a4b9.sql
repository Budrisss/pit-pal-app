
CREATE TABLE public.preset_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  track_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.preset_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preset tracks"
  ON public.preset_tracks
  FOR SELECT
  TO authenticated
  USING (true);
