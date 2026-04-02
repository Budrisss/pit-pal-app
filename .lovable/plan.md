

## Plan: Crew Live Communication for Personal Events

### Overview

When a driver creates their own event (not an organizer event), they get a **Driver Live View** and a **Crew Live View**. The crew member logs in with the driver's credentials on a separate device and opens the crew page to send real-time updates (gap times, position, session countdown, free-text notes). The driver sees a split-screen with a countdown timer and a live message feed. This is completely independent from the organizer live management system.

### Database

**New table: `crew_messages`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| event_id | uuid | Links to personal `events` table |
| user_id | uuid | The account owner (driver = crew, same login) |
| session_id | uuid | Optional, links to `sessions` table |
| gap_ahead | text | e.g. "+1.2s" |
| position | text | e.g. "P3" |
| time_remaining | text | e.g. "8:30" |
| message | text | Free-text note |
| created_at | timestamptz | Default now() |

RLS: authenticated users can CRUD where `user_id = auth.uid()`. Enable realtime on this table.

### New Pages

**1. Crew Live View — `/crew-live/:eventId`**
- Structured quick-entry section at top:
  - **Gap/Split**: text input for gap to car ahead (e.g. "+1.2s")
  - **Position**: text input (e.g. "P3")
  - **Time Remaining**: text input (e.g. "12:00")
  - **Send** button pushes structured data as a single message
- Free-text message input below with its own send button
- Scrollable history of sent messages at bottom
- Session selector dropdown if multiple sessions exist
- Real-time: subscribes to `crew_messages` for the event so both devices stay in sync

**2. Driver Live View — `/driver-live/:eventId`**
- **Split layout** (side-by-side on desktop, stacked on mobile):
  - **Left/Top**: Large session countdown timer (auto-calculates from session start_time + duration), current position and gap displayed prominently
  - **Right/Bottom**: Live message feed showing crew updates in reverse chronological order, auto-scrolls on new messages
- Latest structured data (position, gap, time remaining) displayed as hero cards above the feed
- Real-time subscription to `crew_messages` table
- Distinct from the organizer `RacerLiveView` — only appears for personal events (no `public_event_id`)

### Entry Points

- **Event Details page** (`/events/:id`): Add a "Go Live" button that appears only for personal events (where `public_event_id` is null). Opens the Driver Live View.
- **Session Management page**: Add a "Crew View" button in the header that opens the Crew Live View URL. This is what the crew member navigates to on their device.

### Routing

Add two new protected routes in `App.tsx`:
- `/driver-live/:eventId` → `DriverLiveView`
- `/crew-live/:eventId` → `CrewLiveView`

### Files

| File | Action |
|------|--------|
| Migration | New `crew_messages` table + RLS + realtime |
| `src/pages/DriverLiveView.tsx` | New — split view with countdown + feed |
| `src/pages/CrewLiveView.tsx` | New — structured inputs + free text + history |
| `src/pages/EventDetails.tsx` | Edit — add "Go Live" button for personal events |
| `src/pages/SessionManagement.tsx` | Edit — add "Crew View" link button |
| `src/App.tsx` | Edit — add two routes |

### What This Does NOT Touch

- The organizer live management system (`OrganizerLiveManage`, `RacerLiveView`, `event_flags`) is completely unaffected
- No changes to public events, registrations, or organizer features

