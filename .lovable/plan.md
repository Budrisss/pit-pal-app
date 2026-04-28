# Tighten the Event Organizer Hero

Two issues to fix in `src/pages/EventOrganizer.tsx`:
1. The hero image (`pit-lane-hero.jpg`) is generic racing — give it the organizer (amber/blue accent) feel.
2. The previous "blend" change added a `-mb-32` negative margin and an overlay extending `-bottom-32`, which now sits on top of the stats and the cards below, blocking interaction.

## Changes

### 1. Remove the bleed that overlaps the cards
**File:** `src/pages/EventOrganizer.tsx`, hero section (~lines 952–968)

- Replace `<section className="relative -mb-32">` with `<section className="relative overflow-hidden">`. This restores the hero as a self-contained block — nothing extends past its bottom edge, so the stats row, search bar, and event cards underneath are no longer covered.
- Remove the `-bottom-32 h-64` overlay div that was leaking onto the next section.
- Keep a single fade overlay that ends cleanly at the section's bottom: `bg-gradient-to-b from-background/55 via-background/85 to-background`. This still produces a soft fade into the page background but inside the hero box only.

### 2. Re-tint the hero to the organizer theme
Two-layer approach so we don't need a new image asset:

- **Color overlay** — add a tinted gradient on top of the image using the organizer accent:
  - `linear-gradient(135deg, hsl(var(--org-accent) / 0.35), hsl(var(--org-accent-dark) / 0.55))`
  - Sits between the background image and the dark fade overlay.
- **Reduced saturation on image** — apply `filter: saturate(0.6) contrast(1.05)` to the image div so the underlying photo reads as a moody backdrop rather than competing red/orange tones.
- The dark vertical fade (`from-background/55 … to-background`) stays on top so the title stays readable and the bottom blends into the page.

Layer order (back → front):
1. Parallax image div (desaturated)
2. Org accent gradient tint
3. Dark vertical fade
4. Hero content (eyebrow, title, subtitle, CTA, stats)

### 3. Leave alone
- The parallax `useScroll`/`useTransform` motion stays.
- The hero content (Control Tower eyebrow, title, stats grid, Create Event CTA) is unchanged.
- No new assets, no new CSS tokens — uses existing `--org-accent` / `--org-accent-dark` variables.

## Result
- Cards below the hero are fully clickable and visible again (no negative-margin bleed).
- The hero photo takes on the amber/blue organizer mood instead of looking like the racer dashboard.
- The fade still ends gracefully at the section boundary.
