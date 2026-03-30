
-- Create event_flags table
CREATE TABLE public.event_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES public.organizer_profiles(id),
  flag_type text NOT NULL,
  message text,
  target_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view flags (racers need to see them)
CREATE POLICY "Authenticated users can view event flags"
  ON public.event_flags FOR SELECT
  TO authenticated
  USING (true);

-- Organizers can insert flags
CREATE POLICY "Organizers can insert flags"
  ON public.event_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = event_flags.event_id
        AND op.user_id = auth.uid()
        AND op.id = event_flags.organizer_id
    )
  );

-- Organizers can update flags
CREATE POLICY "Organizers can update flags"
  ON public.event_flags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = event_flags.event_id
        AND op.user_id = auth.uid()
    )
  );

-- Organizers can delete flags
CREATE POLICY "Organizers can delete flags"
  ON public.event_flags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = event_flags.event_id
        AND op.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_flags;
