

## Disable auto-recenter + add satellite layer toggle

Two changes to `src/components/LiveTrackMap.tsx`:

### 1. Stop the map from auto-moving

Currently `RecenterOnTrack` calls `map.setView` whenever the selected track changes, and `FitBounds` re-fits when track geometry loads. Both fight the organizer when they pan/zoom.

Fix: only auto-frame **once per track selection**, then leave the map alone.
- Track the last "framed" trackId in a ref
- `RecenterOnTrack` and `FitBounds` both early-return if `trackId === lastFramedRef.current`
- Update the ref after the initial frame

This means: pick a track → map snaps + fits once → organizer can pan/zoom freely → map never jumps again until they pick a different track.

### 2. Add detailed satellite view toggle

Use Leaflet's `<LayersControl>` with two `BaseLayer`s:
- **Streets**: current OSM tiles (default)
- **Satellite**: Esri World Imagery — `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` — high-resolution aerial up to ~zoom 19, free, no API key. Attribution: `Tiles &copy; Esri`.

Leaflet renders a small layers icon top-right that flips between the two. The red track ribbon stays on top of either basemap (already pops on both light streets and dark satellite).

### Files touched

- `src/components/LiveTrackMap.tsx` — add `lastFramedRef` gate in `RecenterOnTrack` + `FitBounds`; replace single `<TileLayer>` with `<LayersControl>` containing Streets + Satellite base layers

### Out of scope

- A "recenter to track" button (can add later if organizers ask)
- Hybrid satellite-with-labels layer

