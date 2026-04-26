# Enable end-to-end LoRa flag receive test (no-cell scenario)

## Goal
Make it possible for an organizer to insert an `event_flag` and have a paired racer phone (cellular off, BLE only) display that flag — using the hardware you've already set up. Today the DB trigger, edge function, and racer-side receive code all exist, but the test can't run because there's no `lora_event_channels` row for any event and there's no UI to create one.

## What's already working (verified)
- ✅ `trg_broadcast_flag_to_lora` trigger on `event_flags` → calls `flag-downlink-broadcast` edge function via `pg_net`.
- ✅ `flag-downlink-broadcast` edge function signs the payload (HMAC) and POSTs to `lora_event_channels.gateway_url`.
- ✅ `RacerLiveView` subscribes to the hardware transport and, when a `t === "flag"` payload arrives over BLE, decodes it and renders it as a synthetic `lora-` flag with full visual treatment (yellow/red/black/blue/etc.).
- ✅ DB schema (`lora_event_channels`, `lora_paired_devices`) and RLS policies are in place.

## What's missing / broken for the test
1. **No `lora_event_channels` row exists** for any event (table is empty). Without it, the trigger silently no-ops.
2. **No UI for an organizer to register their gateway** (URL + channel name + HMAC secret) for an event.
3. **Flags require a public/organizer event.** RLS only lets organizers insert into `event_flags` for `public_events` they own. The personal "Lora test" event you're on right now (`/live-manage/20a4636a…`) can't be used to send organizer flags through the normal flow. We need to make sure the test runs against a public event you organize.
4. **Cosmetic bug:** `LoRaHardwareTransport.name` is hardcoded `"lora-sim"`. Fine functionally, but it makes hardware-vs-sim impossible to tell apart in logs and the Connectivity badge.

---

## Plan

### 1. Add a "LoRa Gateway Setup" card on `OrganizerLiveManage`
A new collapsible card (sits next to `PairedRadiosPanel`) for the organizer to configure the gateway for **this** event.

Fields:
- **Channel name** (string, required) — must match the channel configured on the RAK gateway / Mosquitto bridge.
- **Gateway URL** (URL, required) — the RAK7289v2 bridge endpoint that accepts the signed POST from `flag-downlink-broadcast`.
- **HMAC secret** (password input, required, masked once saved) — shared secret for signing. Provide a "Generate" button that produces a 32-byte hex string.

Behavior:
- Loads existing row from `lora_event_channels` for `event_id = current event's public_event_id`.
- Save = upsert (`organizer_user_id = auth.uid()`).
- Shows a small status pill: "Connected" / "Not configured".
- "Send test packet" button — fires the edge function directly with a synthetic payload and shows the gateway HTTP response status inline so you can confirm the round trip without needing serial logs.

Files:
- `src/components/LoRaGatewayConfigCard.tsx` (new)
- Slot it into `src/pages/OrganizerLiveManage.tsx` above `PairedRadiosPanel`.

### 2. Restrict the card to events that can use it
Only render the gateway card when the personal event has a `public_event_id` (i.e. the organizer is managing a real public event). For the personal "Lora test" event, show a small inline note: "LoRa downlink requires a published organizer event." This avoids the dead-end you'd hit on `20a4636a…`.

### 3. Fix `LoRaHardwareTransport.name`
Change the hardcoded `"lora-sim"` to a new `"lora-hw"` value:
- Add `"lora-hw"` to `TransportName` in `src/lib/transport/types.ts`.
- Update `LoRaHardwareTransport.name` and the `via` field on incoming/outgoing messages to `"lora-hw"`.
- Update `FailoverTransport.getActive()` and any UI badge logic (`LoraStatusIndicator`, `ConnectivityCheckPanel`) to treat `"lora-hw"` as "Radio (hardware)" and `"lora-sim"` as "Radio (sim)". Both still get the same icon/color, just different label.

### 4. Add a "LoRa Receive Test" button in `LoRaPairingCard`
A diagnostic button on the racer phone that:
- Confirms a paired device + `isHardwareEnabled()`.
- Connects via BLE and listens for any inbound `TEXT_MESSAGE_APP` packet for 30s.
- Shows the raw decoded payload in a toast/modal.
This lets you verify the BLE pipe end-to-end **before** trusting the full organizer→DB→edge→gateway→radio→phone path.

### 5. Documentation update
Append a "Live test checklist (no-cell)" section to `docs/hardware-setup.md` with the exact steps:
1. Pair phone radio in app, verify "Send Test" works (BLE up).
2. Organizer configures gateway URL + secret on the event via the new card.
3. Hit "Send test packet" — confirm 200 response from RAK bridge.
4. Put racer phone in airplane mode + re-enable BLE.
5. Organizer drops a yellow flag → racer phone shows yellow within ~3s.

### Out of scope
- Building the RAK bridge / Mosquitto config (already on your hardware per memory file).
- Encryption beyond the existing HMAC signing of downlink envelopes.
- Multi-channel / multi-gateway per event.
- Uplink test (msg/gap from racer back to crew) — separate concern; this plan only covers the flag downlink.

### Risk / fallback
If the RAK bridge isn't reachable from Supabase Edge (e.g., behind NAT with no public URL), the "Send test packet" button will surface that immediately as a non-200 response. Workaround would be to expose the bridge via a tunnel (Tailscale Funnel / ngrok / Cloudflare Tunnel) — noted in the docs update.