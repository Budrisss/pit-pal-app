
CREATE OR REPLACE FUNCTION public.auto_tag_crew_message_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  matched_session_id uuid;
  event_date date;
BEGIN
  -- Only auto-tag if session_id is not already set
  IF NEW.session_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get the event date
  SELECT e.date INTO event_date
  FROM public.events e
  WHERE e.id = NEW.event_id
  LIMIT 1;

  IF event_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the session that is currently active based on start_time + duration
  SELECT s.id INTO matched_session_id
  FROM public.sessions s
  WHERE s.event_id = NEW.event_id
    AND s.user_id = NEW.user_id
    AND s.start_time IS NOT NULL
    AND s.duration IS NOT NULL
    AND (event_date + s.start_time::time) <= now()
    AND (event_date + s.start_time::time + (s.duration || ' minutes')::interval) >= now()
  ORDER BY s.start_time::time ASC
  LIMIT 1;

  IF matched_session_id IS NOT NULL THEN
    NEW.session_id := matched_session_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_tag_crew_message_session
BEFORE INSERT ON public.crew_messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_tag_crew_message_session();
