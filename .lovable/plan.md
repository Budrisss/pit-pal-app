

## Plan: Allow Multiple Registrations Per Event with Different Cars

### Problem
Currently, a user is blocked from registering for the same registration group twice. But users may want to run multiple cars in the same event/group, each with a different car number.

### Approach
Change the duplicate-prevention logic from "one registration per user per group" to "one registration per user per group per car number." Also add a car selector to the registration form so users can associate each registration with a specific car from their garage.

### Changes

**1. Add `car_id` column to `event_registrations` table**
- New nullable UUID column referencing the user's car
- Migration only (no foreign key to avoid cross-user issues with RLS)

**2. Update duplicate prevention logic**
- Currently checks: same `user_id` + same `registration_type_id` = blocked
- New check: same `user_id` + same `registration_type_id` + same `car_number` = blocked
- This means a user can register multiple times in the same group as long as each registration uses a different car number

**3. Add car selector to registration form (LocalEvents.tsx + PublicEventPreview.tsx)**
- Add a dropdown showing the user's cars from the garage (via `useCars` context)
- When a car is selected, auto-populate a suggested car name in the notes or store the `car_id`
- Car selection is optional (user may not have cars in garage yet)

**4. Update `userRegistrations` tracking**
- Change from `Set<registrationTypeId>` to a structure that tracks `registrationTypeId + carNumber` pairs
- Update the "already registered" warning to say "You're already registered with this car number in this group"

**5. Update MyRegistrations component**
- Show which car is associated with each registration (if `car_id` is set)

### Files Modified
- `supabase/migrations/` — Add `car_id` column to `event_registrations`
- `src/pages/LocalEvents.tsx` — Add car picker, update duplicate logic
- `src/pages/PublicEventPreview.tsx` — Same registration form updates
- `src/components/MyRegistrations.tsx` — Display car info per registration

