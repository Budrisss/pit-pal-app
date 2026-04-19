-- Add event_registration_id to lora_paired_devices
ALTER TABLE public.lora_paired_devices
  ADD COLUMN IF NOT EXISTS event_registration_id uuid;

-- Drop old uniqueness on (user_id, ble_device_id) if present so the same physical
-- node can be reused across registrations / events.
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.lora_paired_devices'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(user_id, ble_device_id)%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.lora_paired_devices DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

-- One radio per (user, registration). NULL registration = the user's global default.
-- Postgres treats NULLs as distinct in unique constraints, so we need a partial
-- unique index for the global-default slot AND a regular unique for per-reg rows.
CREATE UNIQUE INDEX IF NOT EXISTS lora_paired_devices_user_reg_uidx
  ON public.lora_paired_devices (user_id, event_registration_id)
  WHERE event_registration_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lora_paired_devices_user_default_uidx
  ON public.lora_paired_devices (user_id)
  WHERE event_registration_id IS NULL;

CREATE INDEX IF NOT EXISTS lora_paired_devices_event_reg_idx
  ON public.lora_paired_devices (event_registration_id);

CREATE INDEX IF NOT EXISTS lora_paired_devices_node_id_idx
  ON public.lora_paired_devices (meshtastic_node_id);