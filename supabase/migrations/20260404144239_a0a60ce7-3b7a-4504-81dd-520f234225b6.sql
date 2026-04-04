
-- Security definer function to get event info for crew view (bypasses events RLS)
CREATE OR REPLACE FUNCTION public.get_crew_event_info(p_event_id uuid)
RETURNS TABLE(event_user_id uuid, public_event_id uuid, event_name text, event_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.user_id, e.public_event_id, e.name::text, e.date
  FROM public.events e
  WHERE e.id = p_event_id
  LIMIT 1;
$$;

-- Update crew_messages RLS: allow any authenticated user to read messages by event_id
DROP POLICY IF EXISTS "Users can view own crew messages" ON public.crew_messages;
CREATE POLICY "Anyone authenticated can view crew messages"
ON public.crew_messages FOR SELECT
TO authenticated
USING (true);

-- Allow any authenticated user to insert crew messages
DROP POLICY IF EXISTS "Users can insert own crew messages" ON public.crew_messages;
CREATE POLICY "Anyone authenticated can insert crew messages"
ON public.crew_messages FOR INSERT
TO authenticated
WITH CHECK (true);
