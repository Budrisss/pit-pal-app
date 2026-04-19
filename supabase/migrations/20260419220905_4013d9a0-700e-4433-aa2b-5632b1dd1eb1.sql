-- Add gateway URL column so each event's channel knows where its RAK gateway lives
ALTER TABLE public.lora_event_channels
  ADD COLUMN IF NOT EXISTS gateway_url text;

COMMENT ON COLUMN public.lora_event_channels.gateway_url IS
  'Public HTTPS URL of the RAK gateway bridge endpoint that accepts downlink POSTs (e.g. https://gw.example.com/downlink). Optional — if null, downlinks are skipped.';

-- Trigger function: when an event_flag is inserted, fire-and-forget POST to our downlink edge function
CREATE OR REPLACE FUNCTION public.broadcast_flag_to_lora()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text;
  channel_row public.lora_event_channels%ROWTYPE;
BEGIN
  -- Only broadcast active flags
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Look up channel for this event (via the event's public_event_id link)
  SELECT lec.* INTO channel_row
  FROM public.lora_event_channels lec
  WHERE lec.event_id = NEW.event_id
  LIMIT 1;

  -- No channel configured → skip silently (event isn't using LoRa)
  IF channel_row.id IS NULL OR channel_row.gateway_url IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build edge function URL from current Supabase project
  fn_url := current_setting('app.settings.supabase_url', true);
  IF fn_url IS NULL OR fn_url = '' THEN
    -- Fallback: hardcoded project ref
    fn_url := 'https://fkkemgtdxbsqvtsidhvu.supabase.co';
  END IF;
  fn_url := fn_url || '/functions/v1/flag-downlink-broadcast';

  -- Fire-and-forget HTTP POST via pg_net
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'flag_id', NEW.id,
      'event_id', NEW.event_id,
      'flag_type', NEW.flag_type,
      'message', NEW.message,
      'target_user_id', NEW.target_user_id,
      'session_id', NEW.session_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block flag insert on bridge failure
  RAISE WARNING 'broadcast_flag_to_lora failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Wire it up
DROP TRIGGER IF EXISTS trg_broadcast_flag_to_lora ON public.event_flags;
CREATE TRIGGER trg_broadcast_flag_to_lora
AFTER INSERT ON public.event_flags
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_flag_to_lora();