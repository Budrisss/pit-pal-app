

## Plan: Hide "My Run Groups" for Personal Events

### Problem
The "My Run Groups" selector card in Session Management is irrelevant for personal events (where `public_event_id` is null). Run groups only apply to organizer-created public events with registration types.

### Change

**File: `src/pages/SessionManagement.tsx`**

Wrap the "My Run Group Selector" card (lines 1122–1177) with an additional condition so it only renders when `publicEventId` is set:

```
{sessions.length > 0 && publicEventId && (
```

This single condition change hides the entire run group selector, car number badges, and "Countdown tracks" note for personal events while keeping all run-group-aware countdown logic intact for registered public events.

Additionally, update the "Next Session" label in the status strip (line 970) to never show "Your Next Session" when there's no `publicEventId`, since the concept doesn't apply.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/SessionManagement.tsx` | Add `publicEventId` guard to run group selector render condition; adjust label text for personal events |

