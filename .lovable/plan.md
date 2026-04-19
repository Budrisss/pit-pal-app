

## Goal

Let a registered driver pair their T1000-E radio to a specific **car + event registration** (not just to their user account globally), and surface that mapping to organizers in the live grid so race control sees: "Car #42, Run Group A, paired to node `!a3b1c9d8`" — and can target flags by car/group with confidence the radio will get them.

## Current state vs gap

- `lora_paired_devices` is keyed only by `user_id + ble_device_id`. No link to event, registration, or car.
- A racer who runs 2 cars at the same event (or different events back-to-back) can't differentiate which radio is which.
- Organizers in `OrganizerLiveManage` have no visibility into who is/isn't on radio fallback.
- Pairing happens only in global Settings — no contextual pairing from "My Registrations" where the user is already thinking about car + event.

## Plan

### 1. Schema change — link paired devices to a registration

Add to `lora_paired_devices`:
- `event_registration_id uuid` (nullable — null = global/default device)
- unique constraint `(user_id, event_registration_id)` so one node per registration
- index on `event_registration_id` for organizer lookups

Migration also drops the old `(user_id, ble_device_id)` uniqueness in favor of `(user_id, event_registration_id)` so the same physical node can be reused across events.

### 2. New component `RegistrationRadioPairing.tsx`

Mounted inside each row of `MyRegistrations`. For each registration:
- Shows current paired node (name + last seen) or "No radio assigned"
- "Assign Radio" button → BLE scan → on pick, upserts a `lora_paired_devices` row with `event_registration_id` = this reg
- "Unassign" button
- "Test Ping" button — sends a flag-channel test packet so racer can verify the node lights up before going on track
- Hidden on web (uses `isHardwareCapable()`)

### 3. Refactor `LoRaPairingCard` (Settings)

Becomes the **default/global** pairing only — used as the fallback radio when a user has no per-registration assignment. Add a small "Per-event radios are managed in My Registrations" hint linking to that section.

### 4. Organizer view — radio status column in the participant grid

In `OrganizerLiveManage`, the existing `event_registrations` fetch (line 166) gets joined to `lora_paired_devices` by `event_registration_id`. New column in the participants table:
- 🟢 Radio paired (shows last_seen within 10 min)
- 🟡 Paired but stale (>10 min since last_seen)
- ⚫ No radio

When organizer broadcasts a flag and selects a target car/group, a small badge under the confirm button shows "X of Y targets on radio" so they know whether the LoRa downlink actually matters for this group.

### 5. Update uplink edge function

`meshtastic-uplink/index.ts` already inserts crew messages by `senderId`. Extend it to:
- Look up `lora_paired_devices` by `meshtastic_node_id` (the radio's hex node id, sent in the bridge payload's `from` field)
- If found AND the row has an `event_registration_id`, attach that registration's `run_group_id` and `car_number` to the inserted `crew_messages` row (already supported — `position` field can carry `#42` and we can stash group context in `gap_ahead` or extend schema later)
- Drop messages from unknown nodes silently (security — only registered nodes get to write into `crew_messages`)

### 6. Update transport layer

`LoRaHardwareTransport` constructor already takes `eventId`. Extend `TransportContext` to optionally carry `registrationId`, and have `getCrewTransport()` look up the per-registration paired device first, falling back to the user's default device. This means a racer with two cars registered will automatically use the right radio when they open the live view for each car.

### 7. UX polish

- After scanning a radio in `RegistrationRadioPairing`, capture and store `meshtastic_node_id` (read from a Meshtastic `MyNodeInfo` packet on first connect — already accessible via the existing FROMRADIO notify subscription). This is what the organizer sees, and what the gateway uses to identify uplinks.
- Show the node id as `!a3b1c9d8` style alongside the BLE device name in both pairing UIs.

## Files touched

- `supabase/migrations/<ts>_lora_device_per_registration.sql` (new)
- `src/components/RegistrationRadioPairing.tsx` (new)
- `src/components/MyRegistrations.tsx` (mount the new component per row)
- `src/components/LoRaPairingCard.tsx` (clarify it's the "default" radio)
- `src/lib/transport/LoRaHardwareTransport.ts` (resolve per-registration device, capture node id from MyNodeInfo)
- `src/lib/transport/types.ts` + `index.ts` (add `registrationId` to context, update `getCrewTransport`)
- `src/lib/transport/meshtastic/protobuf.ts` (add minimal MyNodeInfo decoder)
- `src/pages/OrganizerLiveManage.tsx` (join paired devices into participants list, add radio status column + targeting badge)
- `supabase/functions/meshtastic-uplink/index.ts` (resolve sender node → registration → enrich crew_messages, reject unknown nodes)
- `src/integrations/supabase/types.ts` (auto-regenerated)

## Out of scope (call out so we don't scope-creep)

- Pairing a single radio to multiple registrations simultaneously (mutually exclusive by design — radios travel with the car, not the driver)
- Auto-claiming a node by QR code (deferred — manual BLE scan is fine for MVP)
- Organizer-side ability to remotely re-assign someone's radio (deferred — racers manage their own)

## Approval triggers next steps

Once approved I'll switch to default mode, run the migration, ship the new component + organizer column, and wire the per-registration transport resolution end-to-end.

