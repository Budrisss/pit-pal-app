

## Plan: Database-Backed Checklists with Templates and Per-Event Views

### Overview
Convert the hardcoded Checklists page into a database-backed system with two tabs: **Templates** (create/edit reusable checklist templates) and **By Event** (view and check off items for each event). When an event is created, all templates are automatically copied as event-specific checklists.

### Database Changes (1 migration)

**4 new tables:**

1. **`checklist_templates`** — `id`, `user_id`, `name`, `type` (event/trailer), `sort_order`, `created_at`
2. **`checklist_template_items`** — `id`, `template_id`, `user_id`, `text`, `sort_order`
3. **`event_checklists`** — `id`, `event_id`, `user_id`, `template_id` (nullable), `name`, `type`, `created_at`
4. **`event_checklist_items`** — `id`, `checklist_id`, `user_id`, `text`, `completed` (default false), `sort_order`

All with standard user-owns-row RLS (CRUD where `auth.uid() = user_id`).

### Files to Create/Modify

| File | What |
|------|------|
| Migration SQL | Create 4 tables + RLS |
| `src/contexts/ChecklistsContext.tsx` | **New** — CRUD for templates + event checklists, auto-generate on event creation |
| `src/pages/Checklists.tsx` | **Rewrite** — Two tabs: "Templates" (create/edit/delete templates with items) and "By Event" (grouped checklists with checkable items) |
| `src/components/ChecklistCard.tsx` | **Update** — Accept DB-backed data, support both template-mode (edit items) and event-mode (toggle completion) |
| `src/components/EventCard.tsx` | **Update** — Show progress badge (e.g. "✓ 4/12") from event checklist data |
| `src/contexts/EventsContext.tsx` | **Update** — After creating an event, call checklist context to generate checklists from templates |
| `src/pages/EventDetails.tsx` | **Update** — Add expandable checklists section |
| `src/App.tsx` | Wrap app with `ChecklistsProvider` |

### How It Works

1. **Templates tab**: Users create templates (e.g. "Pre-Track Day") with a list of items. These are the blueprints.
2. **Event creation**: All user templates are copied into `event_checklists` + `event_checklist_items` for the new event.
3. **By Event tab**: Shows checklists grouped by event name. Users check/uncheck items, which saves to DB in real-time.
4. **Event cards**: Query checklist completion counts and display a small colored progress badge.

### UI Details

- **Templates tab**: List of template cards with inline item editing, add/delete template buttons
- **By Event tab**: Accordion or collapsible sections per event, each showing its checklists with checkable items
- **EventCard badge**: `✓ 4/12` — green at 100%, orange when partial, hidden when no checklists exist

