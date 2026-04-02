

## Plan: Add Forgot Password Feature

### What's needed
There's no password reset flow. We need three things:

1. **"Forgot password?" link on Login page** — below the password field, links to a dedicated page
2. **Forgot Password page (`/forgot-password`)** — email input form that sends a reset link via the auth system
3. **Reset Password page (`/reset-password`)** — where the user lands from the email link, enters a new password

### Changes

**1. `src/pages/Login.tsx`**
- Add a "Forgot password?" link between the password field and the submit button, linking to `/forgot-password`

**2. New file: `src/pages/ForgotPassword.tsx`**
- Matches the Login page design (same hero background, logo nav, card layout)
- Email input field
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Shows success message telling user to check their email
- Link back to login

**3. New file: `src/pages/ResetPassword.tsx`**
- Checks URL hash for `type=recovery` to confirm valid reset link
- New password + confirm password form
- Calls `supabase.auth.updateUser({ password })` to save the new password
- On success, redirects to `/dashboard`
- Shows error if link is invalid/expired

**4. `src/App.tsx`**
- Add two public routes: `/forgot-password` and `/reset-password`

### Files Modified
- `src/pages/Login.tsx` — add forgot password link
- `src/pages/ForgotPassword.tsx` — new
- `src/pages/ResetPassword.tsx` — new
- `src/App.tsx` — add routes

