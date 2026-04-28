# Seamless Hero → Page Background Blend

Goal: the hero image fades smoothly into the page background that sits behind all the cards, buttons, stats, etc. — no visible seam, no overlay covering interactive content.

## Why the previous attempt failed

We extended the hero overlay past its own section (`-mb-32` + `-bottom-32` overlay div). That overlay had a higher z-index than the cards beneath it, so it visually blocked them and stole clicks.

## Correct approach: lift the hero image to a fixed background layer

Instead of stretching an overlay outward, **detach the hero image from the section box entirely** and render it as a fixed/positioned background layer behind the entire page. The fade-to-black is part of that single layer, so there's no "seam" to blend across — the cards simply float on top of one continuous gradient that resolves into the page background.

### Changes — `src/pages/EventOrganizer.tsx`

1. **New top-level background layer** (sibling to the page content, `z-0`, `pointer-events-none`):
   ```
   <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[80vh]">
     <motion.div style={{ y: heroY, scale: heroScale }}
                 className="absolute inset-0 bg-cover bg-center"
                 style={{ backgroundImage: url(...), filter: saturate(0.6) contrast(1.05) }} />
     <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, hsl(var(--org-accent)/0.35), hsl(var(--org-accent-dark)/0.55))' }} />
     <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
   </div>
   ```
   - `pointer-events-none` → cards underneath stay clickable.
   - `-z-10` → image always sits behind everything else.
   - The dark vertical gradient fades to solid `background` by the bottom of the layer, so beyond ~80vh it visually IS the page color. No seam.

2. **Hero `<section>` becomes transparent:**
   - Remove the `<motion.div>` background image wrapper, the org-accent tint div, and the dark fade div from inside the section.
   - Section keeps only the content (Control Tower eyebrow, title, subtitle, Create Event CTA, stats grid).
   - Section gets `relative z-10` so its content sits over the fixed background layer.

3. **Page wrapper stays as-is:**
   - The outer `<div className="min-h-screen text-foreground pb-20 …">` keeps the solid background color from the theme. The fixed hero layer sits behind it via `-z-10`, the page content sits at default stacking — they never overlap-compete.

4. **Parallax preserved:** `useScroll` + `useTransform` still drives `y`/`scale` on the image div inside the fixed layer. Because it's `fixed`, the parallax feel actually improves (image stays put while content scrolls over it, then the gradient swallows it as you scroll past).

5. **Mobile:** same layer works on mobile. We'll cap the layer height at `min(80vh, 720px)` so it doesn't dominate small screens.

## What stays untouched
- All cards, stats, search, event list — no markup or z-index changes there.
- Organizer nav, theme tokens, `pit-lane-hero.jpg` asset.
- `useScroll`/`useTransform` parallax values.

## Result
- Single continuous gradient from photo → org tint → dark → page background, with no boundary line.
- Cards/buttons sit on top, fully visible and interactive — the hero layer can never cover them because it's `pointer-events-none` and `-z-10`.
- Scrolling reveals the parallax photo behind the upper content, and as you scroll down the image dissolves into the page background naturally.
