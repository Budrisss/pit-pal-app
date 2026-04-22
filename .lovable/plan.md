
## Fix signup so it sends a verification code email instead of a login link

### Root cause
The signup screen is currently starting a passwordless email flow by calling `supabase.auth.signInWithOtp(...)` in `src/pages/SignUp.tsx`. That triggers the `magiclink` auth email, which is why users receive an email titled “Your login link” instead of the branded signup verification email.

### Implementation
1. **Switch the initial signup action to normal account creation**
   - Replace the current `signInWithOtp` call in `src/pages/SignUp.tsx` with `supabase.auth.signUp(...)`.
   - Pass the entered password during signup so the account is created in the correct email-confirmation flow.
   - Keep optional phone data in `options.data` so that field still works.

2. **Use the correct verification type for the code step**
   - Update the verify step from:
     - `verifyOtp({ ..., type: 'email' })`
   - To:
     - `verifyOtp({ ..., type: 'signup' })`
   - This aligns the code-entry screen with the actual signup confirmation flow.

3. **Remove the unnecessary password update after verification**
   - The current flow verifies the OTP and then calls `updateUser({ password })`.
   - Once signup uses `signUp(...)`, the password is already set up front, so this extra update should be removed.

4. **Refactor resend logic**
   - Extract the “send verification email” request into a shared helper instead of reusing a synthetic submit event.
   - Use that helper for both:
     - the first “Email Verification Code” button
     - the “Resend code” button
   - Keep the user on the verify step when resending.

5. **Align all signup copy**
   - Update the signup UI text so it consistently says:
     - “verification code”
     - not “login link”
   - Make the code-length messaging consistent across:
     - the helper text
     - the toast
     - the verify screen
   - If the backend continues returning 8-digit signup tokens, keep the 8-slot OTP UI; otherwise align the UI length with the real signup token length.

### Expected outcome
- Clicking the signup button sends the **signup confirmation email**, not the magic-link email.
- The branded `signup.tsx` email template is used.
- The email subject/body will match account verification instead of login.
- The code-entry screen will verify the correct signup token and complete account creation cleanly.

### Files to update
- `src/pages/SignUp.tsx`

### Technical notes
- No database migration should be required.
- No auth-template rewrite should be required unless copy tweaks are wanted; the branded signup email template already exists.
- The magic-link template should remain in place for any true passwordless login flows, but it should no longer be used by signup.

### QA
1. Start a fresh signup from `/signup`.
2. Confirm the resulting email is the signup/verification email, not “Your login link”.
3. Confirm the entered code verifies successfully and lands the user in the app.
4. Check logs to verify the auth event is `signup` instead of `magiclink`.
