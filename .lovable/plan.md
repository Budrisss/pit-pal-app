

## Plan: Context-Aware Flag Targeting by Run Group

### Problem
When a user has multiple cars registered in different run groups, the black/blue flag dialogs show a flat list of ALL participants. This makes it hard to find the right driver and doesn't distinguish which car/group entry to target.

### Approach
- Auto-filter the participant list to the **currently active session's run group**
- Add a toggle to switch between "Current Group" and "All Groups"
- Group participants by run group with section headers
- Target the **specific registration entry** (car + group combo), not just the user
- Update `EventRegistrationWithCar` to include `id` (registration ID) so flags can reference a specific car entry

### Changes

**`src/pages/OrganizerLiveManage.tsx`**

1. **Update `EventRegistrationWithCar` interface** — add `id` field. Update the fetch query to include `id`.

2. **Determine active session's run group** — derive `activeSessionRegTypeId` from `sessionStates` (the currently active session's `registration_type_id`). This drives the default filter.

3. **Add filter state to both dialogs** — new state `blackFlagGroupFilter` and `blueFlagGroupFilter` defaulting to `"active"`. When dialog opens, auto-set to `"active"`. A small toggle at the top switches between "Current Group" (filtered to active session's run group) and "All Groups" (grouped by section).

4. **Group-sectioned participant list** — when showing "All Groups", render participants under collapsible run group headers (e.g., "Beginner", "Advanced"). When showing "Current Group", only show participants in the active session's run group.

5. **Target by registration entry, not user** — change `blackFlagTarget` and `blueFlagTarget` to store `registration.id` instead of `user_id`. When sending the flag, look up the registration to get `user_id`, `car_number`, and group name for the flag message. The `target_user_id` on `event_flags` still stores the `user_id` (so the racer receives it), but the message includes the specific car number and group for clarity.

6. **Display car details per entry** — each row shows: `#42 — John Doe (2018 MX-5)` with a group badge. Since the registration query doesn't join car details, we show car number and user name (car name can be added later if `car_id` is joined).

### UI Mockup
```text
┌─ 🏴 Send Black Flag ─────────────────┐
│                                        │
│ [Current Group ▼] [All Groups]         │
│                                        │
│ 🔍 Search by car # or name...         │
│                                        │
│ ┌─ Beginner (active) ──────────────┐  │
│ │  #42 — John Doe          [Beginner]│  │
│ │  #17 — Jane Smith        [Beginner]│  │
│ └──────────────────────────────────┘  │
│                                        │
│ Message: [                          ]  │
│ [ 🏴 Send Black Flag              ]   │
└────────────────────────────────────────┘
```

### Files Modified
- `src/pages/OrganizerLiveManage.tsx` — all changes in this single file

