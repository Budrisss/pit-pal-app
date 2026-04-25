## 3D Rotatable Live Track Map (Live Manage page)

### Goal
On the Live Manage page (and the fullscreen `/live-map/:eventId`), upgrade the embedded `LiveTrackMap` from flat Leaflet to a **3D, tiltable, rotatable** map so organizers can angle the track to fit the panel better, and apply a **custom dark style that makes the racetrack stand out** while keeping the rest of the map (roads, water, parking, buildings, labels) readable.

### Approach: switch the map engine to MapLibre GL JS

Leaflet is 2D-only — it cannot rotate or tilt. The cleanest, license-free path is **MapLibre GL JS** (open-source fork of Mapbox GL, no token required, vector tiles, full pitch + bearing support).

- Add deps: `maplibre-gl` and `react-map-gl` (the maplibre adapter — `react-map-gl/maplibre`)
- Keep all the existing logic (Supabase realtime fixes, run-group colors, follow-leader, fit-bounds, track picker) — only the rendering layer changes.

### What changes for the user

**On the map itself:**
- **Tilt (3D)**: the map renders with a default `pitch` of ~45° so the track has depth. A small control toggles between Flat (0°) and 3D (45°).
- **Rotate**: drag with right-click (desktop) or two-finger twist (touch) to rotate. A **compass button** appears next to the zoom controls — click it to snap back to north. The compass icon shows current bearing.
- **"Frame track" button** (replaces today's "Fit"): fits the track polyline AND auto-rotates the bearing so the track's longest axis runs horizontally across the panel — this is the "track fits better on the page" win. Computed via PCA / min-area bounding box on the polyline coords.

**Custom map style (the look):**
A handcrafted MapLibre style JSON (shipped in `src/lib/mapStyles/trackside-dark.ts`) using free vector tiles from a no-key provider. We have two solid options:

1. **OpenFreeMap** (`https://tiles.openfreemap.org/planet/...`) — completely free, no key, OpenMapTiles schema. Recommended.
2. Fallback: **MapTiler** with a key (only if OpenFreeMap is unreachable) — would require user-provided key, so we'll skip unless needed.

The style:
- **Base**: dark slate (`#0f172a`, matches our `--background`), water in muted teal (`#1e293b`).
- **Roads**: subtle gray hierarchy so they're visible but recede (motorways slightly brighter, residential dim).
- **Buildings**: extruded in 3D (using `fill-extrusion` with the `building` source layer) at low opacity — adds the 3D feel without clutter. Only shown at zoom ≥ 15.
- **Racetrack ribbon (the hero)**: any way tagged `highway=raceway` rendered as a **bright primary-red line** (`hsl(var(--f1-red))` baked in as `#ef4444`) with a **thick casing + glow** (two stacked line layers: 8px outer red @ 40% opacity, 4px inner red @ 100%). Visible at all zooms ≥ 12 so it's always the dominant feature.
- **Labels**: white text with subtle dark halo for readability on the dark base — towns, neighborhoods, and major road shields kept; minor POI labels hidden.
- **Parking / pit areas**: slightly lighter than base so paddock structure reads.

Result: track ribbons glow red against a muted dark city/satellite-like map. Other context (roads, water, buildings, labels) is fully present but visually subordinate.

**Satellite mode** stays available as a second style toggle (Esri World Imagery raster overlay rendered as a MapLibre raster source) for organizers who want imagery instead.

### Files

**New files:**
- `src/lib/mapStyles/trackside-dark.ts` — exports the MapLibre style JSON (vector style with the racetrack glow layers + 3D buildings)
- `src/lib/mapStyles/trackside-satellite.ts` — exports a raster style using Esri World Imagery + the same racetrack glow overlay drawn from our own track polyline (since raster imagery has no vector raceway data)
- `src/lib/geo/orientTrack.ts` — `computeBestBearing(coords)` returns the bearing (0–360) that orients the track's longest axis horizontally, plus the fitted bounds. Pure function, no deps.

**Edited:**
- `src/components/LiveTrackMap.tsx` — replace `MapContainer`/Leaflet primitives with `react-map-gl/maplibre` `<Map>`, `<Source>`, `<Layer>`, `<Marker>`. All existing data flow (fixes, participants, realtime, track loading, follow-leader, track picker) stays as-is. Markers use custom HTML (the same hex-clipped car number badges) via `<Marker>`. The track polyline becomes a GeoJSON source + two line layers (casing + line) for the glow effect — this is what makes the track visibly pop.
- `src/index.css` — remove the now-unused `.live-track-map .leaflet-*` rules; add `.maplibregl-ctrl-attrib` styling to keep attribution legible on dark; keep the `live-pulse-dot` keyframes (still used in overlays).
- `package.json` — adds `maplibre-gl` and `react-map-gl`.

**Removed (still referenced? double-check before deleting):**
- We keep `leaflet` + `react-leaflet` in deps for now — `LiveTrackMapFullscreen` reuses the same `<LiveTrackMap>` component, so nothing else uses Leaflet directly. Once the new component lands, Leaflet is unused. We'll leave it in `package.json` for one release in case of rollback, then remove later.

### New UI controls (in the existing race-control header strip)

Replaces today's "Fit" and "Follow" buttons with three:
- **Frame** (`Crosshair` icon) — fits + auto-orients track horizontally
- **3D / Flat** toggle (`Box` icon) — pitches between 0° and 45°
- **Follow** (`Target` icon) — unchanged behavior

Plus, overlaid on the map (bottom-right, near zoom controls):
- **Compass** button — shows current bearing as a rotated arrow; click to reset to north

### Behavior notes
- Default view on first load: `pitch: 45`, `bearing: <auto-oriented to track>`, fitted to track bounds with padding.
- "Frame" button re-runs the auto-orient calc (useful after the user has rotated manually).
- Rotation is **enabled** (we don't lock it) — users can freely drag-rotate; the compass shows them where north is.
- Markers (car badges, start/finish flag) stay screen-aligned (don't tilt with the ground) — this is the MapLibre default for `<Marker>` and matches what users expect from race telemetry overlays.
- Mobile: same gestures (two-finger rotate, two-finger drag-up to pitch). Touch-action handled by MapLibre.

### Out of scope (call out so expectations are clear)
- True 3D **terrain** (DEM hillshading) — possible later with `terrain-rgb` tiles; adds bandwidth and isn't needed for flat road-course tracks.
- 3D extruded **track barriers / pit lane geometry** — would need per-track hand-modeled data we don't have.
- Replacing the satellite layer with a 3D photogrammetry mesh (Google Tiles 3D / Cesium) — requires API keys, billing, and a much bigger refactor.
- Animating car heading as a tilted 3D arrow on the ground plane — current screen-aligned hex badge is more readable for race control.
