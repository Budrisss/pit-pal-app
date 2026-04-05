
-- Remove the broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view organizer profiles" ON public.organizer_profiles;

-- Create a public view that excludes sensitive contact info
CREATE OR REPLACE VIEW public.organizer_profiles_public AS
SELECT id, user_id, org_name, description, website, approved, created_at, updated_at
FROM public.organizer_profiles;

-- Grant access to the view
GRANT SELECT ON public.organizer_profiles_public TO authenticated;
GRANT SELECT ON public.organizer_profiles_public TO anon;
