
CREATE TABLE public.registration_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price text,
  max_spots integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_types ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view registration types
CREATE POLICY "Anyone can view registration types"
  ON public.registration_types FOR SELECT
  TO authenticated
  USING (true);

-- Organizers can manage registration types for their events
CREATE POLICY "Organizers can insert registration types"
  ON public.registration_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.public_events pe
      JOIN public.organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = registration_types.event_id
        AND op.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update registration types"
  ON public.registration_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.public_events pe
      JOIN public.organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = registration_types.event_id
        AND op.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can delete registration types"
  ON public.registration_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.public_events pe
      JOIN public.organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = registration_types.event_id
        AND op.user_id = auth.uid()
    )
  );
