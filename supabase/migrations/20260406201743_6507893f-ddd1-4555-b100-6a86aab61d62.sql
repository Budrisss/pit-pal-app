
-- Fix 1: Prevent organizer self-approval on INSERT
DROP POLICY IF EXISTS "Users can create their own organizer profile" ON public.organizer_profiles;
CREATE POLICY "Users can create their own organizer profile"
ON public.organizer_profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND approved = false);

-- Fix 2: Restrict crew_messages INSERT to event owner or registered participants
DROP POLICY IF EXISTS "Users can insert own crew messages" ON public.crew_messages;
CREATE POLICY "Users can insert own crew messages"
ON public.crew_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.event_registrations er ON er.event_id = e.public_event_id
      WHERE e.id = crew_messages.event_id AND er.user_id = auth.uid()
    )
  )
);
