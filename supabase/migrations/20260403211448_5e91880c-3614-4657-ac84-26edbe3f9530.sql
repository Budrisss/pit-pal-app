ALTER TABLE public.events ADD COLUMN schedule jsonb DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN requirements text[] DEFAULT NULL;