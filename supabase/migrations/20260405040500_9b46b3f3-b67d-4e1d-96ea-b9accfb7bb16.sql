DROP POLICY IF EXISTS "Authenticated users can view organizer profiles" ON public.organizer_profiles;

CREATE OR REPLACE VIEW public.organizer_profiles_public
WITH (security_invoker = false)
AS
SELECT id,
    user_id,
    org_name,
    description,
    website,
    approved,
    created_at,
    updated_at
FROM organizer_profiles;