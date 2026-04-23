

## Smoother "Add Item" UX for Checklists

### What's clunky now
- The add-item row is a thin 8pt input next to a barely-visible ghost `+` button. Target is small, looks more like a hint than a primary action.
- After adding an item, the input clears but **focus is lost**, so adding 5 items = 5 clicks back into the input.
- No visual feedback when an item lands in the list.
- On the **By Event** tab, adding to an event checklist re-fetches *all* checklists across *all* events (`fetchAllEventChecklists`), causing a full page flash on every keystroke-submit.

### Fixes

**1. Better add-item composer** (`src/components/ChecklistCard.tsx`)
- Replace the thin inline row with a dedicated bottom strip:
  - Slightly taller input (h-9), placeholder "Add a new item…"
  - Trailing **filled** primary button labeled "Add" with `Plus` icon (not a ghost icon-only button). Disabled state stays muted.
  - Visual separator (border-top) above it so it reads as the composer, not another list row.
- **Auto-refocus**: keep an `inputRef`, refocus after submit so the user can keep typing items rapidly.
- **Enter to add, Shift+Enter ignored** (single-line is correct here).
- Subtle 250ms highlight (`bg-primary/10` fade) on the most-recently-added row so the user sees where it landed.

**2. Optimistic add** (`src/contexts/ChecklistsContext.tsx`)
- `addTemplateItem` and `addEventChecklistItem` currently `await insert` then **re-fetch everything**. Change to:
  - Insert with `.select().single()` to get the new row back
  - Push it into local state directly (no full re-fetch)
- Result: item appears instantly, no flash, input stays focused, no network round-trip blocking the UI.

**3. Mobile polish**
- On mobile, the composer sticks to the bottom of the card content with safe spacing; input uses `inputMode="text"` and `enterKeyHint="done"` so the on-screen keyboard shows a Done key.

### Out of scope
- Multi-line / paste-many-items-at-once (could be a follow-up: "paste a list, split on newlines")
- Reordering UX changes
- Editing UX changes (already fine)

### Files changed
- `src/components/ChecklistCard.tsx` — new composer layout, inputRef + autofocus-after-add, recently-added highlight
- `src/contexts/ChecklistsContext.tsx` — optimistic local-state updates for `addTemplateItem` and `addEventChecklistItem` (drop the full re-fetch)

