

## Plan: Multi-Select Run Groups Based on Registrations

### Problem
Currently the "My Run Group" selector is a single-select dropdown. If a user is registered in two different groups (e.g., Beginner with Car A, Advanced with Car B), they can only track one group's countdown at a time.

### Approach
Change the run group selector from single-select to multi-select (checkboxes). Auto-select all groups the user is registered in. Update countdown and session filtering logic to consider all selected groups.

### Changes

**`src/pages/SessionManagement.tsx`**

1. **State change**: `myRunGroup: string | null` → `myRunGroups: Set<string>` (multiple group IDs)

2. **Auto-default on load**: Fetch ALL user registrations for this event (not just `limit(1)`), extract unique `registration_type_id` values, and pre-select all of them

3. **UI**: Replace the `<Select>` dropdown with a list of checkboxes (one per run group) so the user can toggle multiple groups on/off. Show which car/car number is associated with each group from their registrations.

4. **Countdown logic** (`getNextUpcomingSession`, `getActiveSessionRemainingTime`): Filter sessions matching ANY of the selected groups (instead of one). Show the nearest upcoming session across all selected groups.

5. **Active session banner**: If multiple groups are selected and one is active, show it. The "Your Next Session" label works the same way — find the soonest next session across selected groups.

6. **localStorage**: Store selected groups as JSON array instead of single string (`my-run-groups-${eventId}`)

### UI Mockup
```text
┌─ My Run Groups ─────────────────┐
│ ☑ Beginner  (#42 · 2018 MX-5)  │
│ ☑ Advanced  (#7 · 2020 Supra)  │
│ ☐ Instructor                    │
│                                  │
│ Countdown tracks: Beginner,     │
│ Advanced                         │
└──────────────────────────────────┘
```

### Files Modified
- `src/pages/SessionManagement.tsx` — All changes in this single file

