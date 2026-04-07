

## Make Dashboard Logo Bigger

The logo at line 175 uses `h-20` (80px). On a 390px-wide mobile viewport, that looks small relative to the hero heading and page content.

### Change

**File: `src/pages/Dashboard.tsx`** — line 175

Change the logo class from `h-20` to `h-32 sm:h-36` so it's roughly double the current size and scales up slightly on larger phones.

```tsx
<img src={tracksideLogo} alt="Track Side Ops" className="h-32 sm:h-36 w-auto invert" />
```

Single line change, no other files affected.

