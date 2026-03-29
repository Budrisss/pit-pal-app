

## Plan: Improve Session Notes UX

### Summary
Hide session notes by default. Add a "Show Notes" option in the dropdown menu that expands notes inline below the session card. Show a small colored dot indicator on sessions that have saved notes.

### Changes

**`src/pages/SessionManagement.tsx`**

1. **Add expanded notes state**: Add a `useState<Set<string>>` to track which session IDs have their notes expanded.

2. **Update `SortableSessionItem` component**:
   - Add `onToggleNotes` callback and `isNotesExpanded` prop.
   - In the dropdown menu, add a "Show Notes" / "Hide Notes" toggle item (only visible when notes exist).
   - Add a small colored dot (orange/amber) next to the session name when `session.notes` is truthy — replacing the current inline `StickyNote` icon in the subtitle row.
   - Below the session row content, render a collapsible section: when `isNotesExpanded` is true, show the notes text in a subtle `bg-muted/30 rounded p-2 mt-2 text-xs` block.

3. **Wire toggle in parent**: Pass toggle handler and expanded state down to each `SortableSessionItem`.

### Technical Details
- No database changes needed — notes already stored in `sessions` table.
- The existing "Add/Edit Notes" dropdown item stays for editing. The new "Show/Hide Notes" item is purely for display toggle.
- The colored dot will be a small `w-1.5 h-1.5 rounded-full bg-amber-500` element positioned near the session name.

