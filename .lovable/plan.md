

## Connectivity Check panel on OrganizerLiveManage

A compact status panel pinned near the top of `/live-manage/:eventId` that gives race control a one-glance read on whether they're operating on the resilient stack.

### What it shows

```text
┌─ Connectivity Check ──────────────────────────────────────┐
│                                                            │
│  Uplink         🟢 WiFi              (Starlink detected)   │
│  Supabase       🟢 42ms              last check: just now  │
│  Bridge node    🟢 Online            last beacon: 12s ago  │
│  LoRa channel   🟢 Configured        ch: trackside-prod    │
│                                                            │
│  [Run check now]                                           │
└────────────────────────────────────────────────────────────┘
```

Four rows, each with a colored dot, a label, a value, and a freshness hint.

### Row details

1. **Uplink type** — derived client-side from `navigator.connection` (NetworkInformation API) + heuristics:
   - `effectiveType` (`4g` / `3g` / `2g` / `slow-2g`) → cellular labels
   - `type` (`wifi` / `cellular` / `ethernet`) when available
   - "Starlink detected" hint when reverse DNS / public IP suggests Starlink (best-effort via a lightweight check against `https://api.ipify.org` + a known Starlink ASN range — soft hint only, not relied on)
   - Fallback: "Online" / "Offline" from `navigator.onLine`
   - Status dot: 🟢 WiFi/ethernet/4g, 🟡 3g, 🔴 2g/offline

2. **Supabase latency** — every 30s, time a tiny `select 1` round-trip via `supabase.from('events').select('id').eq('id', eventId).maybeSingle()` (cached row, cheap). Shows ms.
   - 🟢 < 200ms · 🟡 200-800ms · 🔴 > 800ms or error

3. **Bridge node status** — query `lora_event_channels` for this event. If a channel is configured, look at the most recent `lora_paired_devices.last_seen_at` across all devices on this event as a proxy for "is anything reaching the bridge". Show:
   - 🟢 Online — any device seen in last 5 min
   - 🟡 Stale — last seen 5-30 min ago
   - 🔴 Silent — no device seen in 30+ min OR no channel configured
   - ⚫ Not configured — no `lora_event_channels` row (LoRa not in use for this event)

4. **LoRa channel** — green if `lora_event_channels` row exists with `gateway_url`, gray "not configured" otherwise. Just shows the channel name as a sanity check.

### Behavior

- Auto-refresh every 30s (matches existing OrganizerLiveManage cadence)
- Manual "Run check now" button for on-demand verification
- Collapsible — defaults open, organizer can collapse to a single-line summary like `Connectivity 🟢 all systems`
- All four rows degrade gracefully if a check fails — never breaks the page

### Files to touch

- `src/components/ConnectivityCheckPanel.tsx` (new) — self-contained component, takes `eventId` as prop, runs all four checks internally
- `src/pages/OrganizerLiveManage.tsx` — mount `<ConnectivityCheckPanel eventId={eventId} />` near the top of the page, above the Paired Radios panel

### Out of scope

- True Starlink confirmation (would require an extra edge function doing ASN lookup — not worth it; the soft hint is enough)
- Historical latency graph (just current value)
- Push alerts when status degrades (organizer is staring at the screen anyway)
- Re-pinging individual radios from this panel (separate feature)

