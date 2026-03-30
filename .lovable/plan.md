

# Black Flag Accept/Dismiss Logic for Racer Live View

## Problem
Currently, a targeted black flag takes over the entire racer screen and blocks the green flag view for the targeted driver indefinitely. We need differentiated behavior:

- **Targeted black flag** (specific car): Appears full-screen for 60 seconds minimum. Driver can tap "Accept" to acknowledge and minimize it to a persistent banner. If not accepted, it stays full-screen but other drivers still see green.
- **Global black flag** (all drivers, `target_user_id` is null): Full-screen, cannot be accepted or minimized. Everyone must pit.

## Approach
This is entirely a **client-side UI change** in `RacerLiveView.tsx`. No database changes needed — we already have `target_user_id` to distinguish targeted vs global flags.

## Implementation — `src/pages/RacerLiveView.tsx`

### 1. New state for black flag acknowledgment
- `blackFlagAccepted: string | null` — stores the flag ID that was accepted
- `blackFlagReceivedAt: Record<string, number>` — tracks when each black flag first appeared (timestamp)

### 2. Track when a targeted black flag arrives
- When a new black flag with `target_user_id === user.id` appears in `activeFlags`, record `Date.now()` as its received time
- Play a haptic/vibration if available for urgency

### 3. Display logic (priority system update)
- **Global black flag** (`target_user_id === null`, `flag_type === "black"`): Full-screen, no Accept button, current behavior unchanged
- **Targeted black flag** (`target_user_id === user.id`):
  - If NOT accepted and less than 60s elapsed → full-screen black flag, Accept button disabled (greyed out with countdown)
  - If NOT accepted and 60s+ elapsed → full-screen black flag, Accept button enabled and pulsing
  - If accepted → collapse to a persistent warning banner at top (below header), showing "⚫ BLACK FLAG — PIT IN" with car number. The underlying green/session flag shows normally behind it.

### 4. Accept button UI
- Large "ACKNOWLEDGE — PIT IN" button at bottom of the black flag screen
- Disabled for first 60 seconds with countdown text: "Accept in 45s..."
- After 60s: enabled, pulsing orange/red
- On tap: sets `blackFlagAccepted` to the flag ID, collapses to banner

### 5. Persistent minimized banner (after accept)
- Thin banner below the top bar: black background, white text: "⚫ BLACK FLAG ACTIVE — PIT IN IMMEDIATELY"
- Stays until the organizer deactivates the flag (flag disappears from `activeFlags`)
- When flag is deactivated, clear the accepted state automatically

### 6. Priority adjustment
- When a targeted black flag is accepted, remove it from the full-screen priority system so green/other flags show normally
- Global black flags always take priority and cannot be bypassed

## Files to Edit
- **`src/pages/RacerLiveView.tsx`** — All changes are here: new state, accept logic, timer tracking, conditional rendering for full-screen vs banner mode

