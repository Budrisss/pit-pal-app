

# Events Page Design Improvement

## Current Issues
- The hero banner uses a static image with generic text ("Live the Racing Spirit") that adds visual noise without value
- The countdown section hardcodes "Thunderhill Track Day" instead of showing the actual next event name
- Event cards have too many buttons crammed together (Details, Edit, Delete, Start/Review) making them cluttered
- The page lacks visual hierarchy and status-based grouping
- No filtering or tab-based organization by status

## Plan

### 1. Replace hero banner with a smarter countdown section
- Remove the static racing image banner
- Redesign the countdown as a prominent, glassmorphism-style card showing the actual next upcoming event name, track, date, and countdown timer
- If no upcoming events, show a motivational empty state instead

### 2. Add status filter tabs
- Add tabs at the top: **All**, **Upcoming**, **Active**, **Completed**
- Filter the event grid based on the selected tab
- Show event counts in each tab badge

### 3. Redesign EventCard for cleaner layout
- Move the status badge to a colored left border/accent strip instead of a floating badge
- Group date and time on a single line with a separator
- Consolidate action buttons: primary action (Details) as main button, Edit/Delete into a dropdown menu (three-dot icon)
- Keep Start and Review as distinct accent buttons since they're primary actions
- Add subtle glassmorphism background matching the app's visual identity

### 4. Fix countdown bug
- Use the actual next event's name and track in the countdown display instead of hardcoded "Thunderhill Track Day"

### 5. Improve empty state
- Better empty state with a larger illustration area, descriptive text, and a prominent "Create Event" CTA button

## Files to modify
- **`src/pages/Events.tsx`** — Replace hero banner, add filter tabs, fix countdown text, improve empty state
- **`src/components/EventCard.tsx`** — Redesign card layout, consolidate buttons into dropdown menu

## Technical details
- Use existing `Tabs` component from `@/components/ui/tabs` for filtering
- Use `DropdownMenu` from `@/components/ui/dropdown-menu` for Edit/Delete actions
- Filter events client-side with `useMemo` based on selected tab
- Maintain all existing functionality (edit, delete, start, review, checklist dialog)

