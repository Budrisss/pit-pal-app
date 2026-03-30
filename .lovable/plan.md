

# Black Flag by Car Number — Targeted Driver Alerts

## Overview
Add a **car number** field to event registration (required, numeric, unique per event). Organizers can then send a black flag to a specific car number via a dedicated dialog. The racer view displays the driver's car number in the header.

## Database Changes

**1. Add `car_number` column to `event_registrations`**
```sql
ALTER TABLE public.event_registrations ADD COLUMN car_number integer;
-- Unique constraint: no duplicate car numbers per event
CREATE UNIQUE INDEX idx_unique_car_number_per_event 
  ON public.event_registrations(event_id, car_number);
```

## Implementation

### 1. Registration form updates
- **`PublicEventPreview.tsx`** and **`LocalEvents.tsx`**: Add a required "Car Number" numeric input to the registration form. Include `car_number` in the insert payload.
- Validate uniqueness client-side by checking existing registrations for the event before submitting. The unique index provides server-side enforcement as well.

### 2. Black flag dialog on Live Management
- **`OrganizerLiveManage.tsx`**:
  - Fetch registrations with `car_number` and `user_id` for the event.
  - When the organizer clicks the Black flag button, open a **Dialog** instead of immediately sending.
  - Dialog shows a searchable list of registered car numbers with driver names. Organizer selects a car number, optionally adds a message, and confirms.
  - On confirm, insert a flag with `flag_type: 'black'`, `target_user_id` set to the selected driver's `user_id`, and message auto-prefixed with "Car #XX".
  - Also keep an option for "All Drivers" black flag (no target).

### 3. Racer Live View — car number in header
- **`RacerLiveView.tsx`**:
  - Fetch the user's `car_number` from `event_registrations` alongside the existing `registration_type_id` query.
  - Display car number as a prominent badge in the top header bar (e.g., `#42`).
  - Black flag filtering already uses `target_user_id` — no logic changes needed there.

## Files to Edit
- **Migration**: Add `car_number` column + unique index on `event_registrations`
- **`src/pages/PublicEventPreview.tsx`**: Add car number field to registration form + insert
- **`src/pages/LocalEvents.tsx`**: Same registration form update
- **`src/pages/OrganizerLiveManage.tsx`**: Fetch registrations with car numbers, add black flag dialog with car selection
- **`src/pages/RacerLiveView.tsx`**: Fetch and display car number in header

