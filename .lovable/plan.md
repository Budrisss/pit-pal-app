

## Email/phone change with email-based verification

### Goal
Let users change their **email** or **phone number** from Settings → Profile. Both changes go through an **8-digit code sent to the user's current email** (same style as signup) — no Twilio/SMS needed since SMS isn't wired up yet.

### What the user will experience

On the Profile card, two new rows appear:
- **Email** — current email + "Change" button
- **Phone** — current phone (or "Not set") + "Change" / "Add" button

**Flow for either change:**
1. Click "Change" → dialog opens.
2. Step 1 — **Verify it's you**: dialog says "We'll send an 8-digit code to your current email (`user@x.com`) to confirm this change." Click "Send code".
3. Supabase emails an 8-digit OTP to the **current** email (using existing `signInWithOtp` flow already used at signup).
4. Step 2 — User enters the 8-digit code + the new email (or new phone). Click "Confirm change".
5. We verify the OTP, then call `supabase.auth.updateUser({ email: newEmail })` or update the phone field.
6. **Email changes**: Supabase additionally sends a confirmation link to the **new** email — the change only finalizes when that link is clicked. Toast: "Check your new inbox to finalize the change."
7. **Phone changes**: phone is stored on the profile immediately after OTP passes. Toast: "Phone updated."
8. Profile card refreshes.

### Where the phone number lives
Since Twilio isn't connected, we **do not** touch `auth.users.phone` (that would trigger an SMS). Instead, store the phone on `racer_profiles.phone_number` (new column). This is the field the Profile card reads/writes. When SMS is wired up later, we can migrate to `auth.users.phone` with real SMS verification.

### Files to create / update

- **Update** `src/pages/Settings.tsx` — add Email and Phone rows to the Profile card with "Change" buttons.
- **Create** `src/components/ChangeEmailDialog.tsx` — two-step: send 8-digit OTP to current email → verify code + new email → `updateUser({ email })`.
- **Create** `src/components/ChangePhoneDialog.tsx` — two-step: send 8-digit OTP to current email → verify code + new phone → upsert into `racer_profiles.phone_number`.
- **Migration**: add `phone_number text NULL` column to `racer_profiles` (RLS already covers it via the existing `auth.uid() = user_id` policies).

### Why email OTP for both
- No Twilio dependency.
- Matches the existing 8-digit email OTP flow used at signup, so users already recognize it.
- Re-verifying via the **current** email proves account ownership before allowing a sensitive change — same security model major SaaS uses when SMS isn't available.

### Out of scope
- Real SMS verification of the new phone (revisit when Twilio is connected).
- Removing email/phone (can add later).
- Changing email without OTP (intentionally unsafe, not supported).

