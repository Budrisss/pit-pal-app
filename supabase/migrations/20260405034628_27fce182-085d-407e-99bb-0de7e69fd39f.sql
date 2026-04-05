CREATE POLICY "Authenticated users can view organizer profiles"
ON public.organizer_profiles
FOR SELECT
TO authenticated
USING (true);