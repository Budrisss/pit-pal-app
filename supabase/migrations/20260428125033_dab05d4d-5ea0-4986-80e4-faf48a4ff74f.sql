-- 1. Friendly label per paired device
ALTER TABLE public.lora_paired_devices
  ADD COLUMN IF NOT EXISTS radio_label text;

-- 2. Per-event BLE name prefix to filter rogue radios at the track
ALTER TABLE public.lora_event_channels
  ADD COLUMN IF NOT EXISTS radio_name_prefix text NOT NULL DEFAULT 'TSO-';

-- 3. Per-event authorized-radios allowlist
CREATE TABLE IF NOT EXISTS public.lora_event_radio_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  meshtastic_node_id text NOT NULL,
  label text,
  notes text,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, meshtastic_node_id)
);

CREATE INDEX IF NOT EXISTS idx_lora_allowlist_event ON public.lora_event_radio_allowlist(event_id);

ALTER TABLE public.lora_event_radio_allowlist ENABLE ROW LEVEL SECURITY;

-- Organizers manage their event's allowlist
CREATE POLICY "Organizers manage own event allowlist"
ON public.lora_event_radio_allowlist
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.public_events pe
    JOIN public.organizer_profiles op ON op.id = pe.organizer_id
    WHERE pe.id = lora_event_radio_allowlist.event_id
      AND op.user_id = auth.uid()
      AND op.approved = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.public_events pe
    JOIN public.organizer_profiles op ON op.id = pe.organizer_id
    WHERE pe.id = lora_event_radio_allowlist.event_id
      AND op.user_id = auth.uid()
      AND op.approved = true
  )
);

-- Registered racers can read the allowlist for their event (for client-side validation)
CREATE POLICY "Registered racers can view event allowlist"
ON public.lora_event_radio_allowlist
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    WHERE er.event_id = lora_event_radio_allowlist.event_id
      AND er.user_id = auth.uid()
  )
);

-- Updated-at trigger
CREATE TRIGGER trg_lora_allowlist_updated_at
BEFORE UPDATE ON public.lora_event_radio_allowlist
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Organizers can manage pairings for registrations in their events
CREATE POLICY "Organizers manage paired devices for their events"
ON public.lora_paired_devices
FOR ALL
TO authenticated
USING (
  event_registration_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.event_registrations er
    JOIN public.events ev ON ev.public_event_id = er.event_id
    JOIN public.public_events pe ON pe.id = er.event_id
    JOIN public.organizer_profiles op ON op.id = pe.organizer_id
    WHERE er.id = lora_paired_devices.event_registration_id
      AND op.user_id = auth.uid()
      AND op.approved = true
  )
)
WITH CHECK (
  event_registration_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.event_registrations er
    JOIN public.public_events pe ON pe.id = er.event_id
    JOIN public.organizer_profiles op ON op.id = pe.organizer_id
    WHERE er.id = lora_paired_devices.event_registration_id
      AND op.user_id = auth.uid()
      AND op.approved = true
  )
);