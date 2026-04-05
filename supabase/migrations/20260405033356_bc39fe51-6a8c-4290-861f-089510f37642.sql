DROP POLICY IF EXISTS "Service role can manage verification codes" ON public.verification_codes;

CREATE POLICY "Service role can manage verification codes"
ON public.verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);