
CREATE OR REPLACE FUNCTION public.sync_public_event_to_personal_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET
    name = NEW.name,
    date = NEW.date,
    time = NEW.time,
    address = COALESCE(NEW.address, NEW.track_name),
    description = NEW.description
  WHERE public_event_id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_public_event_updates
  AFTER UPDATE ON public.public_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_public_event_to_personal_events();
