

## Plan: Add Admin Page with Role-Based Access

### Overview
Create a secure admin dashboard accessible only to users with an `admin` role. This follows the security best practice of storing roles in a separate `user_roles` table (never on profiles or user tables) and using a `SECURITY DEFINER` function to check roles without recursive RLS issues.

### Database Changes

**1. Migration: Create role system**
- Create enum `app_role` with values `admin`, `user`
- Create `user_roles` table (user_id, role) with RLS enabled
- RLS policy: only admins can SELECT all rows; users can see their own
- Create `has_role(uuid, app_role)` SECURITY DEFINER function for safe role checks in RLS and client code

**2. Seed your admin user**
- Use the insert tool to add your user ID to `user_roles` with role `admin`
- You'll need to provide your user ID (visible in Settings or we can query it)

### Frontend Changes

**3. New file: `src/hooks/useAdmin.ts`**
- Hook that queries `user_roles` to check if the current user has the `admin` role
- Returns `{ isAdmin, loading }`

**4. New file: `src/pages/Admin.tsx`**
- Protected page that checks `isAdmin` and redirects non-admins
- Tabs/sections for:
  - **Organizer Approvals**: List pending organizer profiles (`approved = false`), approve/reject buttons
  - **User Management**: List users with subscriptions, ability to remove/ban
  - **Organizer Management**: List approved organizers, ability to revoke approval
- Uses existing table components and the app's dark racing aesthetic

**5. Update `src/App.tsx`**
- Add `/admin` as a protected route

**6. Update `src/pages/Settings.tsx`**
- Show an "Admin Panel" link only when `isAdmin` is true

### Security Model
- The admin page is NOT in any navigation menu — only accessible via Settings link or direct URL
- The `has_role` function is `SECURITY DEFINER`, preventing RLS recursion
- All admin actions (approve organizer, update subscriptions) go through the backend with RLS policies that check `has_role(auth.uid(), 'admin')`
- No client-side role storage — role is always verified server-side via the `user_roles` table

### Technical Details
- Admin approves organizers by updating `organizer_profiles.approved` — requires a new RLS policy allowing admins to update that table
- Admin can delete users' subscription rows or set tiers — requires admin UPDATE policy on `user_subscriptions`
- Admin can view all `organizer_profiles` — requires admin SELECT policy

