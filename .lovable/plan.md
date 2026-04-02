

## Plan: Remove Duplicate Inline Timer from Clock Strip

### Problem
When a session is active, two separate "time remaining" displays appear: a small inline widget inside the clock/status strip (lines 969–977) and the full-width banner with progress bar below it (lines 1020–1050). The user wants to keep only the large banner.

### Change

**File: `src/pages/SessionManagement.tsx`**

Remove the inline active-session timer block (lines 969–978) that renders inside the clock strip when `activeSessionRemainingTime && currentActiveSession` is true. The large banner at lines 1020–1050 already shows the session name, time remaining, and progress bar.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/SessionManagement.tsx` | Remove the `activeSessionRemainingTime` inline block (lines 969–978) from the clock strip |

