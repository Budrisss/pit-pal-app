

## Plan: Separate Run Groups from Registration Groups

### Problem
Currently, "Registration Types" (e.g., 1-Day, 2-Day passes) double as "Run Groups" for session assignment. The organizer needs these as two independent concepts:
- **Registration Groups**: pricing/access tiers users sign up for (1-day, 2-day, instructor, student)
- **Run Groups**: track groups assigned to sessions (Group A, Group B, Beginner, Advanced)

### Database Changes (1 migration)

**New table: `run_groups`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| event_id | uuid | NOT NULL, references public_events |
| name | text | NOT NULL |
| sort_order | integer | default 0 |
| created_at | timestamptz | default now() |

RLS: SELECT open to authenticated, INSERT/UPDATE/DELETE restricted to the event's organizer (same pattern as `registration_types`).

**Alter `public_event_sessions`**: Add `run_group_id uuid` (nullable). Keep `registration_type_id` for now (backward compat) but the UI will stop using it for new assignments.

**Alter `event_registrations`**: Add `run_group_id uuid` (nullable) so users can be assigned a run group when registering.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/EventOrganizer.tsx` | Add `RunGroupsEditor` component (similar to RegistrationTypesEditor). Update `SessionsEditor` to use run groups instead of registration types for session assignment. Save/load run groups on create/edit. |
| `src/pages/OrganizerLiveManage.tsx` | Fetch run groups instead of registration types for session-group display and flag targeting. |
| `src/pages/PublicEventPreview.tsx` | Show run groups on sessions instead of registration type names. |
| `src/pages/RacerLiveView.tsx` | Use `run_group_id` from registrations and sessions for personalized view filtering. |
| `src/pages/SessionManagement.tsx` | Use `run_group_id` on sessions and registrations for "my run groups" selection. Fetch from `run_groups` table instead of `registration_types` for group names. |
| `src/pages/LocalEvents.tsx` | Add run group selection to registration flow if run groups exist for the event. |
| `src/pages/OrganizerSettings.tsx` | Potentially add default run group names to organizer settings (optional, can be deferred). |

### Organizer Event Creation Flow
1. Organizer fills in event details (unchanged)
2. Organizer creates **Registration Groups** — pricing tiers (unchanged)
3. Organizer creates **Run Groups** — new section, simple name list (e.g., "Beginner", "Intermediate", "Advanced")
4. Organizer creates **Sessions** — assigns a **Run Group** (not registration group) to each session

### Registration Flow Update
When a user registers for an event that has run groups defined, they also select which run group they belong to. This `run_group_id` is stored on `event_registrations` and used for session filtering in Racer Live View and Session Management.

### Migration Strategy
- Add new columns and table
- Code changes use `run_group_id` when available, fall back to `registration_type_id` for existing events that haven't been updated
- This ensures backward compatibility with events already created

### Technical Details
- Run groups are independent of registration types — an organizer can have 2 registration types (1-day, 2-day) and 3 run groups (A, B, C)
- Sessions link to run groups via `run_group_id` on `public_event_sessions`
- User's run group assignment stored on `event_registrations.run_group_id`
- Racer Live View and Session Management filter sessions by matching `run_group_id`

