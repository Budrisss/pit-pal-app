
CREATE TABLE public.public_event_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  registration_type_id UUID REFERENCES public.registration_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_time TEXT,
  duration_minutes INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.public_event_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view sessions
CREATE POLICY "Anyone can view event sessions"
  ON public.public_event_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Organizers can manage sessions for their events
CREATE POLICY "Organizers can insert event sessions"
  ON public.public_event_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = public_event_sessions.event_id AND op.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update event sessions"
  ON public.public_event_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = public_event_sessions.event_id AND op.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can delete event sessions"
  ON public.public_event_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = public_event_sessions.event_id AND op.user_id = auth.uid()
    )
  );
