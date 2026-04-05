CREATE OR REPLACE VIEW public.organizer_profiles_public
WITH (security_invoker = true)
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