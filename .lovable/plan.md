

## NJMP Lightning + wrong-track diagnosis

The user reports the searchable track picker can't find "NJMP Lightning", and some other tracks render in the wrong place. Both issues live in `preset_tracks` data, not the UI.

From the session replay I can see when they typed "njmp" the picker DID show three matches: "NJMP - Lightning", "NJMP - Thunderbolt", and "New Jersey Motorsports Park". So the row exists — but the user said "Lightning" doesn't come up. Two possibilities:

1. They typed "NJMP lightning" (with a space, no dash) and `cmdk`'s default fuzzy matcher isn't catching it because the stored name uses " - " as separator.
2. The lat/lon for NJMP Lightning (and possibly other tracks) points to the wrong physical location, so even when selected the map centers on the wrong spot and Overpass returns no raceway geometry.

I need to verify both before proposing fixes.

### Investigation

Query `preset_tracks` to inspect:
- All NJMP-related rows (names + coords)
- Sample of other tracks that commonly have multiple configurations (COTA, Thunderhill, Sebring, VIR) to spot bad coords

Then propose a two-part fix:

### Part 1 — Picker search relevance

`cmdk` matches against the `value` prop on `CommandItem`, which we set to `p.name`. With names like "NJMP - Lightning", a search for "njmp lightning" (with space) may score poorly. Fix:
- Set `value={p.name.replace(/[-\s]+/g, " ")}` or pass a custom `filter` to `<Command>` that does substring matching across normalized text (lowercase, strip punctuation). Substring beats fuzzy here since track names are short.

### Part 2 — Fix wrong coordinates

For each track with bad coords, update lat/lon to the correct circuit center. NJMP Lightning is at roughly **39.3947, -75.0810** (Millville, NJ). I'll batch-correct any tracks that look obviously wrong from the query results.

Since `preset_tracks` has no UPDATE policy (admin-managed), the fix has to go through a migration.

### Files touched

- `src/components/LiveTrackMap.tsx` — add a custom `filter` prop on `<Command>` for normalized substring search
- `supabase/migrations/<new>.sql` — UPDATE statements for the specific `preset_tracks` rows with wrong coordinates (driven by the query results)

### Out of scope

- Bulk re-import of every track from a canonical source (separate effort if many are wrong)
- Manual `track_geojson` overrides (Overpass usually works once coords are correct)
- An admin UI to edit tracks (would need new RLS + UI — separate request)

I'll run the diagnostic query first, then patch only the rows that are actually wrong.

