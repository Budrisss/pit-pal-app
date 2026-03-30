

## Plan: Cancel Registration When Deleting a Registered Event

When a user deletes a personal event that was created from a public event registration, prompt them to also cancel their registration. If confirmed, delete their `event_registrations` record so they are removed from the participant list and run groups.

### Changes

**1. `src/contexts/EventsContext.tsx`**
- Update `deleteEvent` to accept an optional `cancelRegistration: boolean` parameter
- Before deleting the event, look up the event's `public_event_id`
- If `cancelRegistration` is true and `public_event_id` exists, delete the matching row from `event_registrations` (matching `event_id = public_event_id` and `user_id`)
- Then proceed with the normal event deletion

**2. `src/components/EventCard.tsx`**
- In the delete flow, check if the event `isRegistered` (or has a `publicEventId`)
- If it's a registered event, show a modified confirmation dialog that asks "This event is linked to a registration. Do you also want to cancel your registration?" with options: "Delete & Cancel Registration", "Delete Only", "Cancel"
- Pass the appropriate flag to `deleteEvent`

**3. `src/pages/EventDetails.tsx`**
- Apply the same registration-cancellation prompt in the delete handler if the event has a `public_event_id`

### Data Flow
- `EventCard` already receives `isRegistered` prop and the event `id`
- Need to also pass `publicEventId` to `EventCard` so it can be forwarded to the context
- The context's `deleteEvent` will query the event record to get `public_event_id`, then conditionally delete from `event_registrations`

### No Database Changes Required
The `event_registrations` table already has an RLS policy allowing users to delete their own registrations (`user_id = auth.uid()`).

