ALTER TABLE public.event_registrations ADD COLUMN car_number integer;
CREATE UNIQUE INDEX idx_unique_car_number_per_event ON public.event_registrations(event_id, car_number);