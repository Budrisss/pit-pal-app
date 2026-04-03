CREATE POLICY "Users can update own setup attachments"
ON public.setup_attachments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());