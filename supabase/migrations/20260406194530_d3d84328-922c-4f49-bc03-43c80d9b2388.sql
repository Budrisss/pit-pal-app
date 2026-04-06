
-- 1. Change default of approved to false (new organizers need approval)
ALTER TABLE public.organizer_profiles ALTER COLUMN approved SET DEFAULT false;

-- 2. Update public_events policies
DROP POLICY IF EXISTS "Organizers can create events" ON public.public_events;
CREATE POLICY "Organizers can create events" ON public.public_events
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM organizer_profiles
  WHERE organizer_profiles.id = public_events.organizer_id
    AND organizer_profiles.user_id = auth.uid()
    AND organizer_profiles.approved = true
));

DROP POLICY IF EXISTS "Organizers can update their events" ON public.public_events;
CREATE POLICY "Organizers can update their events" ON public.public_events
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizer_profiles
  WHERE organizer_profiles.id = public_events.organizer_id
    AND organizer_profiles.user_id = auth.uid()
    AND organizer_profiles.approved = true
));

DROP POLICY IF EXISTS "Organizers can delete their events" ON public.public_events;
CREATE POLICY "Organizers can delete their events" ON public.public_events
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizer_profiles
  WHERE organizer_profiles.id = public_events.organizer_id
    AND organizer_profiles.user_id = auth.uid()
    AND organizer_profiles.approved = true
));

-- 3. Update event_registrations policies
DROP POLICY IF EXISTS "Organizers can view event registrations" ON public.event_registrations;
CREATE POLICY "Organizers can view event registrations" ON public.event_registrations
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = event_registrations.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can update registrations" ON public.event_registrations;
CREATE POLICY "Organizers can update registrations" ON public.event_registrations
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = event_registrations.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

-- 4. Update registration_types policies
DROP POLICY IF EXISTS "Organizers can insert registration types" ON public.registration_types;
CREATE POLICY "Organizers can insert registration types" ON public.registration_types
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = registration_types.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can update registration types" ON public.registration_types;
CREATE POLICY "Organizers can update registration types" ON public.registration_types
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = registration_types.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can delete registration types" ON public.registration_types;
CREATE POLICY "Organizers can delete registration types" ON public.registration_types
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = registration_types.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

-- 5. Update run_groups policies
DROP POLICY IF EXISTS "Organizers can insert run groups" ON public.run_groups;
CREATE POLICY "Organizers can insert run groups" ON public.run_groups
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = run_groups.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can update run groups" ON public.run_groups;
CREATE POLICY "Organizers can update run groups" ON public.run_groups
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = run_groups.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can delete run groups" ON public.run_groups;
CREATE POLICY "Organizers can delete run groups" ON public.run_groups
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = run_groups.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

-- 6. Update public_event_sessions policies
DROP POLICY IF EXISTS "Organizers can insert event sessions" ON public.public_event_sessions;
CREATE POLICY "Organizers can insert event sessions" ON public.public_event_sessions
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = public_event_sessions.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can update event sessions" ON public.public_event_sessions;
CREATE POLICY "Organizers can update event sessions" ON public.public_event_sessions
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = public_event_sessions.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can delete event sessions" ON public.public_event_sessions;
CREATE POLICY "Organizers can delete event sessions" ON public.public_event_sessions
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = public_event_sessions.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

-- 7. Update event_flags policies
DROP POLICY IF EXISTS "Organizers can insert flags" ON public.event_flags;
CREATE POLICY "Organizers can insert flags" ON public.event_flags
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = event_flags.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
    AND op.id = event_flags.organizer_id
));

DROP POLICY IF EXISTS "Organizers can update flags" ON public.event_flags;
CREATE POLICY "Organizers can update flags" ON public.event_flags
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = event_flags.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can delete flags" ON public.event_flags;
CREATE POLICY "Organizers can delete flags" ON public.event_flags
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = event_flags.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can view event flags" ON public.event_flags;
CREATE POLICY "Organizers can view event flags" ON public.event_flags
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = event_flags.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

-- 8. Update event_announcements policies
DROP POLICY IF EXISTS "Organizers can insert announcements" ON public.event_announcements;
CREATE POLICY "Organizers can insert announcements" ON public.event_announcements
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public_events pe
  JOIN organizer_profiles op ON op.id = pe.organizer_id
  WHERE pe.id = event_announcements.event_id
    AND op.user_id = auth.uid()
    AND op.approved = true
    AND op.id = event_announcements.organizer_id
));

DROP POLICY IF EXISTS "Organizers can delete announcements" ON public.event_announcements;
CREATE POLICY "Organizers can delete announcements" ON public.event_announcements
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizer_profiles op
  WHERE op.id = event_announcements.organizer_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

-- 9. Update organizer_settings policies
DROP POLICY IF EXISTS "Organizers can view own settings" ON public.organizer_settings;
CREATE POLICY "Organizers can view own settings" ON public.organizer_settings
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizer_profiles op
  WHERE op.id = organizer_settings.organizer_profile_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can insert own settings" ON public.organizer_settings;
CREATE POLICY "Organizers can insert own settings" ON public.organizer_settings
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM organizer_profiles op
  WHERE op.id = organizer_settings.organizer_profile_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));

DROP POLICY IF EXISTS "Organizers can update own settings" ON public.organizer_settings;
CREATE POLICY "Organizers can update own settings" ON public.organizer_settings
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizer_profiles op
  WHERE op.id = organizer_settings.organizer_profile_id
    AND op.user_id = auth.uid()
    AND op.approved = true
));
