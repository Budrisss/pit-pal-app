
-- Create storage bucket for setup attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('setup-attachments', 'setup-attachments', true);

-- Storage RLS policies
CREATE POLICY "Users can upload setup attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'setup-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view setup attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'setup-attachments');

CREATE POLICY "Users can delete own setup attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'setup-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create setup_attachments table
CREATE TABLE public.setup_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id UUID NOT NULL REFERENCES public.setup_data(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.setup_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own setup attachments" ON public.setup_attachments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own setup attachments" ON public.setup_attachments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own setup attachments" ON public.setup_attachments
  FOR DELETE TO authenticated USING (user_id = auth.uid());
