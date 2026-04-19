---
name: LoRa Hardware Integration
description: T1000-E Meshtastic radios over BLE, RAK7289v2 gateway, MQTT-bridged uplink edge function, paired-device storage
type: feature
---
- App pairs to one Seeed T1000-E (Meshtastic firmware) per user via BLE GATT (`@capacitor-community/bluetooth-le`). Service UUID `6ba1b218-15a8-461f-9fa8-5dcae273eafd`.
- Three transports in priority order: hardware (BLE radio) → sim (in-memory) → Supabase only. `getCrewTransport()` in `src/lib/transport/index.ts` picks based on `lora_hardware_enabled` + `lora_sim_enabled` localStorage flags.
- Hardware transport only available on Capacitor native. `LoRaPairingCard` returns null on web.
- Wire format: our existing JSON LoRaPayload wrapped in Meshtastic `TEXT_MESSAGE_APP` (portnum 1) via hand-rolled minimal protobuf encoder at `src/lib/transport/meshtastic/protobuf.ts` (avoids 200KB full schema).
- Gateway-side: RAK7289v2 runs Mosquitto + Python bridge that POSTs to `meshtastic-uplink` edge function with HMAC-SHA256 signature in `X-Signature` header and channel name in `X-Channel`.
- Tables: `lora_event_channels` (channel_name unique → event_id + hmac_secret, organizer-only RLS) and `lora_paired_devices` (user-only RLS).
- Setup guide lives at `docs/hardware-setup.md`.
