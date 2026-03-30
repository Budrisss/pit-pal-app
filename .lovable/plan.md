

## Plan: Show All Sessions in Flag Review

### Problem
The "Flag Review by Session" section currently filters to only `completed` sessions. This means active or upcoming sessions with flags aren't visible in the review list.

### Change
In `src/pages/OrganizerLiveManage.tsx`, remove the `.filter(s => s.state === "completed")` on line 1046 so all sessions appear in the flag review section. Also update the visibility condition (line ~1029) to show the section whenever there are any sessions, not just completed ones. Add a small status badge (e.g., "Active", "Completed", "Upcoming") next to each session name for clarity.

### Files Modified
- `src/pages/OrganizerLiveManage.tsx` — Remove completed-only filter, add session state badge, update section visibility condition and description text.

