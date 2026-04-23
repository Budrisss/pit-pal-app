

## Make "New Setup Sheet" Card Collapsible

### Why this is a good call
Right now the upload card is always expanded while the Chassis Setup Form is collapsed — that's asymmetric and pushes the manual form (and the saved setups list) below the fold. Making both collapsible puts the two options side-by-side visually as equal-weight choices, so users immediately see "I can upload a sheet OR fill out the form" without scrolling.

### What changes

**`src/pages/Setups.tsx`** — wrap the existing "New Setup Sheet" card body in a `Collapsible`, matching the pattern already used by the Chassis Setup Form card:

- Card header becomes a `CollapsibleTrigger` row showing the title, helper text, and a chevron that rotates on open.
- Card body (car/event selectors + `SetupAttachments` upload UI) moves inside `CollapsibleContent`.
- Default state: **collapsed** (same as the chassis form), so both options present as peers.
- Local state: `const [uploadOpen, setUploadOpen] = useState(false);`

### Visual result
```text
┌─ Track Your Vehicle Setups (intro) ─┐
└─────────────────────────────────────┘
┌─ ▸ New Setup Sheet         (upload) ┐  ← collapsed, click to expand
└─────────────────────────────────────┘
┌─ ▸ Chassis Setup Form     (manual)  ┐  ← collapsed, click to expand
└─────────────────────────────────────┘
┌─ Saved Setups   [search...........] ┐
│  ...list...                          │
└─────────────────────────────────────┘
```

### Files changed
- `src/pages/Setups.tsx` — add `Collapsible` wrapper around the New Setup Sheet card content, add `uploadOpen` state, add chevron icon to header.

### Out of scope
- Auto-expanding either card based on prior usage
- Remembering open/closed state across sessions
- Restyling the chassis form card

