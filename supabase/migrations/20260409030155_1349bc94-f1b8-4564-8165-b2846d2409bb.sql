
-- Add track_map_url to events table
ALTER TABLE public.events ADD COLUMN track_map_url text;

-- Create storage bucket for track maps
INSERT INTO storage.buckets (id, name, public) VALUES ('track-maps', 'track-maps', false);

-- Storage policies: users can manage their own folder
CREATE POLICY "Users can view own track maps"
ON storage.objects FOR SELECT
USING (bucket_id = 'track-maps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own track maps"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'track-maps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own track maps"
ON storage.objects FOR UPDATE
USING (bucket_id = 'track-maps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own track maps"
ON storage.objects FOR DELETE
USING (bucket_id = 'track-maps' AND auth.uid()::text = (storage.foldername(name))[1]);
