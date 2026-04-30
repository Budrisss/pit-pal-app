## Goal

Extend `TrackSideOps_Median_Hardware_Spec.pdf` (currently one page) with a **second page** documenting exactly what's inside the radio packets, so Median.co has hardware spec + data spec in a single PDF.

## Approach

Regenerate the PDF using ReportLab (same toolchain as v1) with two pages:

- **Page 1** — unchanged hardware spec (T1000-E + Solar Repeater + WisGate Edge Pro, BLE GATT profile, permissions, data flow).
- **Page 2 (new)** — "Data On The Wire" reference.

Output to `/mnt/documents/TrackSideOps_Median_Hardware_Spec_v2.pdf` (versioned per artifact iteration rule, keeps original intact).

## Page 2 contents

1. **Two-layer model** — outer Meshtastic protobuf envelope wraps inner app payload (JSON for our traffic, protobuf for GPS/nodeinfo).
2. **Outer envelope (MeshPacket)** — fields actually emitted by our encoder (`src/lib/transport/meshtastic/protobuf.ts`): `from`, `to` (broadcast `0xFFFFFFFF`), `channel`, `hop_limit` (3), `want_ack`, `Data { portnum, payload }`. Note portnums used: `TEXT_MESSAGE_APP=1` (our JSON), `POSITION_APP=3` (GPS), `NODEINFO_APP` (identity beacons from firmware).
3. **Inner app payload — JSON LoRaPayload** (from `src/lib/transport/types.ts` + `encoder.ts`):
   - Schema: `{ t, v, ts, f }` — type, value, unix-ms timestamp, sender id (8-char hex).
   - Type discriminator `t`: `gap`, `msg`, `pos`, `flag`, `ack`.
   - Example packets for each type (gap delta, crew text "Pit now", flag "yellow", ack).
   - **222-byte hard cap** (LoRaWAN SF7 US915 ceiling) enforced in encoder.
4. **Position packets (POSITION_APP)** — decoded fields: lat/lon (1e-7 deg sfixed32), altitude (m), GPS fix time, ground speed (m/s), heading (deg). Throttled to 1 fix / 10 s.
5. **NodeInfo / MyNodeInfo** — radio identity beacon emitted by firmware on connect; we extract the 8-char hex node id (`!a3b1c9d8`) used for pairing/allowlist.
6. **What is NOT in packets** — no audio, no images, no PII (no names/emails/phones), no auth tokens. Sender id is a hex radio id, not a user id.
7. **Authenticity / integrity** — gateway-side HMAC-SHA256 signing on the MQTT→backend hop (`X-Signature` header to `meshtastic-uplink` edge function); per-event channel allowlist drops unknown nodes.
8. **Size budget table** — typical bytes per packet type (gap ~30B, msg ~50–80B, flag ~35B, position ~25B protobuf), all well under 222B cap.

## Technical details

- Reuse the v1 ReportLab script structure (Platypus flowables, same fonts/colors/branding from prior page).
- Insert a `PageBreak()` after page 1 content, then add page 2 flowables (heading, intro paragraph, sub-sections with `Preformatted` blocks for JSON/protobuf examples in a monospace font, a small table for the size budget).
- Keep monospace JSON examples narrow enough to fit 1" margins on US Letter.
- After generation, run mandatory PDF QA: `pdftoppm -jpeg -r 150` and visually inspect both pages for overflow, clipped code blocks, font issues. Fix and re-render if needed.
- Emit `<lov-artifact>` for the new v2 PDF.

## Out of scope

- No code changes to the app.
- No edits to the existing v1 PDF (kept as baseline per artifact versioning rule).
