
-- Remove broad SELECT - only owner should access base table
DROP POLICY IF EXISTS "Authenticated users can view organizer profiles" ON public.organizer_profiles;

-- View should be SECURITY DEFINER so it bypasses RLS (it only exposes safe columns)
ALTER VIEW public.organizer_profiles_public SET (security_invoker = off);
