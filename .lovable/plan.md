# Pit Board Track Notes

Transform the existing **Track Notes** card on the Race Live page (`src/pages/RacerLiveView.tsx`) from a freeform text scratchpad into a **Pit Board** — a high-contrast, large-format display that shows the latest crew message exactly like a real pit-wall board.

## What the driver will see

The left card (currently "Track Notes") becomes a **PIT BOARD** with one giant message dominating the card, plus a small history strip beneath. Examples of what it can show:

- `P1` / `P2` (current position)
- `GAP +0.42` (gap ahead) or `GAP -1.10` (gap behind)
- `PIT IN` / `PIT NOW` / `BOX BOX`
- `LAP 12` / `L 12 / 25`
- Any free-text message the crew sends ("FUEL", "PUSH", "COOL TYRES", etc.)

The newest crew message auto-promotes to the giant slot. Older ones scroll into a compact history line below. A small dismiss/clear control resets the board.

## Design (mobile-first, fits the existing dark race UI)

```text
┌────────────────────────────┐
│ 📋 PIT BOARD       (clear) │
│                            │
│         P 2                │ ← giant, 7xl–8xl, white, glow
│       GAP +0.42            │ ← secondary line, 2xl
│                            │
│ ─────────────────────────  │
│ L12 · PIT IN · GAP +0.30   │ ← history strip, tiny
└────────────────────────────┘
```

- Dark amber/yellow accent retained (matches a real pit board).
- New message animates in (scale + fade) so the driver notices change.
- Tabular-nums font for numbers; uppercase for words.

## Where the data comes from

`crewMessages` is **already loaded and live-subscribed** in `RacerLiveView.tsx`. Each message has `position`, `gap_ahead`, `time_remaining`, and free-form `message`. We just need to render it differently — no new tables, no new realtime channels.

The display priority for the giant slot (in order):
1. Latest `message` if present (free text / "PIT IN" / "BOX")
2. Else latest `position` → renders as `P{n}`
3. Else latest `gap_ahead` → renders as `GAP {value}`
4. Else placeholder `—`

The right-side card (Gap / Map / Lap switcher) is **unchanged**.

## Technical changes

**File:** `src/pages/RacerLiveView.tsx` only.

1. Remove the local `trackNotes` / `notesDraft` / `isEditingNotes` state and the `localStorage` read/write/save helpers (they back the old freeform editor).
2. Replace the Track Notes JSX block (lines ~1187–1219) with a `PitBoard` inline render that:
   - Computes `pitBoardPrimary` and `pitBoardSecondary` via `useMemo` over `crewMessages` using the priority list above.
   - Formats: position → `P{n}`, gap → `GAP {value}`, message → uppercased text.
   - Shows the most recent 3 prior entries as a single-line history strip (` · ` separated).
   - Animates the giant value when it changes (Framer Motion `key={primary}` with `initial/animate` scale+opacity — Framer is already used in this file).
3. Keep the amber color treatment, border, and the `h-[35vh]` card height so the existing two-column layout stays balanced.
4. Imports: drop `Pencil`, `Check`, `X`, `StickyNote` if unused after the change; add `ClipboardList` (or reuse `StickyNote`) for the header icon.

No DB migration, no new edge functions, no new dependencies.

## Out of scope

- Changing how crew sends messages (the existing Crew Live View / Driver Communication flow stays as-is).
- Persisting a manual driver-authored note (the old freeform notes feature is removed; if you want a personal scratchpad kept somewhere else, say the word and I'll add it back on a different surface).
