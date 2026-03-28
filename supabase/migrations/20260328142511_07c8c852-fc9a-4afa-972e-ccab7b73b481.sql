
-- Organizer profiles table
CREATE TABLE public.organizer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  website text,
  description text,
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.organizer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all organizer profiles" ON public.organizer_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own organizer profile" ON public.organizer_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own organizer profile" ON public.organizer_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own organizer profile" ON public.organizer_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User locations table for ZIP-based proximity
CREATE TABLE public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zip_code text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own location" ON public.user_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own location" ON public.user_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own location" ON public.user_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Public events table
CREATE TABLE public.public_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  time text,
  description text,
  track_name text,
  address text,
  city text,
  state text,
  zip_code text,
  latitude numeric,
  longitude numeric,
  entry_fee text,
  car_classes text,
  registration_link text,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view public events
CREATE POLICY "Authenticated users can view public events" ON public.public_events FOR SELECT TO authenticated USING (true);
-- Only the organizer who owns the profile can insert
CREATE POLICY "Organizers can create events" ON public.public_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.organizer_profiles WHERE id = organizer_id AND user_id = auth.uid())
);
CREATE POLICY "Organizers can update their events" ON public.public_events FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organizer_profiles WHERE id = organizer_id AND user_id = auth.uid())
);
CREATE POLICY "Organizers can delete their events" ON public.public_events FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organizer_profiles WHERE id = organizer_id AND user_id = auth.uid())
);

-- Distance function (Haversine) for proximity queries
CREATE OR REPLACE FUNCTION public.events_within_radius(
  user_lat numeric,
  user_lng numeric,
  radius_miles numeric DEFAULT 100
)
RETURNS SETOF public.public_events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pe.*
  FROM public.public_events pe
  WHERE pe.latitude IS NOT NULL
    AND pe.longitude IS NOT NULL
    AND pe.status = 'upcoming'
    AND (
      3959 * acos(
        cos(radians(user_lat)) * cos(radians(pe.latitude)) *
        cos(radians(pe.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(pe.latitude))
      )
    ) <= radius_miles
  ORDER BY pe.date ASC;
$$;
