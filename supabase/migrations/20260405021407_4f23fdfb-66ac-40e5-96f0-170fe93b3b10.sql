
-- 1. Fix verification_codes: Remove all public RLS policies (edge functions use service role key, so they bypass RLS)
DROP POLICY IF EXISTS "Allow anonymous insert for verification" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow anonymous select for verification" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow anonymous update for verification" ON public.verification_codes;

-- No client-side access needed; edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- 2. Fix crew_messages: Restrict INSERT to only the authenticated user's own messages
DROP POLICY IF EXISTS "Anyone authenticated can insert crew messages" ON public.crew_messages;
CREATE POLICY "Users can insert own crew messages"
  ON public.crew_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('maintenance-attachments', 'setup-attachments');
