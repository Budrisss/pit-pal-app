

## Plan: Add Progress Bar to Driver Live View Active Session Banner

### Change

**File: `src/pages/DriverLiveView.tsx`**

1. Update the `activeSessionInfo` computation to include a `progress` value (0→1) representing elapsed time, using the same logic as Session Management: `elapsedMs / totalMs`.

2. Add a progress bar to the existing "Active Session Timer" banner (around line 120). Insert a slim progress bar below the timer text, styled to match the Driver View theme — using `bg-primary/20` for the track and `bg-primary` for the fill, with the same glassmorphic rounded style.

The banner already exists; we're just adding the progress calculation and a `<div>` progress bar element inside it.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/DriverLiveView.tsx` | Add `progress` to `activeSessionInfo`; render progress bar inside the existing active session banner |

