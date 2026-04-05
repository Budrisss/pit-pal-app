
-- Fix storage SELECT policies to enforce ownership via folder path
-- maintenance-attachments
DROP POLICY IF EXISTS "Give users access to own folder maint select" ON storage.objects;
CREATE POLICY "Give users access to own folder maint select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'maintenance-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Remove any existing overly permissive SELECT policy for maintenance-attachments
DROP POLICY IF EXISTS "Allow authenticated read maintenance-attachments" ON storage.objects;
DROP POLICY IF EXISTS "maintenance-attachments select" ON storage.objects;

-- setup-attachments
DROP POLICY IF EXISTS "Give users access to own folder setup select" ON storage.objects;
CREATE POLICY "Give users access to own folder setup select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'setup-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Remove any existing overly permissive SELECT policy for setup-attachments
DROP POLICY IF EXISTS "Allow authenticated read setup-attachments" ON storage.objects;
DROP POLICY IF EXISTS "setup-attachments select" ON storage.objects;
