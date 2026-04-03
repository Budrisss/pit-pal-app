ALTER TABLE public.event_registrations ADD COLUMN crew_enabled boolean NOT NULL DEFAULT false;

CREATE POLICY "Organizers can update registrations"
ON public.event_registrations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public_events pe
    JOIN organizer_profiles op ON op.id = pe.organizer_id
    WHERE pe.id = event_registrations.event_id
    AND op.user_id = auth.uid()
  )
);