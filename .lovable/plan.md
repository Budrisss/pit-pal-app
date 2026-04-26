## Goal
The Organizer Dashboard (`/organizer`) still shows several red accents from the racer theme leaking through `bg-primary` / `text-primary` / default Button & Badge variants. Re-skin every remaining accent surface on this page to the Williams blue palette so the dashboard reads consistently navy + electric blue.

## Red elements identified in `src/pages/EventOrganizer.tsx`

| Line(s) | Element | Current | Why it shows red |
|---|---|---|---|
| 1011–1045 | 3 stat cards (Total Events, Total Registrations, Registration Groups) | `bg-primary/10` icon tile + `text-primary` icon | `--primary` is F1 red |
| 1134 | Event card | `hover:border-primary/40` | red hover border |
| 1140 | Status pill | `<Badge variant="default">` | default badge = red bg |
| 1147 | Track name | `text-primary` | red track name |
| 996 | "Publish Event" submit button | default `<Button>` (red primary) | red CTA |
| 1238 | "Save Changes" submit button | default `<Button>` | red CTA |
| 1111, 997, 1238 | Loading spinners | `border-primary` / `border-primary-foreground` | red ring |
| 397–399 | Track type filter chips (in Create Event dialog) | `bg-primary text-primary-foreground border-primary` and `hover:border-primary/50` | red chip + red hover |
| 905 | "Sign Up as Organizer" CTA (no-profile fallback) | default `<Button>` | red |
| 892, 930, 1201, 1254 | Logout / Delete (destructive) | `text-destructive` / `bg-destructive` | **KEEP RED** — destructive actions stay semantic red |

## Changes to make in `src/pages/EventOrganizer.tsx`

### 1. Stat cards (lines 1011–1046)
Replace each `<div className="p-3 bg-primary/10 rounded-lg">` + `<Icon className="text-primary" />` with inline styles bound to the org tokens:
```tsx
<div
  className="p-3 rounded-lg"
  style={{ backgroundColor: "hsl(var(--org-accent) / 0.12)" }}
>
  <Calendar size={24} style={{ color: "hsl(var(--org-accent))" }} />
</div>
```
Apply identically to all three stat cards.

Also bump card border to a subtle blue tint by adding `style={{ borderColor: "hsl(var(--org-border))" }}` on each `<Card>` (keeps the existing `bg-card/80` since dashboards already sit on the org gradient background).

### 2. Event cards (line 1134)
Drop `hover:border-primary/40` and instead apply the Williams "side-stripe":
```tsx
<Card
  className="bg-card/80 transition-colors border-l-2"
  style={{
    borderColor: "hsl(var(--org-border))",
    borderLeftColor: "hsl(var(--org-accent))",
  }}
>
```
Hover lift handled by the existing transition; no red ring.

### 3. Status badge (line 1140)
Replace the default badge with explicit Williams styling for upcoming events; keep neutral gray for completed/cancelled:
```tsx
<Badge
  variant="secondary"
  className="text-xs shrink-0 border"
  style={
    event.status === "upcoming"
      ? {
          backgroundColor: "hsl(var(--org-accent) / 0.15)",
          color: "hsl(var(--org-accent-soft))",
          borderColor: "hsl(var(--org-accent) / 0.4)",
        }
      : undefined
  }
>
  {event.status}
</Badge>
```

### 4. Track name (line 1147)
Change `className="text-primary font-medium"` → `style={{ color: "hsl(var(--org-accent-soft))" }}` className `font-medium`.

### 5. Submit CTAs (lines 996–998 "Publish Event", 1237–1239 "Save Changes")
Apply org gradient to match the existing "Create Event" button:
```tsx
<Button
  type="submit"
  disabled={creating}
  className="w-full text-white border-0 hover:opacity-90"
  style={{ background: "var(--gradient-org)", boxShadow: "var(--shadow-org)" }}
>
  {creating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Publish Event'}
</Button>
```
Spinner ring color updated from `border-primary-foreground` → `border-white` so it reads on blue.

### 6. Page loading spinner (line 1111)
Change `border-primary` → inline `style={{ borderColor: "hsl(var(--org-accent))", borderTopColor: "transparent" }}`.

### 7. Track-type filter chips (lines 391–403, inside `EventFormFields`)
This sits inside the Create Event dialog (still org-side). Active chip should use blue:
```tsx
className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
  typeFilter === value ? "text-white" : "bg-background text-muted-foreground border-border"
}`}
style={
  typeFilter === value
    ? { backgroundColor: "hsl(var(--org-accent))", borderColor: "hsl(var(--org-accent))" }
    : undefined
}
```
Hover border for inactive chips: append `hover:border-[hsl(var(--org-accent)/0.5)]` (Tailwind arbitrary value) — or a small className via `cn`.

### 8. "Sign Up as Organizer" fallback CTA (line 905)
Apply the same org gradient style as Create Event so the empty-state CTA is on-brand. (This branch is rarely shown inside the shell since it'd usually redirect, but harmless to update.)

### 9. Leave alone (semantic / destructive)
- Logout buttons (lines 892, 930) — destructive red hover stays.
- Delete dropdown item (line 1201) and Delete alert action (line 1254) — destructive red stays.
- Toast `variant: "destructive"` calls (lines 769, 812, 827) — error semantics, stay red.
- The two hidden `<motion.nav>` blocks (lines 881, 919) marked `hidden` — not rendered, skip.

## What we explicitly do NOT change
- Racer-side dashboard, Garage, Events, GridID — stay F1 red.
- Flag drop buttons on Live Manage — semantic, untouched.
- Map/chart/weather widget colors.
- The `--primary` token itself (still red globally for racer side).

## QA checklist
1. `/organizer` loads on a navy background with three blue stat-card icon tiles.
2. Event cards show a thin blue left stripe; hover doesn't produce any red ring.
3. "upcoming" status pill reads cyan-on-blue, not red.
4. Track name on each event card reads cyan, not red.
5. "Publish Event" and "Save Changes" buttons in Create/Edit dialogs use the blue gradient.
6. Track-type filter chips inside Create Event highlight blue when active.
7. Loading spinner ring is blue.
8. Logout button still hovers red (semantic preserved).
9. Switch to Racer mode → racer dashboard is still entirely red (no leaked blues).
