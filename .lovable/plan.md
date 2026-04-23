

## Setups Page: Add Intro & Section Explainers

### What gets added

**1. Page intro (top of `/setups`, below the existing page title)**
A short info card explaining what the Setups page is for:

> **Track Your Vehicle Setups**
> Keep a complete history of every chassis configuration you run. Setups can be saved two ways — upload an existing setup sheet for safekeeping, or enter your numbers manually using our structured data collector. Use saved setups to compare changes session-to-session and dial in faster at every track.

Styled as a subtle bordered `Card` with an info icon, muted background — non-intrusive, dismissible later if needed (not in this pass).

**2. "New Setup Sheet" card — short helper line under its title**

> Upload an existing setup sheet (PDF, image, or doc) for safekeeping and cataloging. Best for sheets you already have from your shop, crew chief, or chassis builder.

**3. "Chassis Setup Form" card — short helper line under its title**

> Manually enter your setup data using our structured collector. Captures alignment, springs, shocks, sway bars, tire pressures, and per-corner tire wear photos — all searchable and comparable across sessions.

### Visual treatment
- Intro card: `Card` with `Info` icon (lucide), `text-muted-foreground` body, top margin matching existing page padding.
- Section helper text: small `text-sm text-muted-foreground` paragraph inside each `CardHeader`, directly under the existing `CardTitle` (above `CardDescription` if one exists, or replacing/augmenting it).
- No layout shifts to existing form fields or upload UI — purely additive copy.

### Files changed
- `src/pages/Setups.tsx` — add intro card at top, add helper paragraphs to the two existing section cards' headers.

### Out of scope
- Dismiss/collapse for the intro card
- Tooltips or "Learn more" links
- Reordering the two cards

