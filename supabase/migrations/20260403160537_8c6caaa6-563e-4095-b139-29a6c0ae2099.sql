
-- Create maintenance_logs table
CREATE TABLE public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  service_date date NOT NULL,
  mileage integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maintenance logs" ON public.maintenance_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own maintenance logs" ON public.maintenance_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance logs" ON public.maintenance_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance logs" ON public.maintenance_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create maintenance_attachments table
CREATE TABLE public.maintenance_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES public.maintenance_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maintenance attachments" ON public.maintenance_attachments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own maintenance attachments" ON public.maintenance_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance attachments" ON public.maintenance_attachments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-attachments', 'maintenance-attachments', true);

-- Storage RLS policies
CREATE POLICY "Users can upload maintenance attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maintenance-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view maintenance attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'maintenance-attachments');
CREATE POLICY "Users can delete own maintenance attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'maintenance-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
