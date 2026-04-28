---
name: LoRa Hardware Integration
description: T1000-E Meshtastic radios over BLE, RAK7289v2 gateway, MQTT-bridged uplink edge function, paired-device storage, per-registration radio assignment, friendly Radio N labels, per-event allowlist enforcement, organizer assign-on-behalf, live GPS position tracking, organizer gateway config UI
type: feature
---
- App pairs to one Seeed T1000-E (Meshtastic firmware) per user via BLE GATT (`@capacitor-community/bluetooth-le`). Service UUID `6ba1b218-15a8-461f-9fa8-5dcae273eafd`.
- Three transports in priority order: hardware (BLE radio, name `lora-hw`) → sim (in-memory, name `lora-sim`) → Supabase only. `getCrewTransport()` in `src/lib/transport/index.ts` picks based on `lora_hardware_enabled` + `lora_sim_enabled` localStorage flags. UI treats both `lora-hw` and `lora-sim` as "Radio".
- Wire format: our existing JSON LoRaPayload wrapped in Meshtastic `TEXT_MESSAGE_APP` (portnum 1) via hand-rolled minimal protobuf encoder at `src/lib/transport/meshtastic/protobuf.ts`. Also exports `decodeMyNodeInfo` (radio's hex node id on first connect) and `decodePositionPayload`/`decodePositionFromPacket` for `POSITION_APP` (portnum 3) packets.
- Gateway-side: RAK7289v2 runs Mosquitto + Python bridge that POSTs to `meshtastic-uplink` edge function with HMAC-SHA256 signature in `X-Signature` header and channel name in `X-Channel`. Bridge `from` field carries the hex node id. Bridge payload may include `text` (crew msg/flag) and/or `position` (GPS fix) — edge function handles both branches.

### Pairing model (two-tier)
- Global default radio: `LoRaPairingCard` on Settings (Capacitor only), `lora_paired_devices` row with `event_registration_id = NULL`.
- Per-registration pairing: `RegistrationRadioPairing` lives inside each `MyRegistrations` row. Now renders on web too (manual node-ID entry path) — only the BLE scan + position-share toggle are gated by `isHardwareCapable()`.
- Both flows funnel through the shared `AssignRadioDialog` component (`src/components/AssignRadioDialog.tsx`) which supports two modes: BLE scan (Capacitor) and manual node-ID entry (web/desktop).

### Friendly labels
- `lora_paired_devices.radio_label` (text, nullable) stores names like "Radio 4". Auto-assigned by `AssignRadioDialog.computeNextLabel()` — finds max existing `Radio N` across all paired devices for the event's registrations and returns N+1.
- `PairedRadiosPanel` displays the label as primary text with the hex node id as a small monospace subtitle. `RegistrationRadioPairing` driver-facing UI shows the label too.

### Per-event radio allowlist (lock down to your radios only)
- `lora_event_radio_allowlist` table (event_id, meshtastic_node_id, label, notes, added_by) — UNIQUE (event_id, meshtastic_node_id). RLS: organizers manage own event's rows; registered racers can SELECT for client-side validation.
- Empty allowlist = open mode (any Meshtastic radio nearby can pair). Non-empty = strict mode: pair flow rejects non-listed nodes with a toast, and the `meshtastic-uplink` edge function drops packets from non-listed nodes (defense in depth).
- Managed via `EventRadioAllowlistCard` collapsible card on `OrganizerLiveManage` (mounted right after `LoRaGatewayConfigCard`). Single-add and bulk-import (newline or comma separated).

### BLE name prefix
- `lora_event_channels.radio_name_prefix` (text, default `'TSO-'`) — passed as `namePrefix` to `BleClient.requestDevice` so the OS picker only lists radios matching the convention. Reduces clutter when other Meshtastic users are at the track.

### Organizer assign-on-behalf
- `PairedRadiosPanel` accepts `eventId` + `onChanged` props and shows a `+ Assign` button on rows with no paired radio. Opens `AssignRadioDialog` with the driver's user_id / car # / registration id.
- New RLS policy `Organizers manage paired devices for their events` on `lora_paired_devices` allows ALL operations where the row's `event_registration_id` belongs to one of the organizer's approved events.

### Per-registration pairing details
- `lora_paired_devices` has `event_registration_id` (nullable = global default). Captured Meshtastic node id (hex). Edge function resolves sender node → registration → enriches `crew_messages` with `position` (#car_number); messages from unknown nodes are dropped (and from non-allowlisted nodes when allowlist non-empty).
- Tables: `lora_event_channels` (channel_name unique → event_id + hmac_secret + gateway_url + radio_name_prefix, organizer-only RLS, populated via `LoRaGatewayConfigCard`), `lora_paired_devices` (user-only RLS PLUS organizer RLS for their events; partial unique on user_id where event_registration_id IS NULL for the default slot, plus unique (user_id, event_registration_id) for per-reg slots), `lora_position_fixes` (append-only GPS fixes; driver SELECTs own + event owner SELECTs all; realtime publication enabled; index on (event_id, received_at desc)).

### Flag downlink + live position tracking (unchanged)
- DB trigger `trg_broadcast_flag_to_lora` on `event_flags` AFTER INSERT calls `flag-downlink-broadcast` edge function via `pg_net`; function looks up `lora_event_channels.event_id = event_flags.event_id`, signs payload with HMAC, POSTs to `gateway_url`. Trigger silently no-ops if no channel row exists. Racer-side receive: `RacerLiveView` subscribes to transport, decodes `t === "flag"` payloads, renders as `lora-` synthetic flags.
- BLE path inserts position fixes directly via `LoRaHardwareTransport.handlePositionPacket()` (10s throttle). Uplink path inserts via edge function `bridge.position` branch. `LiveTrackMap` component renders one car-number marker per registration on `OrganizerLiveManage`.
- Driver privacy: `POSITION_SHARE_KEY` localStorage toggle in `RegistrationRadioPairing` ("Share my position with race control", default on). When off, BLE path skips inserts.

### Organizer view layout
- `OrganizerLiveManage` order: `ConnectivityCheckPanel` → `PairedRadiosPanel` (with assign-on-behalf) → `LoRaGatewayConfigCard` → `EventRadioAllowlistCard` → Participants/Crew Messaging.

- Setup guide lives at `docs/hardware-setup.md`.
