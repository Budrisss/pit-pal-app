

## Track visibility + track picker

Two tweaks to the Live Track Map:

### 1. Make the track surface white

The CartoDB Dark Matter tiles render highways/raceways in near-black, which hides the actual asphalt. Two layered changes:

- **Switch base tiles** from `dark_nolabels` → `dark_all` is still too dark. Instead, keep `dark_nolabels` for the surroundings but **bump the track polyline** we draw from Overpass:
  - Halo: white at 40% opacity, weight 14 (soft glow under the track)
  - Core: solid white (`#ffffff`), weight 5
  - Red accent: thin 1px red centerline on top so it still reads as "race line"
- This way the track itself looks like a bright ribbon of asphalt against the dark surroundings — much closer to a broadcast graphic.

### 2. Track picker dropdown

Add a `<Select>` in the race-control header strip (next to "Fit" / "Follow") that lists all `preset_tracks` and, on selection, re-centers the map on that track and loads its outline. Useful when:
- The event's track auto-resolution failed
- An organizer wants to preview another circuit before an event
- Testing the map without live data

Behavior:
- Defaults to the event's resolved track (current behavior)
- Selecting a different track:
  - Re-runs the Overpass fetch (or uses cached `track_geojson`)
  - Re-centers + re-fits the map
  - Does NOT change anything in the database — purely a view override
- A small "Reset to event track" link appears when the user has overridden the selection

### Files touched

- `src/components/LiveTrackMap.tsx` — white track polyline styling + new `<Select>` dropdown wired to a local `selectedTrackId` state, refactor track-load effect to key off that id
- No DB or migration changes needed (preset_tracks already has everything)

### Out of scope

- Editing/adding tracks from this dropdown (Garage already handles track CRUD)
- Persisting the override across reloads
- Showing only tracks the organizer has used before (full list is fine for v1)

