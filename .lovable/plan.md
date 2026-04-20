

## Revert to colored map + highlight track ribbon

User wants to drop the dark race-control basemap and go back to a standard colored map (like CartoDB Voyager / OSM-style), but still make the track itself stand out as a clearly highlighted ribbon — not buried in the surrounding roads.

### Approach

**1. Swap basemap back to colored**
In `src/components/LiveTrackMap.tsx`, change the `<TileLayer>` URL from CartoDB Dark Matter back to CartoDB **Voyager** (colored, clean, with subtle labels — better than raw OSM for racing context). Update the attribution accordingly.

**2. Keep + tune the track polyline so it pops on a light background**
The current 3-layer polyline (white halo / white core / red centerline) was designed for dark tiles. On a colored map, white disappears against light roads. Re-tune to:

- **Outer halo**: solid black, weight 12, 35% opacity — creates a dark "shadow" outline that separates the track from surrounding roads regardless of basemap color
- **Middle core**: bright racing red (`hsl(0 91% 59%)` — our `--f1-red`), weight 6, full opacity — this is the highlighted track ribbon
- **Inner accent**: white, weight 1.5 — thin centerline that reads as a racing line and adds crispness

This gives a "highlighter marker" effect: dark edge + bold red fill + white centerline. The track will read instantly even on a busy colored map.

**3. Small CSS tweak**
Update the `.live-track-map .leaflet-container` background in `src/index.css` from the dark `hsl(220 13% 6%)` to a neutral light fallback (or just remove the override) so tile-loading flashes look right.

Attribution + zoom-control styling in `src/index.css` can stay (they're subtle enough to work over either basemap).

### Files touched

- `src/components/LiveTrackMap.tsx` — change `TileLayer` url/attribution; update the 3 `<Polyline>` `pathOptions` colors/weights
- `src/index.css` — adjust `.live-track-map .leaflet-container` background + attribution contrast for a light basemap

### Out of scope

- A user toggle between dark/colored basemaps (can add later if wanted)
- Per-track custom color schemes
- Animated "racing line" pulse along the track

