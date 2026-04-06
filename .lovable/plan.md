

## Plan: Improve Local Events Search UX with Inline ZIP + Radius Controls

### What Changes

Right now, users must go to Settings to save a ZIP code, and the radius is hardcoded at 100 miles. This plan adds an inline ZIP code input and a radius selector directly on the Local Events page, so users can search from any location at any distance without leaving the page.

### Steps

1. **Add search state for inline ZIP and radius**
   - Add `searchZip`, `searchRadius` (default 50), and `searchLocation` state variables to `LocalEvents.tsx`
   - Pre-populate `searchZip` from the user's saved `user_locations` ZIP if available

2. **Replace the "Nearby / All US" toggle with an inline search bar**
   - Remove the two-button `viewMode` toggle (Nearby / All US)
   - Add a ZIP code input field (5-digit, inline) with a radius dropdown (25 / 50 / 100 / 200 / 500 miles)
   - Add a "Search" button that geocodes the ZIP via the existing `geocode-zip` edge function and fetches events within the selected radius
   - Keep the existing text search and state filter alongside

3. **Update `fetchEvents` to use dynamic radius**
   - Pass `searchRadius` instead of the hardcoded `100` to the `events_within_radius` RPC call
   - Use the inline search location coordinates (or fall back to saved user location)

4. **Update the "no location" prompt**
   - Instead of redirecting to Settings, show an inline message: "Enter a ZIP code above to find events near you"
   - Still show the "All US" fallback button for browsing without a ZIP

5. **Update hero subtitle text**
   - Dynamically show "Showing events within X miles of ZIP XXXXX" when a search is active

### Technical Details

- **Files modified**: `src/pages/LocalEvents.tsx` only
- **No database changes** needed -- the `events_within_radius` RPC already accepts a `radius_miles` parameter
- **No new edge functions** -- reuses existing `geocode-zip`
- **Radius options**: 25, 50, 100, 200, 500 miles via a `<Select>` dropdown
- The ZIP input will validate for 5 digits before allowing search

