

## Branded verification email for Track Side Ops

Set up a custom-branded email template for the signup verification code so users receive a Track Side Ops-styled email instead of Supabase's default plain template.

### What you'll see

When a user signs up, they'll get an email that:
- Comes from `notify@notify.tracksideops.com` (your branded subdomain)
- Uses the Track Side Ops dark theme with red accent (`#EF3E36`-ish primary)
- Shows the Track Side Ops logo at the top (white card on white email body — emails always use white backgrounds for deliverability)
- Displays the 6-digit OTP in a large, monospace, easy-to-read format
- Uses racing-inspired tone: "Your Track Side Ops verification code" / "Enter this code to hit the grid"
- Includes a fallback note: "Didn't request this? You can safely ignore this email."

### Setup steps

**1. Email sender domain**
- Set up `notify.tracksideops.com` as the verified sender subdomain
- This requires you to add 2 NS records at your domain registrar (where `tracksideops.com` is managed)
- DNS verification runs in the background — scaffolding/deploy don't wait for it

**2. Scaffold the auth email templates**
- Creates `supabase/functions/auth-email-hook/` (the function Supabase calls when an auth email needs to be sent)
- Creates `supabase/functions/_shared/email-templates/` with 6 React Email templates:
  - `signup.tsx` — the one drivers will see during signup (the focus of styling)
  - `magic-link.tsx`, `recovery.tsx`, `invite.tsx`, `email-change.tsx`, `reauthentication.tsx` — styled to match for consistency

**3. Apply Track Side Ops branding to all 6 templates**
- Pull brand tokens from `src/index.css`: primary red `hsl(0 91% 59%)`, dark surfaces, border radius `1rem`
- Body background: white `#ffffff` (mandatory for email deliverability — even though the app is dark)
- Inner card: white with subtle border, dark text for readability
- Logo: Track Side Ops logo (`trackside-logo-v2.png`) at the top of every template
- Primary button / OTP highlight: Track Side Ops red
- Font stack: web-safe fallback (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`)
- Tone matches the app — e.g. "Welcome to the paddock" instead of generic "Confirm your email"

**4. Deploy the auth-email-hook**
- One deploy call activates the hook
- Auth emails switch from default Supabase templates to Track Side Ops branded templates automatically once DNS verifies

### What you need to do

When the email setup dialog appears, you'll:
1. Confirm the subdomain (`notify.tracksideops.com` is the default — fine to keep)
2. Get 2 NS records to add at your domain registrar (Namecheap, GoDaddy, Cloudflare, wherever `tracksideops.com` lives)
3. Add them — DNS propagation can take a few minutes to 72 hours

Setup continues automatically in the background. You can monitor progress in **Cloud → Emails**.

### What stays the same

- The signup OTP flow (`SignUp.tsx`) — no code change needed; Supabase routes the email through the new branded template automatically
- All 6 templates get styled, but only `signup.tsx` is in active use today (the others are ready for future flows like password reset)
- Default Supabase emails keep working until DNS verifies — no downtime during the transition

### Out of scope

- Replacing the actual sending provider (we use Lovable's built-in email infrastructure — no Resend/SendGrid setup needed)
- Adding marketing or notification emails (this is auth-only)
- Customizing the verification code length or expiry (controlled by Supabase auth settings, not the template)

