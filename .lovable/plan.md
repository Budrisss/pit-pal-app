

## Plan: Organizer Live Management Page

### Summary
Replace the current "Live Manage" dialog with a dedicated full page at `/live-manage/:eventId`. This page will combine session schedule editing (add/edit/delete sessions), announcements, and participant info in a single real-time management view.

### Changes

**1. Create `src/pages/OrganizerLiveManage.tsx`** (new file)

A full page with:
- **Header**: Back arrow to `/event-organizer`, event name, live indicator dot
- **Live Clock**: Current time display
- **Sessions section**: List all `public_event_sessions` for the event. Each session shows name, run group, start time, duration with inline editing. Add/delete session buttons. Changes save to DB immediately and are pushed via Supabase Realtime.
- **Announcements section**: Post new announcements, view/delete existing ones (reuse existing logic from EventOrganizer)
- **Participant count summary**: Quick badge showing total registrations

Data fetching:
- Fetch `public_event_sessions` for the event
- Fetch `registration_types` for run group labels
- Fetch `event_announcements` for the event
- Subscribe to Realtime on `public_event_sessions` and `event_announcements` tables for live sync

**2. Update `src/App.tsx`**

Add route: `<Route path="/live-manage/:eventId" element={<ProtectedRoute><OrganizerLiveManage /></ProtectedRoute>} />`

**3. Update `src/pages/EventOrganizer.tsx`**

Change the "Live Manage" dropdown item to navigate to `/live-manage/${event.id}` instead of opening the dialog. Remove the live management dialog and its associated state (`liveEventId`, `liveSessions`, `announcements`, `newAnnouncement`, `postingAnnouncement`) and handler functions (`openLiveManagement`, `handleUpdateLiveSession`, `handlePostAnnouncement`, `handleDeleteAnnouncement`).

### Technical Details
- No database changes needed. Uses existing `public_event_sessions`, `event_announcements`, and `registration_types` tables.
- Session add/delete will use direct Supabase inserts/deletes on `public_event_sessions`.
- Organizer authorization: verify the event belongs to the organizer's profile before allowing edits.
- Realtime subscriptions on `public_event_sessions` and `event_announcements` filtered by `event_id` for live sync.

