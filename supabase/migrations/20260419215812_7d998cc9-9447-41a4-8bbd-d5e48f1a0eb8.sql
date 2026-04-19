-- Channel → event mapping for gateway uplinks
CREATE TABLE public.lora_event_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  channel_name text NOT NULL,
  hmac_secret text NOT NULL,
  organizer_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_name)
);

CREATE INDEX idx_lora_event_channels_event ON public.lora_event_channels(event_id);

ALTER TABLE public.lora_event_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own channel mappings"
ON public.lora_event_channels
FOR ALL
TO authenticated
USING (auth.uid() = organizer_user_id)
WITH CHECK (auth.uid() = organizer_user_id);

CREATE TRIGGER update_lora_event_channels_updated_at
BEFORE UPDATE ON public.lora_event_channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-user paired BLE radio
CREATE TABLE public.lora_paired_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ble_device_id text NOT NULL,
  device_name text,
  meshtastic_node_id text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ble_device_id)
);

CREATE INDEX idx_lora_paired_devices_user ON public.lora_paired_devices(user_id);

ALTER TABLE public.lora_paired_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own paired devices"
ON public.lora_paired_devices
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_lora_paired_devices_updated_at
BEFORE UPDATE ON public.lora_paired_devices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();