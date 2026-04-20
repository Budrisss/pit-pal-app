

## Remove the red track ribbon overlay

User wants the triple-layered red polyline removed from `LiveTrackMap.tsx` because the underlying `track_geojson` data is inaccurate for some tracks, causing the highlight ribbon to render in the wrong place / wrong shape and look broken.

### Change

In `src/components/LiveTrackMap.tsx`, delete the three `<Polyline>` layers (black halo / red core / white centerline) that draw the track ribbon. Keep everything else:

- Basemap `<LayersControl>` (Streets + Satellite)
- One-time auto-frame on track selection
- Live car markers
- `FitBounds` logic (still useful for initial framing if geometry exists)

The track will now just be visible via the actual map tiles (clearly visible on satellite, and labeled on streets). No fake overlay misleading the organizer.

### Files touched

- `src/components/LiveTrackMap.tsx` — remove the three `<Polyline>` elements that render the red ribbon

### Out of scope

- Fixing the underlying `track_geojson` data accuracy
- Replacing the ribbon with a different visual (pin, circle, etc.)
- Admin UI to edit track geometry

