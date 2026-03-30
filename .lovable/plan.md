

## Plan: Distinguish Global vs Local Flags in Active Flags List

### What Changes

Restructure the Active Flags section into two clearly labeled groups with visual distinction:

1. **"Track Status" section** — for global flags (green, yellow, red, black, white, checkered)
   - Header: "🏁 Track Status" with a subtle label like "Replaces previous"
   - Keep existing styling but add a section header with a muted description explaining these override each other

2. **"Local Cautions" section** — for stackable flags (yellow_turn, blue)
   - Header: "⚠️ Local Cautions" with label "These stack — won't be cleared by track status changes"
   - Group the existing yellow_turn and blue flag blocks under this header
   - Add a "Clear All Local" button specific to this section

### File: `src/pages/OrganizerLiveManage.tsx` (lines ~622-674)

- Replace the single "Active Flags" header with two sub-sections
- **Track Status** block: wraps the global flags list (lines 630-646) with its own header, bordered container, and a subtle "only one active at a time" note
- **Local Cautions** block: wraps yellow_turn + blue sections (lines 647-672) with its own header, bordered container, and a "stacks with track status" note
- Keep "Clear All" at top level; optionally add per-section clear buttons
- Add `Badge` labels: `<Badge variant="outline">Replaces</Badge>` on global flags, `<Badge variant="outline">Stacks</Badge>` on local cautions

### Visual Design
- Global section: darker muted background, single-flag emphasis
- Local section: slightly highlighted border (amber/blue gradient border), shows stacking nature
- Small descriptive text under each section header explaining behavior

