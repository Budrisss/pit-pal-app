
-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own organizer profile" ON public.organizer_profiles;

-- Recreate with a WITH CHECK clause that prevents changing the approved field
CREATE POLICY "Users can update their own organizer profile"
ON public.organizer_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND approved = (SELECT op.approved FROM public.organizer_profiles op WHERE op.user_id = auth.uid())
);
