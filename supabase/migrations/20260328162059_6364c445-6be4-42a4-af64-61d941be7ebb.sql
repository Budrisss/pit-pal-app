
-- Create event_announcements table
CREATE TABLE public.event_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES public.organizer_profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read announcements
CREATE POLICY "Anyone can view event announcements"
  ON public.event_announcements FOR SELECT
  TO authenticated USING (true);

-- Organizers can insert their own announcements
CREATE POLICY "Organizers can insert announcements"
  ON public.event_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.public_events pe
      JOIN public.organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = event_announcements.event_id
        AND op.user_id = auth.uid()
        AND op.id = event_announcements.organizer_id
    )
  );

-- Organizers can delete their own announcements
CREATE POLICY "Organizers can delete announcements"
  ON public.event_announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_profiles op
      WHERE op.id = event_announcements.organizer_id
        AND op.user_id = auth.uid()
    )
  );

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_event_sessions;
