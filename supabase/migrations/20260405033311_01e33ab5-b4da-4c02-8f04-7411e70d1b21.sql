ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow anonymous select for verification" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow authenticated users to read their own verification code" ON public.verification_codes;
DROP POLICY IF EXISTS "Anyone can view verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "verification_codes_select" ON public.verification_codes;

REVOKE ALL ON TABLE public.verification_codes FROM PUBLIC;
REVOKE ALL ON TABLE public.verification_codes FROM anon;
REVOKE ALL ON TABLE public.verification_codes FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.verification_codes TO service_role;