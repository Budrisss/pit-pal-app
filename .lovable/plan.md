# Match Organizer Top Nav UI to Racer Dashboard Nav

Restyle `OrganizerDesktopNavigation` so its visual language (skewed tabs, bold uppercase labels, solid black bar, accent border, branded badge) matches the racer-side `DesktopNavigation`, while keeping the organizer color palette (amber/blue accent — `--org-accent`, `--org-surface`).

## What changes

**File:** `src/components/OrganizerDesktopNavigation.tsx`

Replicate the structural pattern from `src/components/DesktopNavigation.tsx`:

1. **Nav container**
   - Switch from `backdrop-blur` translucent surface to a solid bar matching the dashboard's hard-edged style.
   - Background: `hsl(var(--org-surface))` (solid, no blur).
   - Bottom border: 2px solid `hsl(var(--org-accent))` (replaces the racer's `border-f1-red`).

2. **Brand badge (left)**
   - Replace the rounded white square + Briefcase with the same skewed-rectangle treatment used on the dashboard:
     - `w-10 h-10` block, `transform -skew-x-12`, filled with the organizer accent gradient (`var(--gradient-org)`).
     - Inner `Briefcase` icon counter-skewed (`transform skew-x-12`), white.
   - Title: keep "Track Side Ops" with the small "Organizer · Control Tower" eyebrow above it (preserve organizer identity).

3. **Nav tabs (Dashboard / Stamps / Settings)**
   - Replace the current flat underlined tabs with skewed F1-style tabs:
     - `transform -skew-x-6`, `border-2 border-transparent`, `uppercase tracking-wide font-bold text-sm`, `px-6 py-3`.
     - Inactive: `text-white/70`, hover `text-white` + border `hsl(var(--org-accent-soft))`.
     - Active: white text on `hsl(var(--org-accent))` background with white border and an organizer-tinted shadow.
   - Icons and labels counter-skewed (`transform skew-x-6`) so they read straight, mirroring the racer nav.

4. **Switch to Racer + Logout buttons**
   - Same skewed-tab styling as nav items.
   - "Switch to Racer": hover uses a subtle accent-tinted background.
   - "Logout": hover uses `bg-destructive` (matches racer nav).

5. **No changes to:**
   - `OrganizerMobileNavigation` (mobile bottom bar stays as-is).
   - `OrganizerShell` accent strip.
   - Routing, auth gating, or `exitOrganizerMode` behavior.
   - Color tokens — we reuse existing `--org-*` CSS variables, no palette additions.

## Result

The organizer top bar will share the racer dashboard's recognizable skewed-tab F1 chrome, but rendered in the organizer amber/blue accent instead of F1 red — visually unifying the two modes while preserving brand separation.
