

## Restyle Garage Page Banner to Match Dashboard

### What Changes
Replace the Garage page's current gradient hero banner and quick-action buttons with the Dashboard's sleek style: a hero image background with overlay, animated heading, glassmorphic stat cards, and motion-enhanced quick action buttons.

### Implementation

**File: `src/pages/Garage.tsx`**

1. **Replace DesktopNavigation with Dashboard-style nav** — Use the same fixed `bg-background/80 backdrop-blur-md` top nav from Dashboard (or keep DesktopNavigation if it's used site-wide, but ensure `lg:pt-20` stays).

2. **Hero section overhaul** — Replace the `bg-gradient-hero` banner with a section matching Dashboard:
   - Background image with `bg-cover bg-center` and gradient overlay (`from-background/80 via-background/70 to-background`)
   - Import `dashboardHero` image (same as Dashboard) or use the same asset
   - Animated heading using `motion.h1`: "My Garage" in `text-foreground` + a primary-colored subtitle with drop-shadow glow
   - Subtitle text: "Manage your racing collection"
   - "Add Car" button positioned alongside the heading
   - Import and use `framer-motion` for entrance animations

3. **Stats row** — Replace the current `grid-cols-3` stats box with Dashboard-style glassmorphic stat cards:
   - `bg-card/60 backdrop-blur-md border border-border rounded-xl` with hover glow effect
   - Icon above value, uppercase tracking-widest label below
   - Staggered `motion.div` entrance animation
   - Keep the same 3 stats: Cars, Events, Setups

4. **Quick Actions** — Replace the current 2-col button grid with Dashboard-style motion buttons:
   - `bg-card/80 backdrop-blur-md border border-border rounded-xl` cards
   - `whileHover={{ y: -4 }}` and `whileTap={{ scale: 0.97 }}` animations
   - Icon in a `bg-primary/10` rounded container + label + description
   - "New Event" and "New Setup" actions (keep ProGate wrapper on Setup)

5. **Move content below hero** — The "Your Vehicles" section and car grid remain in a `max-w-6xl mx-auto` content section below the hero, matching Dashboard's content layout pattern.

### Files Modified
- `src/pages/Garage.tsx` — Hero, stats, and quick actions restyled; add `framer-motion` and `dashboardHero` imports

