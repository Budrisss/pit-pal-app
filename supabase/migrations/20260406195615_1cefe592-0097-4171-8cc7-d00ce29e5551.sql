
UPDATE storage.buckets SET public = false WHERE id IN ('maintenance-attachments', 'setup-attachments');
