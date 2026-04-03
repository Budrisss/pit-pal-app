

## Plan: Add Schedule & Requirements to Events

### Overview
Add `schedule` and `requirements` fields to the `events` database table so users can define them when creating/editing events. Remove the hardcoded fallback data from EventDetails.

### Database Changes (1 migration)

Add two columns to the `events` table:
- **`schedule`** — `jsonb`, nullable, default `null`. Stores array of `{time, activity}` objects.
- **`requirements`** — `text[]`, nullable, default `null`. Stores array of requirement strings.

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | `ALTER TABLE events ADD COLUMN schedule jsonb, ADD COLUMN requirements text[]` |
| `src/components/EventForm.tsx` | Add schedule builder (add/remove time+activity rows) and requirements builder (add/remove text items) to the form |
| `EventFormData` interface | Add `schedule` and `requirements` fields |
| `src/contexts/EventsContext.tsx` | Include `schedule` and `requirements` in insert/update calls and in `mapDbRowToEvent` |
| `src/pages/EventDetails.tsx` | Remove hardcoded fallbacks; only show Schedule/Requirements sections when data exists |
| `src/pages/Events.tsx` | Pass new fields through `handleSaveEvent` |

### UI in EventForm
- **Schedule section**: Repeatable rows with time input + activity text input, plus "Add Schedule Item" button
- **Requirements section**: Repeatable text inputs, plus "Add Requirement" button
- Both sections are optional — users can leave them empty

### Technical Details
- Schedule stored as `jsonb` array: `[{"time":"8:00 AM","activity":"Registration"}]`
- Requirements stored as `text[]`: `{"Valid driver's license","Helmet"}`
- EventDetails hides sections entirely if no data provided (no more fake placeholders)

