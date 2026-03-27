-- Create cars table for user garage
CREATE TABLE public.cars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  year INTEGER,
  make TEXT,
  model TEXT,
  color TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cars table
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

-- Create policies for cars
CREATE POLICY "Users can view their own cars" 
ON public.cars 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cars" 
ON public.cars 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cars" 
ON public.cars 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cars" 
ON public.cars 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  track_id UUID REFERENCES public.tracks(id),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
CREATE POLICY "Users can view their own events" 
ON public.events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('practice', 'qualifying', 'race')) NOT NULL,
  duration INTEGER, -- in minutes
  start_time TIME,
  fastest_lap_time TEXT, -- format: "1:23.456"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for sessions (inherit from events)
CREATE POLICY "Users can view sessions from their events" 
ON public.sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = sessions.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create sessions for their events" 
ON public.sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = sessions.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sessions from their events" 
ON public.sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = sessions.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete sessions from their events" 
ON public.sessions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = sessions.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Update setup_data table to link to cars and sessions
ALTER TABLE public.setup_data 
ADD COLUMN car_id UUID REFERENCES public.cars(id),
ADD COLUMN event_id UUID REFERENCES public.events(id),
ADD COLUMN setup_name TEXT,
ADD COLUMN fastest_lap_time TEXT;

-- Add trigger for timestamps on new tables
CREATE TRIGGER update_cars_updated_at
  BEFORE UPDATE ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();