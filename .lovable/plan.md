# Pairing UX overhaul: discoverable, organizer-assisted, friendly labels, racer-only filtering

## The current state (so we're aligned)

You already have a working two-tier pairing model:

- **Global pairing** (`LoRaPairingCard` on Settings) — "this radio belongs to my phone"
- **Per-registration pairing** (`RegistrationRadioPairing` inside each row of My Registrations) — "this radio = Car #24 at this event"
- **Organizer dashboard** (`PairedRadiosPanel` on `OrganizerLiveManage`) — joins everything and shows `Run Group → Car # → Driver → 🟢/🟡/⚫ → node ID`

The mapping "Radio = Car #24" is done via a row in `lora_paired_devices` keyed on `(user_id, event_registration_id)` and the radio's permanent Meshtastic hex node ID (e.g. `!a3b1c9d8`).

You picked four problems to fix. Here's the plan for each.

---

## 1. Drivers can't find where to pair

### Add a prominent "Pair Radio" entry point in three high-visibility places:

- **Dashboard banner**: If the user has any registration for an event happening **today or in the next 3 days** AND no `lora_paired_devices` row for that registration, show a dismissable yellow banner: *"Pair your radio for [Event Name] →"* that scrolls to / highlights the registration card.
- **My Registrations card**: When unpaired, replace the small "Assign Radio" button with a more obvious full-width primary-tinted button: **"📡 Pair Radio for Car #24"** (uses car number when available). Add a one-line helper: *"Race control sees your radio status live."*
- **Driver Live View** (`RacerLiveView`): If the driver is on the live view but has no radio paired for this registration, show a top-of-page slim alert with a "Pair now" button that opens the same BLE flow inline.

