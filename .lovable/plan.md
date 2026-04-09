

## Interchangeable Right-Side Card in Race Live View

### What Changes
Replace the static "Gap Ahead" card with a swappable card system. The user taps a small toggle at the top of the right card to cycle between three views: **Gap Ahead**, **Track Map**, and **Fastest Lap**.

### Implementation

**File: `src/pages/RacerLiveView.tsx`**

1. **Add state**: `const [rightCard, setRightCard] = useState<'gap' | 'map' | 'lap'>('gap')` — persisted in localStorage so the choice survives refreshes.

2. **Card switcher**: Add a small row of 3 icon-buttons at the top of the right card area (TrendingUp, Map, Timer icons). The active one gets a highlighted style. Tapping cycles/selects the card type.

3. **Gap Ahead card** (existing): Wrap current gap content in a conditional `rightCard === 'gap'` block — no changes to its visuals.

4. **Track Map card** (`rightCard === 'map'`): Display the track map image if one is saved for the event (from event data or a future upload). If no map is available, show a placeholder with "No track map added" and a subtle dashed border. Same `min-h-[35vh]` and rounded-2xl styling.

5. **Fastest Lap card** (`rightCard === 'lap'`): Show the user's best lap time from `session_participants` data (already available in the component's context). Display a large time value (e.g., `1:42.3`) with a "Fastest Lap" label, matching the visual weight of the gap card. If no lap data exists, show "—".

6. **Consistent styling**: All three cards share the same container: `rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 p-5 min-h-[35vh] flex flex-col items-center justify-center`.

### Result
The right half of the driver comm panel becomes a multi-purpose card the driver can quickly switch between gap, track map, or fastest lap — all with large, glanceable text/visuals.

