
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  registration_type_id uuid NOT NULL REFERENCES public.registration_types(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  user_phone text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own registrations
CREATE POLICY "Users can view own registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Organizers can view registrations for their events
CREATE POLICY "Organizers can view event registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.public_events pe
      JOIN public.organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = event_registrations.event_id
        AND op.user_id = auth.uid()
    )
  );

-- Authenticated users can register
CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own registrations
CREATE POLICY "Users can cancel own registration"
  ON public.event_registrations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
