# Move "Pair Radio" onto Event cards, drop it from the Dashboard

Drivers will pair their radio directly from the event card on the Events page — same place they already see car #, date, and the Start button. The standalone "My Registrations" card on the Dashboard is removed since the pairing entry point now lives on the event itself.

## What changes for the user

**Events page** (`/events`)
- Every event card that you're registered for (the ones with the green "Registered" badge) gets a new **"Pair Radio for Car #X"** button at the bottom of the card.
- Once paired, the card shows the radio label, a Test ping button, and Unassign — same controls as today, just inline on the card.
- Unregistered/personal events are unchanged (no pairing UI).

**Dashboard** (`/dashboard`)
- The "My Registrations" section is removed.
- Everything else stays (Quick Actions, Garage, Local Events, etc.).

**Settings page** — left as-is for now (still shows My Registrations with the same pairing UI). Can be cleaned up in a follow-up if you want a single source of truth.

## Layout sketch

```text
EventCard (registered)
├── Title + Registered badge + ⋯ menu
├── Track / Car / Date·Time
├── Countdown + checklist progress
├── [Details]  [Start]
└── ── Pair Radio for Car #12 ──   ← NEW
```

## Technical changes

1. **`src/components/EventCard.tsx`**
   - Add optional props: `registrationId?: string | null`, `carNumber?: number | null`, `driverName?: string`.
   - When `publicEventId` and `registrationId` are both set, render `<RegistrationRadioPairing registrationId=… eventId={publicEventId} carNumber=… driverName=… />` inside the card, below the action buttons.

2. **`src/contexts/EventsContext.tsx`**
   - Extend the `Event` interface with `registrationId?: string | null` and `carNumber?: number | null`.
   - In `fetchEvents`, after loading the user's events, do one extra query: `event_registrations` filtered by `user_id` and the collected `publicEventIds`, then map each registration onto its matching event row by `public_event_id`. Store `id` → `registrationId` and `car_number` → `carNumber` on the Event.
   - Update `mapDbRowToEvent` (or the post-map step) to carry these fields through.

3. **`src/pages/Events.tsx`**
   - Pass the new fields through to `<EventCard>`: `registrationId={event.registrationId}`, `carNumber={event.carNumber}`, and the user's display name (from `useAuth()` profile or `user.email` fallback) as `driverName`.

4. **`src/pages/Dashboard.tsx`**
   - Remove the `import MyRegistrations from "@/components/MyRegistrations"` line.
   - Remove the `<motion.div>` block that renders `<MyRegistrations />` between Quick Actions and the Garage/Local Events row.

## Out of scope

- Removing `MyRegistrations` from the Settings page (kept for now to avoid disrupting muscle memory).
- Deleting the `MyRegistrations.tsx` component file (still used by Settings).
- Any DB / RLS changes — `event_registrations` is already readable by the owning user.
