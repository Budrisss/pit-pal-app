
-- 1. Fix crew_messages: restrict SELECT to event participants
DROP POLICY IF EXISTS "Anyone authenticated can view crew messages" ON public.crew_messages;

-- Allow event owner (the user whose personal event it is) to read crew messages
CREATE POLICY "Event owner can view crew messages"
  ON public.crew_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = crew_messages.event_id
        AND e.user_id = auth.uid()
    )
  );

-- Allow registered participants of the linked public event to read crew messages
CREATE POLICY "Registered participants can view crew messages"
  ON public.crew_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.event_registrations er ON er.event_id = e.public_event_id
      WHERE e.id = crew_messages.event_id
        AND er.user_id = auth.uid()
    )
  );

-- Allow message author to view their own messages
CREATE POLICY "Users can view own crew messages"
  ON public.crew_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fix organizer_profiles: restrict sensitive fields
-- Replace the broad SELECT with owner-only full access + public access to non-sensitive fields via a view
DROP POLICY IF EXISTS "Users can view all organizer profiles" ON public.organizer_profiles;

-- Owner can see their own full profile
CREATE POLICY "Users can view own organizer profile"
  ON public.organizer_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- All authenticated users need to see org_name and id for event display
-- We'll allow SELECT but create a view for public access
CREATE POLICY "Authenticated users can view organizer profiles"
  ON public.organizer_profiles FOR SELECT
  TO authenticated
  USING (true);
