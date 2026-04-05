
-- The view needs the base table to be readable. Since the view already excludes
-- sensitive columns (contact_email, phone), re-add broad SELECT on base table.
CREATE POLICY "Authenticated users can view organizer profiles"
  ON public.organizer_profiles FOR SELECT
  TO authenticated
  USING (true);
