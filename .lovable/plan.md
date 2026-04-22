

## Fix Driver Name field on onboarding being un-editable

### Problem
On `/onboarding`, typing or deleting characters in the **Driver Name** input keeps snapping the value back to the email-derived default (e.g. "Thebudrissgroup"). The session replay shows the user backspacing the field clean over and over, and each time the prefill returns.

### Root cause
In `src/pages/OnboardingProfile.tsx`, the prefill effect lists `displayName` as a dependency:

```ts
useEffect(() => {
  if (user?.email && !displayName) {
    setDisplayName(deriveFromEmail(user.email));
  }
}, [user, displayName]);
```

Because `displayName` is in the dependency array, every keystroke that empties the field (e.g., clearing it to type a new name) re-fires the effect and re-prefills it. The user can never blank the field to type their own name.

### Fix
Run the prefill exactly once, when the user first loads the page. Use a `useRef` flag so it never re-applies after the user starts editing.

```ts
const didPrefill = useRef(false);
useEffect(() => {
  if (didPrefill.current) return;
  if (user?.email) {
    const handle = user.email.split('@')[0].replace(/[._-]+/g, ' ');
    setDisplayName(handle.charAt(0).toUpperCase() + handle.slice(1));
    didPrefill.current = true;
  }
}, [user]);
```

This lets the field be cleared, retyped, or replaced freely after the initial prefill.

### Files changed
- `src/pages/OnboardingProfile.tsx` — replace the prefill `useEffect` with a one-shot ref-guarded version.

### QA
1. Visit `/onboarding` — Driver Name is prefilled from the email handle.
2. Clear the field completely — it stays empty.
3. Type a new name — characters appear and persist.
4. Submit — saved value matches what was typed.

