

## Plan: Add Pro Subscription Page (Free Beta)

Since you want Pro to be free for now with a paywall added later, the plan is to create a subscription upgrade page where users can activate Pro for free, and add a visible entry point to it.

### Changes

**1. New page: `src/pages/Subscription.tsx`**
- A "Trackside Pro" upgrade page showing a comparison of Free vs Pro features
- A single "Activate Pro (Free Beta)" button that updates the user's `user_subscriptions` row to `tier = 'pro'`
- Shows current tier status (badge: Free or Pro)
- If already Pro, shows a confirmation message instead of the upgrade button
- Matches the app's existing dark racing aesthetic with glassmorphic cards

**2. Database migration: Allow users to update their own subscription tier**
- Currently `user_subscriptions` has no UPDATE policy — users can't change their tier
- Add an RLS UPDATE policy: `auth.uid() = user_id` (no restriction on tier value for now since it's free beta)
- When you add real payments later, this policy will be replaced with server-side-only updates

**3. Update `src/components/ProGate.tsx`**
- When a free user clicks a gated feature, instead of just showing a toast, also include a link/button to navigate to `/subscription`

**4. Add route in `src/App.tsx`**
- Add `/subscription` as a protected route pointing to the new page

**5. Add navigation entry in Settings page**
- Add a "Subscription" card/link in `src/pages/Settings.tsx` showing current tier and linking to `/subscription`

### Technical Details

- The upgrade button calls: `supabase.from('user_subscriptions').update({ tier: 'pro' }).eq('user_id', user.id)`
- The `SubscriptionContext` will automatically reflect the change on next fetch
- After upgrading, we call `fetchSubscription()` or simply set the local state to `'pro'`
- No payment integration needed now — the button directly flips the tier

### Feature comparison displayed on the page
- **Free**: Basic garage (limited cars), event viewing, session tracking
- **Pro**: Unlimited setups, maintenance logs, personal events, crew messaging, crew view