### Add a "Pairing" section to Settings:
A new card on Settings grouping both:
- **Default radio** (existing `LoRaPairingCard`)
- A list of **Per-event pairings** (read-only summary: event name + car # + node ID + unpair button) so users have one place to audit/manage all pairings.

---

## 2. Organizer needs to pair on driver's behalf (loaner radios)

### New "Assign Radio" action on `PairedRadiosPanel`

For each row in the organizer's paired radios panel, add a small `+ Assign` button (visible only when that registration has no paired radio). It opens a dialog:

```text
Assign Radio to Car #24 — John Smith
─────────────────────────────────────
[ ○ Scan nearby radio (BLE)  ]   ← native only
[ ○ Enter node ID manually   ]
   Node ID: [ !__________ ]
[ Cancel ]   [ Assign ]
```

- **BLE path** (Capacitor only): organizer's phone scans, picks the loaner radio, app captures node ID, writes the `lora_paired_devices` row with the **driver's** `user_id` and the registration's `event_registration_id`.
- **Manual path** (works on desktop too): organizer types/pastes the node ID printed on the loaner radio's case label. We just write the row directly — no BLE connection needed since the radio will phone home via the gateway anyway.

### RLS change required

Currently `lora_paired_devices` policy is `auth.uid() = user_id` only. We need to allow the **event organizer** to INSERT/DELETE rows where `event_registration_id` belongs to one of their events. New policy:

```sql
CREATE POLICY "Organizers can manage paired devices for their events"
ON public.lora_paired_devices
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    JOIN public.public_events pe ON pe.id = er.event_id
    JOIN public.organizer_profiles op ON op.id = pe.organizer_id
    WHERE er.id = lora_paired_devices.event_registration_id
      AND op.user_id = auth.uid()
      AND op.approved = true
  )
)
WITH CHECK (...same...);
```

---

## 3. Friendly "Radio #" labels (not hex IDs)

### Add a `radio_label` column to `lora_paired_devices`

Migration:
```sql
ALTER TABLE public.lora_paired_devices
  ADD COLUMN radio_label text;
```

### Auto-assign on pair
When a new radio is paired for an event, compute the next available label: count existing paired devices for that event's registrations and assign `Radio 1`, `Radio 2`, etc. The driver/organizer can rename inline (small pencil icon on the panel row).

### Display rules
- `PairedRadiosPanel`: show `Radio 3` as the primary label, hex node ID demoted to small monospace muted subtitle.
- `RegistrationRadioPairing` card: show `Radio 3 · !a3b1c9d8` once paired.
- Driver-facing copy: always "Radio 3", never hex.

---

## 4. Only show racer radios, not random radios at the track

This is the most important one — it solves discovery clutter and security.

### Two complementary filters:

**Filter A — BLE scan name prefix (already partially in place)**
The current code uses `namePrefix: "Meshtastic"`, which still matches every Meshtastic node within ~30m at a track. Tighten this with **a configurable, per-event device name convention**:

- Organizer sets a **Radio Name Prefix** in `LoRaGatewayConfigCard` (e.g. `TSO-` for "Track Side Ops") — store on `lora_event_channels.radio_name_prefix`.
- The provisioning instructions in `docs/hardware-setup.md` tell organizers to flash/rename their loaner radios to `TSO-001`, `TSO-002`, etc. (Meshtastic supports custom long names via the Meshtastic app or CLI).
- The `RegistrationRadioPairing` and organizer "Assign Radio" dialogs read this prefix from the active event and pass it to `BleClient.requestDevice({ namePrefix })`. Result: the OS picker only lists radios that match the convention.

**Filter B — Allowlist of known node IDs per event**
Add a `lora_event_radio_allowlist` table:
```sql
CREATE TABLE public.lora_event_radio_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  meshtastic_node_id text NOT NULL,
  label text,
  notes text,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, meshtastic_node_id)
);
```
- Organizer pre-loads the node IDs of the radios they're bringing (one paste box on the gateway config card: "Allowed radios for this event").
- During pairing, after the BLE scan returns a device, we read its node ID and **reject the pair if it's not on the allowlist** with a clear toast: *"This radio isn't registered for this event. Ask the organizer to add node !xxx."*
- The `meshtastic-uplink` edge function gains an allowlist check too: packets from non-allowlisted nodes are dropped (defense in depth — prevents any random Meshtastic user near the track from polluting `crew_messages` or `lora_position_fixes`).

### UX summary for the organizer

On `LoRaGatewayConfigCard` (already collapsible on `OrganizerLiveManage`), add a new sub-section: **"Authorized Radios for this Event"** with:
- Textarea/list of node IDs (one per line) + optional label
- Bulk import from CSV
- "Auto-add when a driver pairs" toggle (default: off — strict mode)

---

## Technical implementation notes

**Files to add**
- `src/components/PairRadioForRegistrationDialog.tsx` — shared dialog used by both driver pair flow and organizer-on-behalf flow (BLE + manual node ID modes)
- `src/components/PairingNudgeBanner.tsx` — Dashboard/Live View banner
- `src/components/EventRadioAllowlistCard.tsx` — lives inside `LoRaGatewayConfigCard`

**Files to modify**
- `src/components/RegistrationRadioPairing.tsx` — bigger primary CTA, reads event prefix + allowlist
- `src/components/PairedRadiosPanel.tsx` — show `radio_label`, add per-row Assign button, inline rename
- `src/components/LoRaPairingCard.tsx` (Settings) — add per-event pairings summary
- `src/pages/Dashboard.tsx` — mount `PairingNudgeBanner`
- `src/pages/RacerLiveView.tsx` — slim "Pair now" alert when unpaired
- `src/pages/OrganizerLiveManage.tsx` — wire allowlist UI under gateway config
- `supabase/functions/meshtastic-uplink/index.ts` — drop packets from non-allowlisted nodes
- `docs/hardware-setup.md` — update with naming convention + allowlist workflow

**DB migrations**
1. `ALTER TABLE lora_paired_devices ADD COLUMN radio_label text;`
2. `ALTER TABLE lora_event_channels ADD COLUMN radio_name_prefix text DEFAULT 'TSO-';`
3. `CREATE TABLE lora_event_radio_allowlist (...)` with RLS: organizers manage own, racers can SELECT for events they're registered to (so the pair dialog can validate client-side before BLE).
4. New RLS policy on `lora_paired_devices` allowing organizers to manage rows for their events' registrations.

**No breaking changes** to the transport layer or wire format — all changes are at the pairing/management layer.

---

## What you'll see when this ships

- **Driver**: opens app the day before the event → yellow banner "Pair your radio for Saturday Practice →" → tap → BLE picker shows only `TSO-xxx` radios → pick → toast "Paired as Radio 4 for Car #24". Done.
- **Organizer**: at check-in hands a loaner to a driver who can't pair themselves → opens Live Manage → finds the row → taps "+ Assign" → scans or types `!a3b1c9d8` → that row turns green within 30s of the radio powering on.
- **Race control panel**: instead of `#24 — John Smith — !a3b1c9d8` it now reads `Radio 4 · #24 — John Smith` with the hex as a small subtitle. No mystery radios from track passersby ever appear.
