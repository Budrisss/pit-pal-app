

## Plan: Clear Local Flags Between Sessions & Save Per Session

### Problem
Local caution flags (`yellow_turn` and `blue`) are explicitly excluded from deactivation when sessions transition. This means a local yellow from Session 1 persists into Session 2 as an active flag, which is incorrect — each session should start clean.

### Changes

**File: `src/pages/OrganizerLiveManage.tsx`**

1. **Auto-checkered (session ends)** — Remove the `.neq("flag_type", "yellow_turn").neq("flag_type", "blue")` exclusions from the deactivation query at ~line 606-612. This ensures ALL active flags (including local yellows and blues) are deactivated when a session ends.

2. **Auto-green (session starts)** — Same change at ~line 581-587. Remove the local-flag exclusions so the new session starts with a clean slate (only the new green flag active).

3. **Manual checkered flag (`handleSendFlag("checkered")`)** — Update `handleSendFlag` at ~line 286 to also clear local flags when the flag type is `"checkered"`. Currently it always excludes `yellow_turn` and `blue` from deactivation. When sending a checkered flag, all flags should be deactivated.

### What stays the same
- Local flags are still excluded from deactivation for non-session-ending flag changes (e.g., sending a yellow or red flag should not clear local cautions — those are independent).
- All flags already have `session_id` set via `activeSessionIdRef.current`, so the history per session is already saved correctly.

### Summary of behavior after fix
- Session ends → all flags (global + local) deactivated, checkered inserted
- Session starts → all flags deactivated, green inserted
- Mid-session flag change (e.g., yellow → green) → local flags still preserved (existing behavior)

