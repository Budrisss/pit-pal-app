-- Create a public bucket for car images
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true);

-- Allow authenticated users to upload car images
CREATE POLICY "Users can upload car images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'car-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own car images
CREATE POLICY "Users can update their car images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'car-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own car images
CREATE POLICY "Users can delete their car images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'car-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view car images (public bucket)
CREATE POLICY "Anyone can view car images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'car-images');