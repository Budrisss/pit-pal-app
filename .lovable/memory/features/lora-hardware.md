---
name: LoRa Hardware Integration
description: T1000-E Meshtastic radios over BLE, RAK7289v2 gateway, MQTT-bridged uplink edge function, paired-device storage, per-registration radio assignment
type: feature
---
- App pairs to one Seeed T1000-E (Meshtastic firmware) per user via BLE GATT (`@capacitor-community/bluetooth-le`). Service UUID `6ba1b218-15a8-461f-9fa8-5dcae273eafd`.
- Three transports in priority order: hardware (BLE radio) → sim (in-memory) → Supabase only. `getCrewTransport()` in `src/lib/transport/index.ts` picks based on `lora_hardware_enabled` + `lora_sim_enabled` localStorage flags.
- Hardware transport only available on Capacitor native. `LoRaPairingCard` and `RegistrationRadioPairing` return null on web.
- Wire format: our existing JSON LoRaPayload wrapped in Meshtastic `TEXT_MESSAGE_APP` (portnum 1) via hand-rolled minimal protobuf encoder at `src/lib/transport/meshtastic/protobuf.ts`. Also exports `decodeMyNodeInfo` to capture the radio's hex node id (e.g. `!a3b1c9d8`) on first connect.
- Gateway-side: RAK7289v2 runs Mosquitto + Python bridge that POSTs to `meshtastic-uplink` edge function with HMAC-SHA256 signature in `X-Signature` header and channel name in `X-Channel`. Bridge `from` field carries the hex node id.
- Per-registration pairing: `lora_paired_devices` has `event_registration_id` (nullable = global default). `RegistrationRadioPairing` component lives inside each row of `MyRegistrations`. Uplink edge function resolves sender node → registration → enriches `crew_messages` with `position` (#car_number); messages from unknown nodes are dropped.
- Tables: `lora_event_channels` (channel_name unique → event_id + hmac_secret + gateway_url, organizer-only RLS) and `lora_paired_devices` (user-only RLS; partial unique on user_id where event_registration_id IS NULL for the default slot, plus unique (user_id, event_registration_id) for per-reg slots).
- Organizer view: `OrganizerLiveManage` participants list shows 🟢/🟡/⚫ radio status per registration based on `last_seen_at` (10-min freshness window).
- Setup guide lives at `docs/hardware-setup.md`.
