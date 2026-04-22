

## Switch signup verification from SMS to email

Currently signup uses **SMS OTP via Twilio** (`send-verification-code` / `verify-code` edge functions writing to a `verification_codes` table keyed by phone). You want to verify via **email** instead.

The cleanest path is to use **Supabase's built-in email OTP** — no custom edge functions, no custom code table, no Twilio cost on signup. Supabase emails a 6-digit code, you verify it with one SDK call, and the account is created automatically.

### How it will work for the user

1. Signup form collects: email, password, name, etc. (whatever fields you currently collect — phone becomes optional)
2. User clicks "Send verification code" → Supabase emails them a 6-digit OTP from your branded sender domain
3. User enters the code → account is created and they're logged in
4. Redirect to `/dashboard`

### Changes

**`src/pages/SignUp.tsx`**
- Replace the phone-OTP step with an email-OTP step
- Step 1: collect email + password + profile fields, call `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { ...profileFields } } })` to send the code
- Step 2: 6-digit input, call `supabase.auth.verifyOtp({ email, token, type: 'email' })` to verify + auto-login
- After successful verify, set the password via `supabase.auth.updateUser({ password })` so the user can log in normally next time
- Keep phone as an optional profile field (stored in profile, not used for auth)

**Auth config** (via `configure_auth` tool)
- Enable email OTP / email confirmations
- Keep auto-confirm OFF (the OTP verification IS the confirmation)

**Branded verification email** (recommended, optional)
- Scaffold the Lovable auth email templates so the verification email matches Track Side Ops branding (logo, dark theme, red accent) instead of the default Supabase template
- Requires a verified sender domain. Your project has `tracksideops.com` configured — we'll use a `notify.tracksideops.com` subdomain via the email setup dialog
- If you skip this step, signup still works — users just get the default unbranded verification email

**Decommission SMS path (cleanup)**
- Remove `send-verification-code` and `verify-code` edge functions from active use (leave files for reference or delete)
- The `verification_codes` table can stay (harmless) or be dropped in a follow-up

### What stays the same

- `Login.tsx` — unchanged (email + password)
- `ForgotPassword.tsx` / `ResetPassword.tsx` — unchanged
- `AuthContext.tsx` — `signIn` / `signOut` work as-is; `signUp` becomes unused (replaced by the OTP flow inside `SignUp.tsx`)
- All test accounts and existing user records — untouched
- Phone field stays in the UI as optional contact info

### Open question

Do you want the branded email template now, or just get the basic email OTP flow working first and add branding later?

- **Branded now**: I'll set up the `notify.tracksideops.com` sender subdomain (you'll add 2 NS records at your domain registrar), scaffold + style the verification email template to match Track Side Ops, then build the OTP flow.
- **Basic first**: I'll just build the OTP flow today using Supabase's default email template. Branding can be added later in one pass.

### Out of scope

- Changing the login page (still email + password)
- Removing phone from profiles entirely (kept as optional contact field)
- Migrating existing phone-verified users (their accounts continue to work)
- Two-factor auth on login (this is signup verification only)

