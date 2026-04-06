
-- 1. Trim trailing spaces from run group names
UPDATE public.run_groups SET name = TRIM(name) WHERE name != TRIM(name);

-- 2. Backfill run_group_id on existing sessions by matching name
UPDATE public.public_event_sessions s
SET run_group_id = rg.id
FROM public.run_groups rg
WHERE rg.event_id = s.event_id
  AND TRIM(LOWER(rg.name)) = TRIM(LOWER(s.name))
  AND s.run_group_id IS NULL;

-- 3. Create function to auto-link session to run group on insert/update
CREATE OR REPLACE FUNCTION public.auto_link_session_run_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_group_id uuid;
BEGIN
  -- Only auto-link if run_group_id is not already set
  IF NEW.run_group_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO matched_group_id
  FROM public.run_groups
  WHERE event_id = NEW.event_id
    AND TRIM(LOWER(name)) = TRIM(LOWER(NEW.name))
  LIMIT 1;

  IF matched_group_id IS NOT NULL THEN
    NEW.run_group_id := matched_group_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create trigger on public_event_sessions
CREATE TRIGGER trg_auto_link_session_run_group
  BEFORE INSERT OR UPDATE ON public.public_event_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_session_run_group();
