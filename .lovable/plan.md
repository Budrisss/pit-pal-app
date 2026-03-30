

## Organizer Settings Page

### Overview
When in organizer mode, the `/settings` route will show an organizer-specific settings page instead of the user settings. The existing user settings remain untouched for non-organizer mode.

### Architecture
Modify `Settings.tsx` to check `isOrganizerMode` from `OrganizerModeContext`. If true, render an `OrganizerSettings` component; if false, render the current user settings as-is.

### New Component: `src/pages/OrganizerSettings.tsx`

**1. Organization Profile Card**
- Editable fields: org name, contact email, phone, website, description
- Pre-populated from `organizer_profiles` table
- Save button updates the row in `organizer_profiles`

**2. Event Defaults Card**
- Default session duration (dropdown: 15/20/25/30 min)
- Default registration types template (text list)
- These will be stored in `localStorage` for now (no new table needed), with a note that they can be persisted later

**3. Notification Preferences Card**
- Toggle switches for: New registrations, Registration cancellations, Session reminders, Announcement delivery confirmations
- Stored in `localStorage` for now

**4. Staff / Co-organizers Card**
- Display placeholder UI showing "Coming Soon" badge
- Shows concept of invite-by-email and role assignment (read-only, full access)
- No database changes needed yet

**5. Account Card**
- Shows signed-in email
- Log Out button

### Changes

| File | Change |
|---|---|
| `src/pages/OrganizerSettings.tsx` | New file with all 5 cards above |
| `src/pages/Settings.tsx` | Import `useOrganizerMode`, conditionally render `OrganizerSettings` when `isOrganizerMode` is true |

### No database changes required
All organizer profile fields already exist in `organizer_profiles`. Event defaults and notification prefs use localStorage for now.

