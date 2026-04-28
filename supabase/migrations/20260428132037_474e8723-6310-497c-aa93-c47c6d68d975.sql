-- Remove any duplicate pairings before adding the unique constraint
DELETE FROM public.lora_paired_devices a
USING public.lora_paired_devices b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.event_registration_id = b.event_registration_id;

-- Add unique constraint to support upsert ON CONFLICT (user_id, event_registration_id)
ALTER TABLE public.lora_paired_devices
  ADD CONSTRAINT lora_paired_devices_user_registration_unique
  UNIQUE (user_id, event_registration_id);