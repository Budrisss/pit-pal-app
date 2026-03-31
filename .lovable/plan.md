

## Plan: Fix Session Sequence Display in Organizer Live Manage

### Problem
The organizer live management view shows sessions out of sequence. The "next session" countdown picks sessions based on `start_time` sorting rather than the defined `sort_order`, causing mismatches (e.g., showing Session 10 instead of Session 9). Sessions without a start time are also handled inconsistently.

### Changes

**`src/pages/OrganizerLiveManage.tsx`**

1. **Sort sessions deterministically by `sort_order`** — After fetching and mapping sessions, explicitly sort by `sort_order` so the session list always renders in the organizer's intended sequence.

2. **Fix `nextCountdown` to use `sort_order`** — Instead of sorting upcoming sessions by `start_time`, use the `sort_order`-based sequence. The "next" session should be the first session in `sort_order` that hasn't completed yet (and isn't currently active). This ensures Session 9 shows before Session 10 regardless of their start times.

3. **Fix `sessionStates` for sessions without start times** — Sessions missing `start_time` or `duration_minutes` should derive their state from their position relative to completed/active sessions (i.e., if all prior sessions by `sort_order` are completed, it becomes the next upcoming one), rather than always defaulting to "upcoming".

### Technical Details

- The `sessionStates` memo (line 429) will continue using time-based state for sessions with times, but sessions without times will inherit state from their sequence position
- The `nextCountdown` memo (line 569) will find the first non-completed, non-active session by `sort_order` instead of sorting by start_time
- The session list render (line 974) already iterates `sessions` which comes sorted by `sort_order` from the DB query — this is correct and won't change
- The `activeSession` derivation (line 470) remains time-based since it determines what's actually running right now

