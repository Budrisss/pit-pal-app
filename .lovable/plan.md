

## Plan: Sync Run Group Selection to Live View

### Problem
Two issues prevent run group changes from reflecting in the Racer Live View:

1. **Key mismatch**: SessionManagement saves to `my-run-groups-${eventId}` (plural, array), but RacerLiveView reads from `my-run-group-${personalEventId}` (singular, single value). They never connect.
2. **No reactivity**: RacerLiveView only reads localStorage once during initial fetch. It never re-reads when the value changes.

### Approach
Unify the localStorage key and add a `storage` event listener so the live view reacts to changes made in SessionManagement (which may be open in another tab or was visited earlier).

### Changes

**`src/pages/RacerLiveView.tsx`**

1. **Read the correct key** — Change from `my-run-group-${personalEvent.id}` to `my-run-groups-${publicEventId}`. Parse as JSON array and use the first group ID as `userRegTypeId` (the live view shows one active session at a time, so first selected group is sufficient).

2. **Support multiple groups** — Store all selected group IDs in a new `userRegTypeIds` state (Set). Update `myActiveSession` and `myNextSession` to match against any of the selected groups (not just one).

3. **Listen for storage changes** — Add a `window.addEventListener("storage", ...)` listener that watches for changes to the `my-run-groups-${eventId}` key. When detected, update the group state and re-derive session filtering. This handles the case where the user switches tabs between Session Management and Live View.

4. **Also handle same-tab navigation** — Since the user may navigate from Session Management to Live View within the same tab (no `storage` event fires for same-tab writes), re-read localStorage on each `fetchData` call and on component mount/focus via a `visibilitychange` listener.

### Files Modified
- `src/pages/RacerLiveView.tsx` — fix localStorage key, support multiple groups, add reactivity

