# Add "My Registrations" to the Dashboard

Drivers currently have to dig into Settings to find their event registrations and the "Pair Radio for Car #X" button. This plan surfaces that section directly on the Dashboard so it's one tap away.

## What you'll see

A new **My Registrations** card on the Dashboard, placed right after **Quick Actions** and before the **Garage + Local Events** two-column row. It shows each event you've signed up for with:

- Event name, track, date, car #, and registration type
- A prominent **"Pair Radio for Car #X"** button on every registration (already built — just exposed here)
- Tap the row to jump to the event details
- Empty state with a "Browse Events" CTA when you have no registrations

This is the same component already used inside Settings, so behavior stays identical in both places — no duplication of logic, no risk of drift.

## Layout

```text
Dashboard
├── Hero / countdown
├── (existing sections)
├── Quick Actions
├── My Registrations          ← NEW (full-width card)
└── Garage  |  Local Events
```

## Technical changes

Single-file edit: `src/pages/Dashboard.tsx`

1. Import the existing component:
   `import MyRegistrations from "@/components/MyRegistrations";`
2. Render `<MyRegistrations />` as its own full-width section between the Quick Actions block (ends ~line 350) and the two-column Garage/Local Events row (starts ~line 353), wrapped in the same `motion.div` fade-in pattern used by the surrounding sections for visual consistency.

No changes needed to `MyRegistrations.tsx`, `RegistrationRadioPairing.tsx`, the database, or RLS — the component is self-contained and already handles its own auth, fetch, loading state, and the Pair Radio button.

## Out of scope (can follow up)

- Removing the section from Settings (leaving it in both places for now so users with muscle memory aren't disrupted)
- Dashboard "nudge" banner that appears only when a registered driver has no paired radio for an upcoming event
