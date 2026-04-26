# Fix organizer-side refresh bounce & timeout

## Problem

Two related bugs on the organizer side:

1. **Refresh on `/organizer/*` bounces to racer side.** `OrganizerShell` gates on `isApproved` from `OrganizerModeContext`, but that context initializes `isOrganizer=false` / `isApproved=false` and only sets them after an async Supabase query. While the query is in flight, the shell evaluates `!isApproved` as true and redirects to `/organizer/apply` (and from there the racer dashboard). If the query is slow or hiccups, you also get a "timeout" feel.
2. **Mode is not restored on refresh.** `last_active_mode` is persisted in `racer_profiles`, but nothing reads it on boot to send an organizer-mode user back into `/organizer`. So a refresh from `/dashboard` always lands on the racer side, even if their last active mode was organizer.

## Fix

### 1. Add a real "loading" state to `OrganizerModeContext`
- Track `orgStatusLoading` (true until both the `organizer_profiles` and `racer_profiles` lookups resolve).
- Expose it from the context.

### 2. Make `OrganizerShell` wait instead of bouncing
- In `src/layouts/OrganizerShell.tsx`, while `auth.loading || orgStatusLoading`, render the existing spinner.
- Only after both resolve, evaluate the `!isOrganizer` / `!isApproved` redirects.
- This eliminates the false-negative bounce on refresh.

### 3. Make the org-status query resilient
- In `OrganizerModeContext`, replace unhandled `.then(...)` chains with proper `try/catch`, set loading=false in a `finally`, and on transient error keep the previous known state instead of silently flipping to `false`.
- Cache the last-known `{isOrganizer, isApproved, organizerProfileId}` in `localStorage` keyed by `user.id`. Hydrate synchronously on mount so the shell can render organizer chrome immediately on refresh; the network call then confirms/updates. This removes the perceived timeout.

### 4. Restore last active mode on app boot
- In `OrganizerModeContext`, after `lastActiveMode` and `isApproved` are known, if:
  - the user is on `/` or `/dashboard` (a "neutral" racer landing) **and**
  - `lastActiveMode === "organizer"` **and**
  - `isApproved === true` **and**
  - this is a fresh page load (guarded by a ref so it runs once per mount)
  then `navigate("/organizer", { replace: true })`.
- Do NOT redirect from deep racer routes (e.g. `/garage`, `/events/:id`) — only the neutral landing spots, so we don't fight the user's actual navigation.

### 5. Login-time routing — harden it
- `Login.tsx` already routes approved organizers to `/choose-mode`. Update it so that if `last_active_mode === "organizer"`, it skips the chooser and goes straight to `/organizer`. The chooser is still reachable via the in-app Mode switch.

## Files to change
- `src/contexts/OrganizerModeContext.tsx` — add `orgStatusLoading`, localStorage cache, error handling, boot-time mode restoration.
- `src/layouts/OrganizerShell.tsx` — gate redirect behind `orgStatusLoading`.
- `src/pages/Login.tsx` — when `last_active_mode === "organizer"` and approved, route directly to `/organizer` instead of `/choose-mode`.

## Out of scope
- No DB migrations needed (`last_active_mode` already exists).
- No edge-function changes — this is a client-side gating race, not a serverless timeout.
- Racer-side routing untouched.

## Expected result
- Refreshing any `/organizer/*` page stays on the organizer side (brief spinner, then renders).
- Refreshing the app while last active mode was organizer lands you back in `/organizer` automatically.
- Transient network slowness no longer kicks an approved organizer back to the racer dashboard.