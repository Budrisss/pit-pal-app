

## Conditional Edit/Delete for Event Details

### Problem
Currently, all events show "Edit Event" and "Delete Event" buttons regardless of whether the event is a personal event or a registered public event. Users should only edit/delete their own personal events. Registered events should show "Unregister" instead.

### Changes

**File: `src/pages/EventDetails.tsx`** (lines 272-315)

1. **Hide "Edit Event" button** when `event.publicEventId` exists (registered event)
2. **Change "Delete Event" to "Unregister"** when `event.publicEventId` exists
3. For registered events, simplify the delete dialog: title becomes "Unregister from Event", description explains it will cancel registration and remove from their schedule, single confirm button says "Unregister"
4. For personal events (no `publicEventId`), keep current Edit and Delete behavior unchanged

**Also update `src/components/EventCard.tsx`**:
- Hide the "Edit" dropdown option when `publicEventId` exists
- Change "Delete" to "Unregister" in the dropdown for registered events

### Result
- Personal events: Edit + Delete (as-is)
- Registered public events: no Edit, "Unregister" button that cancels registration and removes the event copy

