

## Live Track Map — GT3 paddock UI refresh

Make the map feel like a pro race-control screen: dark, focused on the track outline (not the surrounding terrain), with cleaner car markers.

### Visual direction

```text
┌─ LIVE TRACK MAP ─────────────────────── ● LIVE ──┐
│ CIRCUIT OF THE AMERICAS · 3.426 mi · 20 turns    │
│ ┌──────────────────────────────────────────────┐ │
│ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (dark bg) │ │
│ │       ╱──────╲                                │ │
│ │      ╱   ▲#27 ╲___                            │ │
│ │     │            ╲__                          │ │
│ │      ╲___  ▲#14    ╲                          │ │
│ │          ╲__________╱                         │ │
│ │   S/F ━━━━ (highlighted start/finish)         │ │
│ └──────────────────────────────────────────────┘ │
│ [Fit track] [Follow leader]   12 cars · 9 live   │
└──────────────────────────────────────────────────┘
```

### Key changes

**1. Dark "carbon" base map** — replace OpenStreetMap tiles with **CartoDB dark_nolabels** (free, no key, MIT-style attribution). Removes the noisy roads/terrain so the track outline is what your eye locks onto.

**2. Track outline overlay** — fetch the actual circuit shape from OpenStreetMap's Overpass API once per track:
- Query: `way["highway"="raceway"](around:1500, lat, lon)`
- Cache the resulting GeoJSON in `preset_tracks.track_geojson` (new nullable column) so we only hit Overpass once per track ever
- Render as a glowing red `<Polyline>` (4px, `hsl(var(--f1-red))`, 60% opacity halo + solid core)
- Auto-fit map to the polyline bounds on load (instead of relying on car positions)

**3. Start/finish marker** — small chequered icon at the first vertex of the track polyline (good-enough heuristic; manual override later if needed)

**4. Race-control header strip** — replace the current generic card header with a full-width strip showing:
- Track name + length + turn count (from `preset_tracks`)
- Pulsing red "● LIVE" indicator
- Car counts: total registered / currently transmitting

**5. Car marker refresh** — keep the number badge concept but tighten it:
- Smaller, octagonal-ish badge (matches motorsport timing screens)
- Heading arrow becomes a directional triangle attached to the badge edge (rotates around the badge, not floating above)
- Run-group color becomes a thin accent ring instead of the full fill (fill stays dark for contrast on dark map)
- Stale cars get a dashed ring instead of opacity fade (more legible)

**6. Map controls** — replace Leaflet's default +/− with custom dark-themed controls in the bottom-right; add a "Follow leader" toggle (locks view on the most-recently-updated car).

**7. Empty state** — when no fixes yet, show the track outline alone with overlay text "Awaiting first GPS fix from grid…" instead of the current generic message.

### Tech notes

- **Overpass query**: simple `fetch` from the client on first map load per track; results cached in DB so subsequent loads are instant
- **Tiles**: `https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png` — CartoDB Dark Matter, free, no auth
- **Bundle impact**: zero — all changes use existing Leaflet primitives
- No new dependencies

### Files touched

- `src/components/LiveTrackMap.tsx` — full visual rework (header strip, dark tiles, polyline overlay, new marker style, custom controls, empty state)
- `supabase/migrations/<new>.sql` — add `preset_tracks.track_geojson jsonb` column + helper RPC `upsert_track_geojson(track_id, geojson)` so client can cache results
- `src/index.css` — small additions for `.live-car-marker` styling + pulsing LIVE dot keyframe

### Out of scope

- Sector/mini-sector lines (needs manual track geometry)
- Pit lane outline (Overpass tag `highway=service` is too noisy without per-track curation)
- Custom track logos / corner numbers (per-track artwork — separate effort)
- Telemetry overlays (speed/throttle bars on each car)

