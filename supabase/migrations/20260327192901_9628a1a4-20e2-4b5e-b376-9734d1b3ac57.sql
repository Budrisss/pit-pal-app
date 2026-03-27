-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== TRACKS =====
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracks" ON public.tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tracks" ON public.tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tracks" ON public.tracks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tracks" ON public.tracks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== CARS (recreate with full schema) =====
DROP TABLE IF EXISTS public.cars CASCADE;

CREATE TABLE public.cars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER,
  make TEXT,
  model TEXT,
  category TEXT,
  image TEXT,
  engine TEXT,
  power TEXT,
  weight TEXT,
  drivetrain TEXT,
  color TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cars" ON public.cars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cars" ON public.cars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cars" ON public.cars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cars" ON public.cars FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== EVENTS =====
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  address TEXT,
  description TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SESSIONS =====
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'practice',
  duration INTEGER,
  start_time TEXT,
  notes TEXT,
  state TEXT DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SETUP_DATA =====
CREATE TABLE public.setup_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  session_name TEXT,
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  setup_name TEXT,
  fastest_lap_time TEXT,
  lf_camber NUMERIC, rf_camber NUMERIC, lr_camber NUMERIC, rr_camber NUMERIC,
  lf_ride_height NUMERIC, rf_ride_height NUMERIC, lr_ride_height NUMERIC, rr_ride_height NUMERIC,
  lf_spring NUMERIC, rf_spring NUMERIC, lr_spring NUMERIC, rr_spring NUMERIC,
  lf_shock NUMERIC, rf_shock NUMERIC, lr_shock NUMERIC, rr_shock NUMERIC,
  front_percentage NUMERIC, rear_percentage NUMERIC, cross_percentage NUMERIC,
  left_percentage NUMERIC, right_percentage NUMERIC,
  fl_cold_pressure NUMERIC, fl_hot_pressure NUMERIC,
  fl_temp_outside NUMERIC, fl_temp_center NUMERIC, fl_temp_inside NUMERIC,
  fr_cold_pressure NUMERIC, fr_hot_pressure NUMERIC,
  fr_temp_outside NUMERIC, fr_temp_center NUMERIC, fr_temp_inside NUMERIC,
  rl_cold_pressure NUMERIC, rl_hot_pressure NUMERIC,
  rl_temp_outside NUMERIC, rl_temp_center NUMERIC, rl_temp_inside NUMERIC,
  rr_cold_pressure NUMERIC, rr_hot_pressure NUMERIC,
  rr_temp_outside NUMERIC, rr_temp_center NUMERIC, rr_temp_inside NUMERIC,
  notes_times TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.setup_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own setup data" ON public.setup_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own setup data" ON public.setup_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own setup data" ON public.setup_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own setup data" ON public.setup_data FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_setup_data_updated_at BEFORE UPDATE ON public.setup_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();