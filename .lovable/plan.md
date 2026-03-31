

## Plan: Checkered Flag Auto-Dismiss + Enhanced Standby

### What Changes

**`src/pages/RacerLiveView.tsx` only** — no organizer impact.

### 1. Track when checkered flag appeared (client-side)

Add a `checkeredShownAt` ref that records when a checkered flag first becomes the primary flag. Reset it when the flag changes to something else.

```typescript
const checkeredShownAtRef = useRef<number | null>(null);
```

In a `useEffect` watching `primaryFlag`:
- If `primaryFlag?.flag_type === "checkered"` and ref is null → set to `Date.now()`
- If flag changes away from checkered → reset to null

### 2. Auto-dismiss checkered after ~3 minutes

Add a `checkeredExpired` state (boolean). A `useEffect` checks if `checkeredShownAtRef` is set and 180 seconds have elapsed (using `currentTime` which already ticks every second). When expired, set `checkeredExpired = true`.

In the `primaryFlag` memo, if the real flag is checkered but `checkeredExpired` is true, skip it and fall through to the green/standby logic (returning `null` → standby screen).

Reset `checkeredExpired` to `false` whenever a new non-checkered flag becomes active.

### 3. Enhanced standby screen with next-session info

Update the standby block (lines 707-717) to show the racer's next session info when available:

- If `myNextSession` exists: show "Your Next Session" with session name and countdown (reusing `myNextCountdown`)
- If no next session: show "All sessions complete" or the current "Standby" text

The bottom session banner (lines 722-761) continues to work as-is — the standby area just gets a richer display so the racer has context during long gaps.

### Summary of Logic Flow (gap between sessions)

```text
Session ends → Organizer throws checkered
  → Racer sees checkered flag full-screen (up to 3 min)
  → After 3 min: auto-transitions to standby
  → Standby shows "Your Next Session: [name] — in XX:XX"
  → When organizer starts next session → green flag appears
```

### Files Modified
- `src/pages/RacerLiveView.tsx`

