

## Switch basemap to standard OpenStreetMap

User wants the "normal" map — the universally recognized OpenStreetMap look (beige land, blue water, full road labels) instead of the current CartoDB Voyager (which is a styled/muted variant).

### Change

In `src/components/LiveTrackMap.tsx`, swap the `<TileLayer>` from CartoDB Voyager to standard OpenStreetMap tiles:

- **URL**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Attribution**: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`

The triple-layered red track ribbon (black halo / red core / white centerline) stays as-is — it was already tuned for light basemaps, so it'll continue to pop on standard OSM.

### Files touched

- `src/components/LiveTrackMap.tsx` — update the single `<TileLayer>` url + attribution

### Out of scope

- Basemap toggle UI
- Track ribbon color changes

