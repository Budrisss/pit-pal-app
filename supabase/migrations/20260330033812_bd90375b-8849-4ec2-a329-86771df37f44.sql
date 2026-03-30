CREATE POLICY "Targeted users can deactivate their own black flag"
ON public.event_flags
FOR UPDATE
TO authenticated
USING (target_user_id = auth.uid() AND flag_type = 'black')
WITH CHECK (is_active = false);