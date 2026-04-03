

## Plan: Add Crew/Driver Communication to Global Events

### What We're Building
Port the personal event crew/driver communication system to global events:
1. **Racer Live View** gets driver panels (track notes, gap ahead, crew messages feed) — read-only
2. **Crew Live View** is extended to work with global events so a crew member can send messages

### Current State
- **Personal events**: DriverLiveView (read-only, track notes + gap + crew feed) and CrewLiveView (sends gap/messages) work via `crew_messages` table, keyed by personal `event_id`
- **Global events**: RacerLiveView shows flags, sessions, announcements — no crew communication

### Changes

#### 1. Extend `src/pages/RacerLiveView.tsx` (~887 lines)
- Add driver communication panels below the existing flag/session UI:
  - **Track Notes** card (editable, saved to localStorage per event)
  - **Gap Ahead** hero card showing latest `gap_ahead` from `crew_messages`
  - **Latest Crew Message** banner
  - **Crew Updates** feed (scrollable, real-time via Supabase channel)
- Subscribe to `crew_messages` table filtered by the user's personal `events.id` (the user's personal event linked to the global event via `public_event_id`)
- Reuse the same `crew_messages` table — the crew member will send messages keyed to the racer's personal event ID

#### 2. Extend `src/pages/CrewLiveView.tsx` (~440 lines)
- Currently only works with personal events (uses `EventsContext.getEventById` and localStorage sessions)
- Add detection: if the personal event has a `public_event_id`, fetch sessions from `public_event_sessions` instead of localStorage
- Use the global event's session timers (start_time, duration) for the active session banner
- Keep the same crew message sending logic (writes to `crew_messages` with the personal event ID)
- Add a way to access this page from the event details or session management (link/button)

#### 3. Add navigation links
- **EventDetails page**: Add a "Crew View" link/button so a designated crew member can access `/crew-live/:eventId`
- **RacerLiveView**: No navigation change needed — the driver panels are embedded

### Data Flow
```text
Crew member → CrewLiveView → sends to crew_messages (event_id = personal event ID)
                                      ↓
Racer → RacerLiveView → subscribes to crew_messages (same personal event ID)
                         shows gap ahead, messages, track notes
```

### No Database Changes
The `crew_messages` table already exists and works. Messages are keyed by the racer's personal `events.id`, which is the same whether accessed from personal or global event context.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/RacerLiveView.tsx` | Add track notes, gap ahead, crew message feed, real-time subscription |
| `src/pages/CrewLiveView.tsx` | Support global events by fetching `public_event_sessions` when `public_event_id` exists |
| `src/pages/EventDetails.tsx` | Add "Crew View" navigation button |

