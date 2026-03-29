

## Fix: Show Next Session Countdown Alongside Active Session

### Problem
The next session countdown banner (orange/red) is conditionally rendered with `!activeSession &&`, so it only appears when no session is active. During an active session, the organizer cannot see when the next session starts.

### Change

**`src/pages/OrganizerLiveManage.tsx`**

Remove the `!activeSession &&` guard from the next countdown block (line 363), so both the active session remaining time (green) and the next session countdown (orange/red) display simultaneously.

Change:
```tsx
{!activeSession && nextCountdown && (
```
To:
```tsx
{nextCountdown && (
```

Also update the "no more sessions" fallback (line 392) from `!activeSession && !nextCountdown` to just `!nextCountdown` so it still shows when everything is done.

