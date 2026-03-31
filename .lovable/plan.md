

## Plan: Add My Registrations Page to Settings with Cancel Functionality

### What We're Building
A dedicated "My Registrations" section accessible from the Settings page where users can view all their registrations, and cancel individual ones. Cancellation will delete the `event_registrations` row AND remove the corresponding personal event from the `events` table, fully removing the user from the event.

### Changes

**1. Enhance `src/components/MyRegistrations.tsx`**
- Remove the 4-item limit — show all registrations
- Add a "Cancel Registration" button on each registration row with a confirmation dialog
- On cancel: delete the `event_registrations` row, delete the matching personal `events` row (where `public_event_id` matches), and refresh the list
- Accept an optional `fullPage` prop to control layout (card wrapper vs standalone list)

**2. Update `src/pages/Settings.tsx`**
- Add a new "My Registrations" card section (with the Ticket icon) between Profile and Location
- Import and render `<MyRegistrations />` in full-page mode showing all registrations with cancel buttons

**3. No database changes needed**
- RLS already allows users to DELETE their own `event_registrations` rows
- RLS already allows users to DELETE their own `events` rows
- No migration required

### Cancel Flow
When a user cancels a registration:
1. Delete from `event_registrations` where `id = reg.id`
2. Delete from `events` where `user_id = user.id` AND `public_event_id = reg.event_id` (removes personal event copy)
3. Show success toast
4. Refresh registration list
5. When user navigates to Local Events or Public Event Preview, the registration state will naturally reflect the deletion (those pages re-fetch `userRegistrations` on load)

### Files Modified
- `src/components/MyRegistrations.tsx` — Add cancel button with confirmation, remove item limit, add full-page mode
- `src/pages/Settings.tsx` — Add My Registrations section with the enhanced component

