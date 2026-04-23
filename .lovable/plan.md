

## Fix: Onboarding doesn't redirect after Save & Continue

### Root cause
`OnboardingProfile` calls `navigate('/dashboard')` right after upsert succeeds. `Dashboard` is wrapped in `ProtectedRoute`, which on mount fires its own query against `racer_profiles.onboarding_completed`. Because the page just transitioned, that query sometimes returns the **stale** row (or hits a tiny replication lag), `needsOnboarding` flips to `true`, and `<Navigate to="/onboarding" replace />` bounces the user right back. The toast shows because the upsert did succeed — but the redirect never sticks.

The replay confirms this: spinner appears on Save, "Profile saved!" toast fires, then the user is sitting on `/onboarding` again.

### Fix

Make the onboarding state authoritative in one place instead of re-querying on every protected route mount.

**`src/contexts/AuthContext.tsx`** — add `onboardingCompleted: boolean | null` and `refreshOnboarding()` to the context. Load it once when the user session is established (single query alongside the existing auth bootstrap). Expose a setter so pages can mark it complete locally without waiting for a refetch.

**`src/components/ProtectedRoute.tsx`** — read `onboardingCompleted` from `AuthContext` instead of running its own `useEffect` query. Only redirect to `/onboarding` when the value is explicitly `false` (not `null`/loading). This kills the race entirely — no per-navigation query, no stale read.

**`src/pages/OnboardingProfile.tsx`** — after a successful upsert (both `handleSave` and `handleSkip`), call the new context setter to flip `onboardingCompleted` to `true` in memory, then `navigate('/dashboard', { replace: true })`. Guarantees the next route mount sees `true` synchronously.

### Why this works
- Removes the duplicate DB read that was racing the write.
- Single source of truth for onboarding status.
- Local state update means the redirect can't be undone by a slow query.

### Files changed
- `src/contexts/AuthContext.tsx` — add onboarding state + setter + initial load
- `src/components/ProtectedRoute.tsx` — consume context instead of querying
- `src/pages/OnboardingProfile.tsx` — set context flag before navigating

### QA
1. Sign up fresh → land on `/onboarding`.
2. Click Save & Continue → lands on `/dashboard` and stays there.
3. Click Skip for now → lands on `/dashboard` and stays there.
4. Refresh `/dashboard` → stays on dashboard (no bounce).
5. Sign out, sign back in with completed profile → goes straight to dashboard.

