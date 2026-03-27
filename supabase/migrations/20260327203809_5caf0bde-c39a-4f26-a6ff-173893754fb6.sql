
CREATE TABLE public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert for verification"
  ON public.verification_codes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select for verification"
  ON public.verification_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous update for verification"
  ON public.verification_codes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
