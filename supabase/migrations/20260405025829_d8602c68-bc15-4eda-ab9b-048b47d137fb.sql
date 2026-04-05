
-- Remove the broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view event flags" ON public.event_flags;

-- Organizers can view flags for their events
CREATE POLICY "Organizers can view event flags"
  ON public.event_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.public_events pe
      JOIN public.organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = event_flags.event_id
        AND op.user_id = auth.uid()
    )
  );

-- Registered participants can view flags for their events
CREATE POLICY "Participants can view event flags"
  ON public.event_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_registrations er
      WHERE er.event_id = event_flags.event_id
        AND er.user_id = auth.uid()
    )
  );
