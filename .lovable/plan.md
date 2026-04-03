

## Plan: Crew Messaging with Organizer Approval

### What We're Building
1. Organizer can toggle crew messaging on/off per registered user from the Organizer Live Manage page
2. Racer Live View only shows crew communication panels if the organizer has approved it for that registration
3. A shareable Crew View link so the racer's crew member can send messages

### Database Change

**Add `crew_enabled` column to `event_registrations`:**
```sql
ALTER TABLE public.event_registrations
ADD COLUMN crew_enabled boolean NOT NULL DEFAULT false;
```

**Add UPDATE policy for organizers** (currently missing — organizers can't update registrations):
```sql
CREATE POLICY "Organizers can update registrations"
ON public.event_registrations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public_events pe
    JOIN organizer_profiles op ON op.id = pe.organizer_id
    WHERE pe.id = event_registrations.event_id
    AND op.user_id = auth.uid()
  )
);
```

### File Changes

#### 1. `src/pages/OrganizerLiveManage.tsx`
- Add a toggle/switch per participant in the participant list to enable/disable crew messaging (`crew_enabled`)
- When toggled, update `event_registrations.crew_enabled` for that registration
- Visual indicator (icon/badge) showing crew status

#### 2. `src/pages/RacerLiveView.tsx`
- When fetching the user's registration to find `personalEventId`, also check `crew_enabled`
- Only render the driver communication panels (Track Notes, Gap Ahead, Crew Updates) if `crew_enabled === true`
- Show a subtle "Crew messaging not enabled" note if disabled

#### 3. `src/pages/CrewLiveView.tsx`
- Before allowing message sends, verify the registration has `crew_enabled = true`
- Show a message if crew messaging is not approved for this event

#### 4. `src/pages/EventDetails.tsx`
- Already has Crew View buttons — no changes needed (crew view link already navigates to `/crew-live/:eventId`)

### Data Flow
```text
Organizer (Live Manage) → toggles crew_enabled on event_registrations
                                    ↓
Racer (Racer Live View) → checks crew_enabled → shows/hides driver panels
Crew Member (Crew View) → checks crew_enabled → allows/blocks sending
```

### Files Modified
| File | Change |
|------|--------|
| Migration | Add `crew_enabled` column + organizer UPDATE policy |
| `src/pages/OrganizerLiveManage.tsx` | Add crew toggle per participant |
| `src/pages/RacerLiveView.tsx` | Gate driver panels on `crew_enabled` |
| `src/pages/CrewLiveView.tsx` | Gate sending on `crew_enabled` |

