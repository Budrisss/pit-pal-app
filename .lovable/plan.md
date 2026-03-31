

## Plan: Fix Racer Live View to Follow Selected Run Group

### Problem
The Racer Live View doesn't properly filter by the user's selected run group. It shows green flags and session info for other groups' sessions, instead of showing a standby screen when the user's group isn't active.

### Current Issues
1. **Green flag shows for any group's session** — The `primaryFlag` logic falls back to `activeSession` (any session on track) when no flags are active, even if it's not the racer's group.
2. **"Next session" shows global sessions** — `nextSession` picks the soonest upcoming session regardless of group, and the global session bar always shows.
3. **`sessionStates` uses time-based logic** — Same issue as the organizer view; sessions without times default to "upcoming" instead of using `sort_order`.

### Changes

**`src/pages/RacerLiveView.tsx`**

1. **Synthetic green flag only for user's group** — In the `primaryFlag` memo, remove the fallback to `activeSession` when `userRegTypeIds` is populated. Only show synthetic green when `myActiveSession` exists (the user's group is on track). When no flags are active and the user's group isn't running, `primaryFlag` will be `null`, triggering the existing "Standby" screen.

2. **`myNextSession` uses `sort_order` instead of `start_time`** — Change from sorting upcoming sessions by time to using `sort_order` position. Find the first upcoming session in sort order that matches the user's run group.

3. **`nextSession` (global) also uses `sort_order`** — Same fix as above for the global next session indicator.

4. **Synchronous initialization of `userRegTypeIds`** — Initialize state from `localStorage` synchronously in `useState` to prevent first-render flash showing wrong data:
   ```typescript
   const [userRegTypeIds, setUserRegTypeIds] = useState<Set<string>>(() => {
     const stored = localStorage.getItem(`my-run-groups-${eventId}`);
     return new Set(stored ? JSON.parse(stored) : []);
   });
   ```

5. **Hide global session bar when user has a group selected** — When `userRegTypeIds.size > 0`, don't show the "Current Track Session" / "Up Next" global bar (lines 744-769), since the user's personalized session banner already covers their group. This prevents confusion from showing another group's session info.

### What Won't Change
- Organizer Live Manage (`OrganizerLiveManage.tsx`) is completely separate and unaffected
- Flag display (red, yellow, black, etc.) still works the same — real flags from the organizer always show regardless of group
- Announcements still show for all users
- Black flag accept/dismiss logic unchanged

### Files Modified
- `src/pages/RacerLiveView.tsx` only

