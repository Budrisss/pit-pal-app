## Goal
Add a prominent "Coming Soon" banner to the `/grid-id` page that explains what GridID is and the benefits users will unlock when it's live, while keeping the existing passport/stamps UI visible (in a preview/teaser state).

## File to edit
- `src/pages/GridID.tsx`

## Changes

### 1. Add a "Coming Soon" banner near the top of the content section
Insert a new card immediately after the hero section (above the existing `GridPassportCard`).

**Visual design** (matches existing dark theme + red primary accent):
- Card with `border-2 border-primary/40`, `bg-gradient-to-br from-primary/10 via-card to-card`, subtle glow
- Top-right `Badge` with text "Coming Soon" (using `Sparkles` or `Rocket` lucide icon)
- Headline: **"GridID — Your Verified Racing Identity"**
- Short intro paragraph explaining the concept:
  > "GridID is your independently-verified digital racing passport. As you log sessions, attend events, and earn organizer stamps, your profile builds a trusted record of your on-track experience — recognized across the Track Side Ops network."

### 2. Benefits list (inside the same banner card)
Render as a 2-column responsive grid (`grid-cols-1 sm:grid-cols-2 gap-3`), each item with a small lucide icon + title + one-line description:

1. **Clock** — *Track Hours Tracking* — Automatically log every verified hour you spend on track.
2. **MapPin** — *Track Diversity* — Build a record of every circuit you've driven, verified by event organizers.
3. **TrendingUp** — *Lap Time Consistency* — Independent analysis of your consistency across sessions.
4. **Stamp** (or `BadgeCheck`) — *Organizer & Instructor Stamps* — Earn approvals from event organizers and certified instructors.
5. **Shield** — *Driver Rating* — Receive an independently-calculated driver rating based on your verified history.
6. **Users** — *Smarter Event Grouping* — Organizers use ratings to structure run groups, pairing drivers with similar skill and experience for safer, better racing.

### 3. Closing line
A small muted footer line inside the banner:
> "We're rolling this out with select organizers first. Your stamps and hours are already being recorded — they'll all count when GridID goes live."

### 4. Keep existing UI
- Leave `GridPassportCard`, the Profile editor, and the Stamps history intact below the banner — they act as a working preview of what's coming.

## Animation
- Wrap banner in a `motion.div` with the same `fadeUp` pattern already used on the page (consistent with existing animations).

## No backend / no schema changes
Pure presentational addition. No new dependencies needed (all icons come from `lucide-react`, already in use).
