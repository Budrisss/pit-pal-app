---
name: Authentication
description: Email OTP signup via Supabase, password recovery, session restore. SMS/Twilio path deprecated.
type: feature
---
- Signup: Supabase email OTP (`signInWithOtp` → `verifyOtp` type:'email' → `updateUser({password})`). 6-digit code, no custom edge fns. `src/pages/SignUp.tsx`.
- Login: email + password (`Login.tsx`).
- Password recovery: `ForgotPassword.tsx` → `ResetPassword.tsx` (checks `type=recovery` URL hash).
- Session: `AuthContext` sets up `onAuthStateChange` BEFORE `getSession()`. Auto-confirm OFF (OTP IS the confirmation).
- Deprecated: `send-verification-code` / `verify-code` edge fns + `verification_codes` table (Twilio SMS). Files remain but unused on signup.
