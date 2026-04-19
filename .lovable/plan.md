

## Architecture: Meshtastic mesh + RAK7289v2 as MQTT bridge

Real load is ~40-50 active radio nodes (one run group on-track + crew + race control). The other 150 users stay on cell from the paddock. Meshtastic mesh handles this scale natively — no LoRaWAN/ChirpStack complexity needed. The RAK7289v2 earns its keep as a high-elevation Linux host running an MQTT broker with great RF hardware and reliable backhaul.

```text
Phone (Capacitor) ──BLE──▶ T1000-E (Meshtastic) ──RF mesh──▶ RAK7289v2 ──MQTT/HTTPS──▶ Edge function ──▶ Supabase
```

## What gets built

**App side (works the moment hardware arrives):**
1. `src/lib/transport/LoRaHardwareTransport.ts` — implements existing `Transport` interface, talks to T1000-E over BLE GATT (Meshtastic service UUIDs), encodes/decodes minimal Meshtastic protobuf wrapping our existing JSON payload
2. `src/lib/transport/meshtastic/protobuf.ts` — hand-rolled minimal `MeshPacket` + `Data` encoder for `TEXT_MESSAGE_APP` portnum (avoids 200KB of full Meshtastic protobufs)
3. `src/lib/transport/index.ts` — extend `getCrewTransport()` to pick hardware leg when `lora_hardware_enabled` flag is on AND a paired device is present; sim stays for dev
4. `src/components/LoRaPairingCard.tsx` — Settings card: scan for `Meshtastic_xxxx` BLE devices, pair, show connection/battery/RSSI status, "send test packet" button
5. `src/pages/Settings.tsx` — mount the new pairing card (only show if Capacitor native, hide on web)
6. `src/pages/AdminLoraSim.tsx` — add "Hardware mode" toggle next to existing sim toggle

**Backend (gateway-side ingest):**
7. New table `lora_event_channels` (event_id, meshtastic_channel_name, hmac_secret) — maps a Meshtastic channel to an event so the edge function knows where to route uplinks
8. Edge function `meshtastic-uplink` — receives HMAC-signed POSTs from the RAK's MQTT-bridge script, decodes payload, looks up event_id by channel, inserts into `crew_messages` or `event_flags`
9. Edge function `meshtastic-downlink` — when organizer sends a flag and any subscriber is on hardware fallback, posts to RAK's MQTT broker so the gateway transmits the packet to the mesh

**Capacitor + deps:**
10. Add `@capacitor-community/bluetooth-le` + iOS/Android BLE permissions to `capacitor.config.ts` and platform configs
11. iOS background-mode declaration so BLE survives short app backgrounding (~30s)

**Documentation (lives in repo for race-day setup):**
12. `docs/hardware-setup.md` — T1000-E flashing steps (Meshtastic web flasher), per-event channel config (name = event slug, generate PSK), RAK7289v2 setup (install Mosquitto package, run our 30-line Python MQTT→HTTPS bridge script, register HMAC secret), antenna placement guidance, on-track verification checklist

## Why this fits your reality

- **Paddock users untouched.** They never pair a node, they stay on cell, zero overhead.
- **Active racers/crew on hardware** only when their cell drops — `FailoverTransport` already does this; we're just swapping the fallback leg from sim to real.
- **One gateway covers most tracks.** Properly placed RAK at race control with 8dBi antenna handles 1-3 mile radius. Mountain/multi-loop courses can add a relay node at the far paddock or hot pit later.
- **Scales up cleanly later.** If you ever hit Meshtastic's mesh ceiling (~80 nodes), the same `LoRaHardwareTransport` interface stays — only the back end swaps to LoRaWAN+ChirpStack. App code unchanged.

## Honest gotchas

- iOS BLE backgrounding will disconnect after ~30s — racers need the app foregrounded to receive flags reliably. Acceptable: most racers have the app open on track.
- Each user pairs to *their own* node clipped to belt/helmet/dash. BLE range is ~10m.
- Meshtastic mesh latency: 1-3s per hop, typically 1-2 hops at a track. Fine for flags, marginal for tight gap data.
- The RAK7289v2's factory firmware supports user packages (Mosquitto, Python). The MQTT-bridge script runs as a systemd service. Setup is ~30 minutes per gateway, one-time.

## Out of scope for this plan (intentional)

- ChirpStack / LoRaWAN provisioning — not needed at this load
- Multicast downlink groups — Meshtastic broadcasts on the channel naturally
- DevEUI claim flow — Meshtastic uses channel PSK, no per-device keys
- Class A/C battery management — Meshtastic handles power modes itself

## Approval triggers next steps

Once approved, I'll switch to default mode and build steps 1-11 (app + backend). Step 12 (hardware doc) gets drafted in the same pass so it's ready before your first node arrives.

