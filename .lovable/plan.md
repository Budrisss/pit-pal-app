

# Racer Live View — Real-Time In-Car Display

## Overview
Create a mobile-optimized "Racer Live View" page that registered drivers can access during an event. The organizer controls what racers see via the existing Live Management page, extended with flag controls and targeted messages. The racer view is designed for phone use in-car: large text, high-contrast colors, and minimal interaction needed.

## Architecture

```text
Organizer (Live Manage)              Racer (Live View)
┌─────────────────────┐              ┌─────────────────────┐
│ Flag Control Panel   │──realtime──▶│ Full-screen flag     │
│ (green/yellow/red/   │             │ display with color   │
│  black/checkered)    │             │ + message            │
│                      │             │                      │
│ Announcements        │──realtime──▶│ Toast/banner alerts  │
│ (existing system)    │             │ + announcement feed  │
│                      │             │                      │
│ Session schedule     │──realtime──▶│ Current session +    │
│ (existing system)    │             │ time remaining       │
└─────────────────────┘              └─────────────────────┘
```

## Database Changes

**New table: `event_flags`**
- `id` (uuid, PK)
- `event_id` (uuid, NOT NULL)
- `organizer_id` (uuid, NOT NULL)
- `flag_type` (text, NOT NULL) — values: `green`, `yellow`, `red`, `black`, `checkered`, `white`
- `message` (text, nullable) — e.g., "Yellow at Turn 5", "Car #42 report to pits"
- `target_user_id` (uuid, nullable) — null = all racers, set = specific racer (for black flags)
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())

RLS: Authenticated users can SELECT (so racers see flags). Organizers can INSERT/UPDATE/DELETE (via organizer_profiles join). Enable realtime.

## Implementation Plan

### 1. Database migration
Create `event_flags` table with RLS policies. Add to realtime publication.

### 2. Organizer Flag Controls (edit `OrganizerLiveManage.tsx`)
Add a "Flag Control" section above announcements with:
- Row of flag buttons: Green (🟢), Yellow (⚠️), Red (🔴), Black (🏴), White (🏳️), Checkered (🏁)
- Optional message input per flag (e.g., "Turn 5" for yellow, car number for black)
- Active flag display showing current flag status
- "Clear All Flags" button to set all `is_active = false`

### 3. New Racer Live View page (`src/pages/RacerLiveView.tsx`)
Route: `/race-live/:eventId`

Mobile-first, full-screen layout:
- **Top bar**: Event name, live clock
- **Flag zone** (dominant area): Full-width colored banner matching active flag — green bg for green, yellow bg + "CAUTION" for yellow, red bg + "STOP" for red, black bg + "PIT IN" for black flag, checkered pattern for session end. Large text, impossible to miss.
- **Session info**: Current session name, time remaining (large countdown)
- **Announcements feed**: Scrollable list of recent organizer messages with newest on top, toast notification on new arrival
- Realtime subscriptions for `event_flags`, `event_announcements`, and `public_event_sessions`

### 4. Racer access route
- Add `/race-live/:eventId` to App.tsx as a protected route
- Add a "Join Live View" button on the PublicEventPreview page for registered users
- Add entry point from the driver's SessionManagement page

### 5. Realtime notifications
- When a new flag or announcement arrives via realtime subscription, show a toast notification with sound-like visual emphasis (pulsing border, color flash)
- Black flags targeted to a specific user only show for that user

## Technical Details

- Flag colors map: `green` → `bg-green-500`, `yellow` → `bg-yellow-400 text-black`, `red` → `bg-red-600`, `black` → `bg-black text-white`, `checkered` → checkerboard CSS pattern, `white` → `bg-white text-black`
- Racer view uses `screen.wakeLock` API (if available) to keep phone screen on
- Page uses existing realtime pattern from OrganizerLiveManage
- No new edge functions needed — all data flows through Supabase realtime + direct queries

## Files to Create/Edit
- **Create**: Migration for `event_flags` table
- **Create**: `src/pages/RacerLiveView.tsx`
- **Edit**: `src/pages/OrganizerLiveManage.tsx` — add flag control panel
- **Edit**: `src/App.tsx` — add route
- **Edit**: `src/pages/PublicEventPreview.tsx` — add "Join Live View" button
- **Edit**: `src/pages/SessionManagement.tsx` — add "Open Live View" button

