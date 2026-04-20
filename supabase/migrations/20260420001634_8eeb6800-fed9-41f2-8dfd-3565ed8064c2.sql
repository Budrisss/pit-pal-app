CREATE TABLE public.lora_position_fixes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL,
  event_registration_id uuid,
  meshtastic_node_id text,
  user_id uuid,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  altitude_m double precision,
  heading_deg double precision,
  speed_mps double precision,
  fix_time timestamp with time zone,
  received_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lora_position_fixes_event_received
  ON public.lora_position_fixes (event_id, received_at DESC);

CREATE INDEX idx_lora_position_fixes_registration
  ON public.lora_position_fixes (event_registration_id, received_at DESC);

ALTER TABLE public.lora_position_fixes ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own fixes
CREATE POLICY "Users can view own position fixes"
ON public.lora_position_fixes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Organizers (via personal events linked to public events) can view all fixes for their events.
-- The event_id here is the personal events.id (same as crew_messages.event_id).
CREATE POLICY "Event owner can view all position fixes"
ON public.lora_position_fixes
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.id = lora_position_fixes.event_id
    AND e.user_id = auth.uid()
));

-- Drivers can insert their own fixes (BLE path from phone)
CREATE POLICY "Users can insert own position fixes"
ON public.lora_position_fixes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lora_position_fixes;
ALTER TABLE public.lora_position_fixes REPLICA IDENTITY FULL;