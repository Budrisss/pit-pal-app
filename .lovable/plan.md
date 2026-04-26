# Restructure Organizer Experience: Separate Shell, Same Account

## Why
The current localStorage `toggleMode` is fragile: it doesn't survive devices, doesn't deep-link, and the "which hat am I wearing?" answer relies on a small label change. We'll keep one auth account (so racer data stays linked) but make organizer mode a **first-class sibling app** with its own URL namespace, its own nav/header/brand, and an explicit chooser at sign-in.

---

## 1. New routing namespace: `/organizer/*`

Move organizer surfaces under a dedicated path prefix:

| Old route | New route |
|---|---|
| `/event-organizer` | `/organizer` (dashboard) |
| `/live-manage/:eventId` | `/organizer/live/:eventId` |
| `/organizer-stamp` | `/organizer/stamps` |
| `/organizer-signup` | `/organizer/apply` |
| Organizer-side `OrganizerSettings` (currently rendered inside `Settings.tsx` when `isOrganizerMode`) | `/organizer/settings` (own page) |

- Add a new `<OrganizerRoute>` guard wrapping these — requires logged-in **and** `organizer_profiles.approved = true`. Unapproved → redirect to `/organizer/apply`. Not an organizer at all → redirect to `/dashboard`.
- Old paths get permanent `<Navigate>` redirects so existing bookmarks keep working.

## 2. Dedicated organizer shell (brand separation)

Create `src/layouts/OrganizerShell.tsx` that wraps every `/organizer/*` route:

- **New header** `OrganizerNavigation` + `OrganizerDesktopNavigation` (replaces the user nav while inside the shell).
  - Different accent color (e.g. amber/steel-blue instead of F1 red) — sourced from new tokens in `index.css` so it stays themeable.
  - Logo treatment: "Track Side **Ops** · Organizer" wordmark.
  - Persistent "Switch to Racer" button in the header (replaces the bottom-nav toggle).
- **Document title** changes to `Organizer · Track Side Ops` while in the shell.
- Different favicon-ish accent strip at top of viewport so even at a glance the mode is unmistakable.
- Mobile bottom nav swapped to organizer items only (Dashboard / Stamps / Settings / Switch).

Racer side keeps the existing `Navigation` / `DesktopNavigation` unchanged.

## 3. Post-login role chooser

New page `src/pages/ModeChooser.tsx` at `/choose-mode`:

- Shown automatically after sign-in **if and only if** the user is an approved organizer (otherwise straight to `/dashboard` as today).
- Two large cards: **Continue as Racer** → `/dashboard`, **Continue as Organizer** → `/organizer`.
- Optional checkbox "Remember my choice on this device" (stored in localStorage as a hint, not a security boundary).
- `Login.tsx` post-success logic: query `organizer_profiles` (approved) for the user; if found → `/choose-mode`, else → `/dashboard` (current behavior). Same hook on `SignUp` completion if they happen to already have an approved profile (rare).
- Direct visits to `/login` while already authenticated as an approved organizer also route through the chooser (unless the "remember" hint is set).

## 4. Server-side mode persistence (lightweight)

Add a `last_active_mode text` column on `racer_profiles` (`'racer' | 'organizer'`, default `'racer'`).

- Updated whenever the user enters either shell.
- Used as the default selection on the chooser and as the auto-redirect target if the "remember" hint was set.
- Survives device changes — the racer's primary phone and the laptop they organize from will both remember their last mode.

## 5. Refactor `OrganizerModeContext`

Rename to `OrganizerContext`. Drop `isOrganizerMode` / `toggleMode` / localStorage. Keep:

- `isOrganizer`, `isApproved`, `organizerProfileId` (unchanged data fetch)
- New: `enterOrganizerMode()` / `exitOrganizerMode()` helpers that just `navigate('/organizer')` or `navigate('/dashboard')` and update `last_active_mode` server-side.

Update the 8 call sites found in the codebase:
- `Navigation.tsx` / `DesktopNavigation.tsx` — remove toggle button, only render in racer shell.
- `Settings.tsx` — remove `if (isOrganizerMode) return <OrganizerSettings />` branch (organizer settings moves to its own `/organizer/settings` route).
- `LocalEvents.tsx`, `PublicEventPreview.tsx` — currently use `isOrganizerMode` to decide whether the viewer is "the owning organizer". Replace with: check current pathname starts with `/organizer/` **and** `event.organizer_id === organizerProfileId`. Same UX outcome, no toggle dependency.
- `EventOrganizer.tsx`, `OrganizerStampPortal.tsx`, `OrganizerSettings.tsx`, `OrganizerLiveManage.tsx` — only need `organizerProfileId`, no change.

## 6. Apply flow polish

`/organizer/apply` (the renamed signup):
- If user is already approved → redirect into `/organizer`.
- If application is pending → show a "Pending review" status card instead of the form.
- After submission, land on the pending status card (not racer dashboard), so it's clear what's next.

## 7. Migration & cleanup

- Add SPA redirects (React Router `<Navigate>`) for all old organizer paths.
- Remove the toggle UI from both navs.
- Remove `localStorage.organizerMode` reads (a stray entry left behind is harmless).
- Update memory: `mem://features/events` to reflect new shell + chooser instead of toggle.

## What stays the same
- Single auth account / single password — racer data stays linked to the same user.
- All RLS policies (they already key off `organizer_profiles.user_id` + `approved`).
- Existing organizer features (event creation, live manage, stamps, LoRa gateway card) — only their URLs and surrounding chrome change.

## Out of scope (can do later if desired)
- A truly separate `/organizer/login` entry that bypasses the chooser. Easy follow-up: just a route alias that sets the "remember organizer" hint then forwards to `/login`.
- Different auth account per role — explicitly rejected per the chosen "same account, separate shell" model.
