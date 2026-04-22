

## Onboard new users with profile details that flow into Settings

### Goal
After a user verifies their email and creates their account, walk them through a quick onboarding step that captures **Driver Name** and **Primary Vehicle**. This data lands in their racer profile and is shown live on the Settings → Profile card (replacing the current hardcoded "John Racer / 2018 Mazda MX-5 Miata" placeholder).

### What the user will experience

1. Sign up → verify 8-digit email code (unchanged).
2. Immediately after verification, instead of jumping straight to the dashboard, show a new **"Complete Your Profile"** screen with:
   - **Driver Name** (required, prefilled from email handle)
   - **Primary Vehicle** — two quick fields: Year/Make/Model (e.g. "2018 Mazda MX-5 Miata") and optional class/notes
   - "Skip for now" link (so it never blocks entry)
   - "Save & Continue" button → goes to `/dashboard`
3. The Settings → Profile card now shows real data:
   - Driver Name = `racer_profiles.display_name`
   - Primary Vehicle = the car flagged as primary
   - "Edit Profile" button opens an inline editor that updates both.
4. Existing users who never completed onboarding will see the same prompt the next time they hit `/dashboard` (one-time, dismissible).

### Data model changes

- `racer_profiles` already has `display_name` and `bio`. Add:
  - `primary_car_id uuid NULL` — points at the user's primary car in `cars`.
  - `onboarding_completed boolean NOT NULL DEFAULT false` — tracks whether the new-user flow has been finished or skipped.
- No changes to `auth.users`. No new table required.

### Code changes

1. **New page**: `src/pages/OnboardingProfile.tsx`
   - Form with Driver Name + Primary Vehicle (Year, Make, Model, optional Color/Notes).
   - On save:
     - `upsert` into `racer_profiles` (`display_name`, `onboarding_completed = true`).
     - Insert a row into `cars` with the entered vehicle.
     - Update `racer_profiles.primary_car_id` to the new car id.
   - On skip: set `onboarding_completed = true` only.
   - Redirect to `/dashboard`.

2. **Routing**: `src/App.tsx`
   - Add `/onboarding` route (protected).

3. **Signup flow**: `src/pages/SignUp.tsx`
   - After successful `verifyOtp`, navigate to `/onboarding` instead of `/dashboard`.

4. **Onboarding gate**: lightweight check in `ProtectedRoute` (or a small hook used by `Dashboard`) that, when `racer_profiles.onboarding_completed === false`, redirects to `/onboarding`. This catches users who close the tab mid-onboarding.

5. **Settings → Profile card**: `src/pages/Settings.tsx`
   - Replace the hardcoded block with live data fetched from `racer_profiles` + the linked primary car from `cars`.
   - Wire "Edit Profile" to an inline edit mode (reusing the same fields as onboarding) that updates `racer_profiles.display_name` and either swaps `primary_car_id` to an existing car or creates a new one.
   - Show a graceful empty state if no primary vehicle is set yet ("Add your primary vehicle").

6. **GridID page**: already reads `racer_profiles.display_name`, so no change needed — it'll automatically reflect the new name.

### Security / RLS
- Existing `racer_profiles` policies already cover insert/update by `auth.uid() = user_id`, so the new columns are protected automatically.
- Existing `cars` policies already cover insert by the owning user.
- No RLS changes needed.

### Files to create / update
- **Create**: `src/pages/OnboardingProfile.tsx`
- **Update**: `src/pages/SignUp.tsx`, `src/pages/Settings.tsx`, `src/App.tsx`, `src/components/ProtectedRoute.tsx`
- **Migration**: add `primary_car_id` and `onboarding_completed` columns to `racer_profiles`.

### Out of scope (can do later if you want)
- Avatar upload during onboarding.
- Multi-step onboarding (track preferences, experience level, etc.).
- Email verification copy/branding tweaks (already addressed in prior turn).

