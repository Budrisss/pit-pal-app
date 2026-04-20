

## Live track position overlay using paired radios

The Meshtastic firmware on each T1000-E already broadcasts GPS position packets (it's literally what the T1000-E is built for — it's a tracker SKU). We're currently ignoring those packets in the BLE handler. We can capture them, persist the latest fix per registration, and render cars as moving dots on the organizer's track map.

### Architecture

```text
T1000-E (in car)
  ├─ POSITION_APP packet every 30s (built-in Meshtastic behavior)
  ↓ 915 MHz mesh
Bridge node → RAK → MQTT → meshtastic-uplink edge fn
  ↓
lora_position_fixes table (latest fix per node)
  ↓ Supabase realtime
OrganizerLiveManage → <LiveTrackMap /> overlay
```

Two delivery paths, same destination table:
1. **Uplink path** (car → bridge → RAK → edge fn) — when the car is out of BLE range of the driver's phone
2. **BLE path** (car → driver's phone over BLE → Supabase) — when the driver's phone is paired and nearby (paddock, pre-grid)

### Pieces to build

**1. Database** — new `lora_position_fixes` table
- `id`, `event_id`, `event_registration_id` (nullable), `meshtastic_node_id`, `user_id`
- `latitude`, `longitude`, `altitude_m`, `heading_deg`, `speed_mps`
- `fix_time` (from packet), `received_at` (server time)
- One row per fix (append-only, ~120 rows/car/hour — cheap)
- Realtime publication enabled
- RLS: organizer of the event can SELECT all, driver can SELECT own
- Index on `(event_id, received_at desc)` for "latest per car" queries

**2. Meshtastic protobuf decoder** — extend `src/lib/transport/meshtastic/protobuf.ts`
- Add `decodePositionPacket(buf)` that recognizes `POSITION_APP` portnum (3) and pulls lat/lon/alt/heading/speed from the standard Meshtastic Position message
- Hand-rolled, same minimal-protobuf style as the existing TEXT_MESSAGE decoder

**3. BLE transport** — `LoRaHardwareTransport.onIncoming()`
- After existing TEXT_MESSAGE_APP branch, try `decodePositionPacket()`
- On success, insert into `lora_position_fixes` for the current registration (use `ctx.eventId` + `ctx.registrationId`)
- Throttle: skip if last insert for this node was <10s ago (avoid hammering DB if fixes come in rapid succession)

**4. Edge function** — extend `meshtastic-uplink/index.ts`
- Bridge currently sends `text` field for TEXT messages; we need it to also forward `position` packets
- Add a new branch when `bridge.position` is present: insert into `lora_position_fixes` resolved against `lora_paired_devices` for `event_registration_id` enrichment
- Bridge script change is documented in `docs/hardware-setup.md` (Mosquitto Python script needs to subscribe to `position` topic too)

**5. UI — `<LiveTrackMap />` component** (new, `src/components/LiveTrackMap.tsx`)
- Mounted in `OrganizerLiveManage` in a new collapsible card "Live Track Map"
- Loads track centerline from `public_events.track_name` → `preset_tracks` (lat/lon for map center) — already in the schema
- Renders a Leaflet map (lightweight, ~40kb, no API key needed; tiles from OpenStreetMap)
- Subscribes to `lora_position_fixes` realtime for the event
- Maintains a `Map<registration_id, latestFix>` in state
- Renders one marker per car with:
  - Car number badge as the icon
  - Color tint based on run group
  - Heading arrow (rotated by `heading_deg`)
  - Tooltip on hover: car #, driver name, speed (mph), last fix age
- Stale fix handling: marker fades to 50% opacity after 30s without an update, hidden after 2min
- Auto-pan/zoom toggle: "Fit all cars" button + manual pan supported

**6. Driver-side toggle** (small UX addition)
- New checkbox in `RegistrationRadioPairing`: "Share my position with race control" (default on)
- When off, driver's phone stops forwarding BLE position packets to Supabase (still flows over LoRa uplink path though — privacy is "best effort", organizer can always see if a node is broadcasting)

### Tech choices

| Decision | Choice | Why |
|---|---|---|
| Map library | **Leaflet + react-leaflet** | Free, no API key, works offline-friendly, tiny bundle |
| Tiles | **OpenStreetMap** | Free, no key, good enough for race tracks |
| Storage | **Append-only table** | Simpler than upsert, lets us replay sessions later |
| Position cadence | **Whatever the radio sends** (~30s default) | Don't fight Meshtastic firmware defaults |
| Realtime channel | **Per-event filter** | One channel per OrganizerLiveManage page |

### Out of scope (future iterations)

- Lap timing / sector splits (would need track geometry definitions)
- Position playback/scrub bar for post-event review
- Driver Live View showing other cars (only organizer for now — privacy + complexity)
- Pit lane detection
- Speed-based incident alerts (e.g., car stopped on track)
- Native iOS background-mode position relay (Capacitor BLE in background is finicky; v1 assumes phone is awake or LoRa uplink path is active)

### Files touched

- `supabase/migrations/<new>.sql` — `lora_position_fixes` table + RLS + realtime
- `src/lib/transport/meshtastic/protobuf.ts` — add `decodePositionPacket`
- `src/lib/transport/LoRaHardwareTransport.ts` — handle position packets, write to DB
- `supabase/functions/meshtastic-uplink/index.ts` — handle position uplinks
- `src/components/LiveTrackMap.tsx` — new component
- `src/components/RegistrationRadioPairing.tsx` — add "share position" toggle
- `src/pages/OrganizerLiveManage.tsx` — mount `<LiveTrackMap />`
- `docs/hardware-setup.md` — bridge script update for position topic
- `package.json` — add `leaflet` + `react-leaflet`

