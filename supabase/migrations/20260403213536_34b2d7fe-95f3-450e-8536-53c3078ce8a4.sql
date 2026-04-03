
-- Create run_groups table
CREATE TABLE public.run_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.run_groups ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can view run groups
CREATE POLICY "Anyone can view run groups"
  ON public.run_groups FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Organizers can insert run groups for their events
CREATE POLICY "Organizers can insert run groups"
  ON public.run_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = run_groups.event_id AND op.user_id = auth.uid()
    )
  );

-- RLS: Organizers can update run groups for their events
CREATE POLICY "Organizers can update run groups"
  ON public.run_groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = run_groups.event_id AND op.user_id = auth.uid()
    )
  );

-- RLS: Organizers can delete run groups for their events
CREATE POLICY "Organizers can delete run groups"
  ON public.run_groups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public_events pe
      JOIN organizer_profiles op ON op.id = pe.organizer_id
      WHERE pe.id = run_groups.event_id AND op.user_id = auth.uid()
    )
  );

-- Add run_group_id to public_event_sessions
ALTER TABLE public.public_event_sessions ADD COLUMN run_group_id uuid REFERENCES public.run_groups(id) ON DELETE SET NULL;

-- Add run_group_id to event_registrations
ALTER TABLE public.event_registrations ADD COLUMN run_group_id uuid REFERENCES public.run_groups(id) ON DELETE SET NULL;
