

# Organizer/User Mode Toggle with Live Updates

## Overview

Separate the app into two distinct modes for users who are also organizers: **User Mode** (default, full access to Garage, Events, Local Events, etc.) and **Organizer Mode** (focused on managing their events, live schedule updates, and announcements). A toggle in the navigation bar lets them switch between modes.

## Architecture

```text
┌─────────────────────────────────────┐
│         Navigation Bar              │
│  [User Mode] ←toggle→ [Org Mode]   │
│                                     │
│  User Mode nav:                     │
│    Home | Garage | Local | Events   │
│    | Settings                       │
│                                     │
│  Organizer Mode nav:                │
│    Organizer Dashboard | Settings   │
│    | Logout                         │
└─────────────────────────────────────┘
```

## Steps

### 1. Create an Organizer Mode Context
- New file: `src/contexts/OrganizerModeContext.tsx`
- Stores `isOrganizerMode` boolean + `toggleMode()` function
- Also stores `isOrganizer` (fetched from `organizer_profiles` table) — removes duplicated logic from both nav components
- Persists mode choice in `localStorage`

### 2. Update Navigation Components
- **Both `Navigation.tsx` and `DesktopNavigation.tsx`**:
  - Consume `OrganizerModeContext` instead of querying `organizer_profiles` directly
  - Show a toggle button (e.g., a switch or icon button) when user is an organizer
  - In **User Mode**: show Home, Garage, Local, Events, Settings (hide Organizer)
  - In **Organizer Mode**: show Organizer Dashboard, Settings, Logout only
  - Remove the registration badge logic from nav (it stays on the Organizer page itself)

### 3. Database: Add `event_announcements` Table
- New migration with columns: `id`, `event_id`, `organizer_id`, `message` (text), `created_at`
- RLS: organizers can INSERT/UPDATE/DELETE their own announcements; authenticated users can SELECT announcements for events they're registered for (or all, for simplicity)
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.event_announcements;`

### 4. Enable Realtime on `public_event_sessions`
- Add `ALTER PUBLICATION supabase_realtime ADD TABLE public.public_event_sessions;` so schedule changes push live to participants

### 5. Live Schedule Editing on Organizer Dashboard
- On the Event Organizer page, add an **"Active Event"** management section when an event is happening (or selectable for any event)
- Allow inline editing of session times/durations with immediate save to `public_event_sessions`
- Changes propagate via realtime to participants viewing the event

### 6. Announcements Section on Organizer Dashboard
- Add a text input + "Post" button on the Event Organizer page per event
- Organizer types a message → inserts into `event_announcements`
- Shows list of past announcements with timestamps

### 7. Participant-Facing: Show Live Updates & Announcements
- On `PublicEventPreview.tsx` (and optionally `LocalEvents.tsx` event detail):
  - Subscribe to `public_event_sessions` changes via realtime — auto-update schedule display
  - Subscribe to `event_announcements` — show announcements feed with newest first
  - Visual indicator (pulse/badge) when new announcement arrives

### 8. Wrap App with OrganizerModeContext
- In `App.tsx`, add `<OrganizerModeProvider>` inside `<AuthProvider>`

## Technical Details

- **Realtime subscriptions**: Use `supabase.channel().on('postgres_changes', ...)` pattern for both sessions and announcements tables
- **Mode toggle UI**: On mobile nav, a small switch icon; on desktop, a styled toggle button with "User" / "Organizer" labels
- **`event_announcements` schema**:
  - `id uuid PK default gen_random_uuid()`
  - `event_id uuid NOT NULL`
  - `organizer_id uuid NOT NULL`
  - `message text NOT NULL`
  - `created_at timestamptz default now()`

