
# Path 3: In-App LoRa Channel Provisioning

Let drivers re-use one T1000-E radio across multiple organizers. When a driver pairs a radio to an event, the app reads the organizer's channel config from the database and writes it to the radio over BLE. No bench access, no Meshtastic app, no QR scanning.

Per the decisions: **per-organizer channels**, **app-generated PSK**, **overwrite slot 0 each time**, **region stays pre-flashed**.

---

## What gets built

### 1. Database changes

**New table: `lora_organizer_channels`**
- `id`, `organizer_profile_id` (unique), `channel_name` (e.g. `TSO-NJORG-A1B2`), `psk_base64` (32-byte key, app-generated), `created_at`, `updated_at`, `rotated_at`.
- RLS: organizer manages own row; registered racers can SELECT the row of any organizer whose event they're registered for (so the driver app can read what to provision).

**Modify `lora_event_channels`**
- Add nullable `organizer_channel_id` FK. When set, the event inherits the organizer's channel/PSK and the existing `channel_name`/`hmac_secret` are ignored for radio provisioning (HMAC stays for the gateway→edge function bridge, that's a separate concern).

**Auto-provision row on organizer approval**
- Trigger on `organizer_profiles` AFTER UPDATE: when `approved` flips to true, insert a `lora_organizer_channels` row with a generated channel name and random 32-byte PSK.

### 2. Meshtastic protobuf encoder

Extend `src/lib/transport/meshtastic/protobuf.ts`:
- Add `AdminMessage` encoder (portnum 6) with a `SetChannel` payload.
- Add `Channel` + `ChannelSettings` message encoders (slot index, name, PSK bytes, role=PRIMARY).
- Add a `WantConfigId` request + response decoder so we can read the radio's current channel slot 0 to compare before writing.
- Add a "save config" admin commit message so writes persist across reboot.

### 3. Transport layer

In `src/lib/transport/LoRaHardwareTransport.ts`, add:
- `readChannelSlot0(): Promise<{ name: string; pskBase64: string } | null>` — sends WantConfig, waits for the channel response, returns parsed slot 0.
- `provisionChannel(name: string, pskBase64: string): Promise<void>` — writes slot 0, commits, verifies by re-reading. Throws on mismatch.
- `resetToDefaultChannel(): Promise<void>` — writes a hardcoded `TSO-Public` channel with no PSK. Used for recovery.

### 4. Pairing UI changes

In `AssignRadioDialog.tsx` (used by both global pairing and per-event pairing):
- After "Scan & Connect" reads the node ID, add a **"Configure Channel"** step.
- Fetch the event → public_event → organizer → `lora_organizer_channels` row.
- Show: "This event uses **NJ Track Org**'s private channel. Your radio will be reconfigured."
- Read current slot 0 from radio. If it already matches, skip the write and show "Already configured ✓".
- If it doesn't match, write + verify. Show progress: `Reading → Writing → Verifying → Done`.
- On failure, show "Provisioning failed" with a **Retry** and a **Reset to Default Channel** button.

In `LoRaPairingCard.tsx` (Settings):
- Add a small "Reset Radio Channel" recovery button (collapsed under an "Advanced" toggle) that calls `resetToDefaultChannel()`. Useful if a radio gets stuck.

### 5. Organizer-facing UI

New `OrganizerChannelCard.tsx` mounted on `OrganizerLiveManage` (replaces or sits next to `LoRaGatewayConfigCard`):
- Shows the organizer's channel name (read-only).
- Shows masked PSK with a "Reveal" toggle and a "Rotate Key" button (regenerates PSK; warns that all paired radios will need to re-provision).
- Copy-to-clipboard for both, in case the organizer wants to manually configure a radio outside the app.

### 6. Region safety guard

Region stays pre-flashed at your bench. To prevent accidents:
- Before any `provisionChannel()` call, do a region read via `WantConfig`. If the region is `UNSET` or doesn't match the organizer's expected region (new `lora_organizer_channels.expected_region` column, default `US`), abort with a clear message: "This radio's region (EU868) doesn't match this organizer's region (US915). Contact your organizer."

---

## Technical details

### Wire-level flow (per pairing)
```text
App                          Radio (T1000-E)
 |---- WantConfigId(rand) -->|
 |<-- ChannelInfo(slot 0) ---|
 |<-- ConfigComplete ---------|
 |  (compare to target)
 |---- AdminMessage:SetChannel(slot 0, name, psk) -->|
 |---- AdminMessage:CommitEditSettings ------------->|
 |---- WantConfigId(rand2) ------------------------->|
 |<-- ChannelInfo(slot 0, new values) --------------|
 |  (verify match → success)
```

### PSK format
- 32 random bytes (PSK256), generated client-side in the trigger via `gen_random_bytes(32)` and base64-encoded for storage. On the BLE write, decode to raw bytes and stuff into `ChannelSettings.psk`.

### Files touched
- New: `supabase/migrations/<ts>_organizer_channels.sql`
- New: `src/components/OrganizerChannelCard.tsx`
- Modified: `src/lib/transport/meshtastic/protobuf.ts` (~+250 lines for AdminMessage + Channel encoders/decoders)
- Modified: `src/lib/transport/LoRaHardwareTransport.ts` (~+150 lines for read/provision/reset methods)
- Modified: `src/components/AssignRadioDialog.tsx` (Configure Channel step + retry/reset UI)
- Modified: `src/components/LoRaPairingCard.tsx` (advanced reset button)
- Modified: `src/pages/OrganizerLiveManage.tsx` (mount OrganizerChannelCard)
- Modified: `docs/hardware-setup.md` (document the new flow)

### Out of scope (intentionally)
- Multi-slot support (Option B from the discussion) — slot 0 only for now.
- Per-event channels — every event uses the organizer's channel.
- Region pushing — pre-flash only.
- Web fallback — provisioning is BLE-only, gated by `isHardwareCapable()`. Web users still get manual node-ID entry but no channel write.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| BLE write fails mid-flow, radio in bad state | Verify-after-write step + "Reset to Default" button always available |
| Organizer rotates key while drivers are at the track | Show banner in `RegistrationRadioPairing`: "Channel updated, re-pair your radio" — driver re-runs Configure step |
| Driver's radio is on wrong region | Region guard aborts before any write, with clear error |
| Protobuf encoder bug bricks slot 0 | Reset-to-Default uses hardcoded known-good values; worst case driver pairs to Meshtastic app and resets |
| Two organizers pick the same channel name by coincidence | Channel names auto-generated as `TSO-<orgSlug>-<4hexchars>`, uniqueness enforced by table constraint |

---

## Memory updates after build

Update `mem://features/lora-hardware.md` to document:
- `lora_organizer_channels` table and per-organizer channel model
- AdminMessage protobuf support
- Slot-0-overwrite provisioning model
- Region-pre-flash policy
