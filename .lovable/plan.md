

## Add Racing Accent Behind Events Page Header

### What
Add a subtle animated checkered flag / racing stripe pattern behind the header section of the Events page, matching the app's dark theme with red accents.

### How

**File: `src/pages/Events.tsx`** (lines 127-144)

Wrap the header in a `relative overflow-hidden` container and add a decorative background layer:

1. **Checkered pattern**: Use a CSS pseudo-element approach via a positioned `div` with a repeating checkered gradient pattern at very low opacity (~5-8%), fading out with a mask gradient so it doesn't overpower content.

2. **Animated diagonal racing stripes**: Add 2-3 thin diagonal lines that slowly animate left-to-right using the existing `slideRight` / `speedLine` keyframes, tinted with `hsl(var(--primary))` at ~10% opacity.

3. **Structure**:
```text
<div className="relative overflow-hidden rounded-xl border border-primary/10 bg-card/40 backdrop-blur p-5">
  {/* Checkered pattern overlay - absolute, low opacity */}
  <div className="absolute inset-0 opacity-[0.04]"
       style={{ backgroundImage: checkered-gradient, backgroundSize: '20px 20px' }} />
  {/* Animated speed lines - absolute */}
  <div className="absolute top-1/3 h-px w-32 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-speed-line" />
  <div className="absolute top-2/3 h-px w-24 ... animation-delay" />
  {/* Existing header content (relative z-10) */}
</div>
```

4. **No new dependencies** — uses existing Tailwind config keyframes (`speedLine`) and CSS gradients.

### Visual Result
A contained card-like header area with a barely-visible checkered pattern and faint red speed lines streaking across, giving a motorsport feel without distracting from the content.

