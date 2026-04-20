

## Wide-screen layout for Live Manage

Currently `OrganizerLiveManage.tsx` wraps everything in `max-w-4xl mx-auto` and stacks all panels vertically — wasted space on a 1280px+ monitor with lots of scrolling. Goal: a 2-column "race control" layout that keeps the critical, time-sensitive panels visible together.

### Layout

Bump container to `max-w-7xl` at `xl:` and split into a 2-column grid (`xl:grid-cols-3`) below the header:

```text
┌───────────────────────────────────────────────────────────────┐
│ Header (event name • clock • registration count)              │
├───────────────────────────────────────────────────────────────┤
│ Active Session / Standby / Next Session Countdown (full row)  │
├───────────────────────────────┬───────────────────────────────┤
│ LEFT COLUMN (xl:col-span-2)   │ RIGHT COLUMN (xl:col-span-1)  │
│                               │ — sticky on xl                │
│ • Flag Control Panel          │ • Live Track Map              │
│ • Live Track Map (mobile)     │ • Connectivity Check          │
│ • Sessions list               │ • Paired Radios               │
│ • Flag History                │ • Participants / Crew toggle  │
└───────────────────────────────┴───────────────────────────────┘
```

Reasoning for split:
- **Left = action surface**: flag controls (largest, most-used) + session timeline + history review. These need width for buttons and lists.
- **Right = situational awareness**: map, radio health, participant roster. Naturally narrower, and useful to keep visible while operating flags. Wrap in `xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto` so it stays on-screen as the left column scrolls.

Below `xl` (≤1279px), the grid collapses to single-column and order/layout is unchanged from today — mobile/tablet behavior preserved.

### Implementation

Single file: `src/pages/OrganizerLiveManage.tsx`

1. Change container `max-w-4xl` → `max-w-4xl xl:max-w-7xl` on the main wrapper (line ~950).
2. Keep Header + Active/Standby/Next Session Countdown blocks as full-width above the grid.
3. Wrap the remaining sections in `<div className="xl:grid xl:grid-cols-3 xl:gap-6">`:
   - Left wrapper: `xl:col-span-2 space-y-6` containing Flag Control Panel, Sessions list, Flag History.
   - Right wrapper: `xl:col-span-1 space-y-6 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto` containing Live Track Map, Connectivity Check, Paired Radios, Participants.
4. Internal panel content unchanged — only the outer grid + container width change. Dialogs (Black/Yellow/Blue Flag, Delete) stay outside the grid.

### Out of scope

- Resizable panels / user-saved layout
- Reordering panels via drag
- Compact "race control" theme restyle
- Changes to mobile/tablet layout

