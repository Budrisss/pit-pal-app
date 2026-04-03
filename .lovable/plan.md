

## Plan: My Run Groups Card Uses Run Groups Instead of Registration Types

### What Changes
The "My Run Groups" card in Session Management currently shows **registration types** (pricing tiers) and filters sessions by `registration_type_id`. It should instead show the **run group** the user selected during registration and filter sessions by `run_group_id`.

### File: `src/pages/SessionManagement.tsx`

1. **Fetch run groups instead of registration types** — Change the data load (line ~607-611) to query `run_groups` table instead of `registration_types` for the group list.

2. **Map sessions with `run_group_id`** — Update session mapping (lines ~631, ~738) to use `runGroupId: s.run_group_id` instead of `registrationTypeId: s.registration_type_id`.

3. **Auto-default from user's registration** — Update the auto-default logic (lines ~683-687) to read `run_group_id` from `event_registrations` instead of `registration_type_id`, and key the `userRegMap` by `run_group_id`.

4. **Filter sessions by run group** — Update any session filtering/countdown logic that matches `registrationTypeId` to match `runGroupId` instead.

5. **Rename internal state** — Rename `registrationTypeId` on the `Session` interface to `runGroupId` for clarity.

### No Database Changes Needed
The `run_group_id` columns already exist on both `public_event_sessions` and `event_registrations`.

