## Goal
Re-skin the organizer side (everything under `/organizer/*` plus the post-login mode chooser) into a **Williams F1-inspired** look: deep navy/midnight backgrounds, electric/Williams blue accents, crisp white type, subtle cyan highlights for active states. Racer side stays untouched (F1 red).

## Visual language

| Token | Current (amber) | New (Williams) |
|---|---|---|
| `--org-bg` | dark warm | **`220 40% 6%`** — near-black navy |
| `--org-surface` | warm gray | **`218 35% 11%`** — midnight blue panel |
| `--org-surface-2` (new) | — | **`216 30% 15%`** — raised card |
| `--org-accent` | amber `38 92% 50%` | **`212 100% 50%`** — Williams electric blue |
| `--org-accent-dark` | amber dark | **`220 90% 38%`** — deep racing blue |
| `--org-accent-soft` (new) | — | **`195 100% 60%`** — cyan highlight for hover/active dots |
| `--org-border` | warm | **`216 35% 22%`** — cool steel border |
| `--gradient-org` | amber gradient | linear-gradient 135° navy → electric blue |
| `--shadow-org` | amber glow | electric-blue glow (lower opacity, tighter) |

All tokens land in `src/index.css` `:root`. Because `OrganizerShell`, the org nav components, and `ModeChooser` already consume `--org-*` via inline styles, **the whole shell re-skins from token swaps alone** — no markup churn for the chrome.

## Files to update

### 1. `src/index.css`
- Replace the `--org-*` token block with the navy/blue values above.
- Add `--org-surface-2` and `--org-accent-soft`.
- Update `--gradient-org` and `--shadow-org` to the cool palette.
- Add a small utility class `.org-skew-tab` (used by nav buttons) so we can drop the heavy `transform -skew-x-6` chain in favor of a softer 3° skew that reads more "Williams precision" and less "F1 aggressive" — optional, only if it looks cleaner.

### 2. `src/layouts/OrganizerShell.tsx`
- Swap the page container background from a flat `--org-bg` to a subtle vertical gradient `--org-bg → --org-surface` for depth.
- Accent strip stays but gets a thin white hairline above it (`border-b border-white/10`) for the Williams "stripe" feel.

### 3. `src/components/OrganizerDesktopNavigation.tsx`
- Header background: `--org-surface` with `border-b` using `--org-accent` at 60% opacity (down from solid).
- Logo lockup: replace the skewed parallelogram with a **squared white badge** containing the briefcase icon in `--org-accent`, matching Williams' clean rectangular brand marks.
- Eyebrow text "ORGANIZER" → keep but in `--org-accent-soft` (cyan) for that Williams telemetry vibe.
- Nav buttons: tone down skew, switch active state from gradient fill to **white bottom-border underline + electric-blue text** (Williams sidebar style); inactive hover shows a thin blue underline.
- Logout button keeps destructive hover.

### 4. `src/components/OrganizerMobileNavigation.tsx`
- Bottom bar: `--org-surface` background, top border in `--org-accent` (1px not 2px), each tab's active state becomes a small white pill on top + electric-blue icon (instead of full gradient fill).

### 5. `src/pages/ModeChooser.tsx`
- The Organizer card currently uses `bg-gradient-f1` (red) for its icon tile. Swap that specific tile to `bg-gradient-org` so the choice screen previews each mode's brand. Racer card stays red. This is the only racer-red bleed in the org-adjacent UI.

### 6. `src/pages/EventOrganizer.tsx` (Dashboard)
- Page wrapper: remove `<Navigation />` import bleed if any; rely on shell.
- Headline lockup: keep `tracksideLogo` but place it next to a small "ORGANIZER · CONTROL TOWER" eyebrow in `--org-accent-soft`.
- Primary CTA buttons ("Create Event", "Add Track") → use `style={{ background: 'var(--gradient-org)' }}` so they read blue, not the default red primary.
- Event cards: add a left **`border-l-2` in `--org-accent`** (Williams' signature side-stripe) and switch hover lift shadow to `--shadow-org`.
- Status pills (Public/Personal/Live) → recolor: Live = `--org-accent-soft` cyan dot, Public = `--org-accent` blue, Personal = neutral.

### 7. `src/pages/OrganizerLiveManage.tsx`
- Header strip (the in-page sub-nav with event title + Exit) → `--org-surface` background with `border-b` in `--org-accent`.
- The big **flag drop buttons** keep their semantic colors (yellow/red/checkered) — flags must remain instantly readable; we do NOT recolor them. Only the surrounding card chrome (panel borders, section headers, "LIVE" badge) shifts to the blue palette.
- "LIVE" indicator → `--org-accent-soft` cyan pulse instead of red.
- `LiveTrackMap`, `PairedRadiosPanel`, `LoRaGatewayConfigCard`, `ConnectivityCheckPanel`: wrapping `<Card>` gets the org border-left treatment for visual consistency. Internal map/radio styling untouched (they're functional, not branded).

### 8. `src/pages/OrganizerSettings.tsx`
- Section card headers → switch icon color from default to `--org-accent`.
- "Save" buttons → `--gradient-org`.
- Tabs / dnd handles unchanged structurally.

### 9. `src/pages/OrganizerStampPortal.tsx`
- Replace the racer-red Stamp icon tile (if present) with `--org-accent`.
- Submit button → `--gradient-org`.
- Success state checkmark stays semantic green.

## What we explicitly do NOT change
- Racer side (`Dashboard`, `Garage`, `Events`, `GridID`, etc.) — stays red/F1.
- Flag drop button colors (yellow/red/black-white check) — safety-critical semantics.
- Map styling, charts, weather widgets — functional color systems.
- Any database or routing logic — pure visual.

## QA checklist after implementation
1. `/choose-mode` shows red Racer tile + blue Organizer tile side by side.
2. `/organizer` dashboard: navy background, blue accent strip, blue CTAs, no stray red buttons.
3. `/organizer/live/:id`: flag buttons still yellow/red/checkered; surrounding chrome blue.
4. Switch back to Racer → entire app reverts to red theme (no leaked blues).
5. Mobile bottom nav on `/organizer/*`: blue active state, racer side untouched.
6. Logout/destructive hovers still red (semantic).