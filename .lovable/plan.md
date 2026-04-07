

## Fix Scroll Lag on Events Page

### Problem
When scrolling quickly, the event cards appear to lag and pop in with a delay. This is a rendering performance issue caused by multiple layered CSS effects on every card:

- **`backdrop-blur-sm`** on each EventCard
- **`backdrop-blur-xl`** on every button inside each card (2-3 per card)
- **`hover:shadow-racing`** with complex box-shadow transitions on each card
- **`backdrop-blur-md`** on the header and countdown sections
- The checkered pattern with `repeating-conic-gradient` in the header

On mobile (390px viewport), `backdrop-blur` is especially expensive because the GPU must composite blur layers for every element during scroll.

### Changes

**File: `src/components/EventCard.tsx`**

1. Remove `backdrop-blur-sm` from the Card element — change `bg-card/60 backdrop-blur-sm` to just `bg-card`
2. Remove `backdrop-blur-xl` from all action buttons — replace with simple solid backgrounds (e.g. `bg-primary/15` without the blur)
3. Remove `hover:shadow-racing` from the Card — keep the border color transition for hover feedback

**File: `src/pages/Events.tsx`**

4. Remove `backdrop-blur-md` from the header wrapper (line 127) and countdown card (line 164) — replace with solid `bg-card` backgrounds
5. Simplify the checkered pattern overlay to use a lower-cost static opacity or remove it during scroll (CSS `will-change` won't help here — reducing layers is the fix)

### Result
Cards render without expensive GPU blur compositing during scroll, eliminating the lag/pop-in. Visual appearance stays nearly identical since the dark background behind semi-transparent cards produces a similar effect to blur.

