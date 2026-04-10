

## Plan: Constrain Track Notes and Right Card to Fixed Height with Scroll

### Problem
Currently, the Track Notes and right-side card (Track Map, Gap Ahead, Fastest Lap) use `min-h-[35vh]` with `flex-1`, allowing them to grow unbounded when content is long. Long notes push the layout and there's no scroll.

### Changes

**File: `src/pages/RacerLiveView.tsx`**

1. **Track Notes card (line 1083)**: Change from `min-h-[35vh] flex flex-col` to `h-[35vh] flex flex-col` so it has a fixed height. Wrap the notes content (line 1111) in an `overflow-y-auto` scrollable container instead of letting it grow with `flex-1`.

2. **Track Notes edit mode (line 1096–1109)**: The textarea container already uses `flex-1` — add `overflow-hidden` so it stays within the fixed card height, and ensure the textarea scrolls internally.

3. **Right card (line 1118)**: Change from `min-h-[35vh]` to `h-[35vh]` to cap its height. Add `overflow-hidden` to prevent content from expanding the card. For the track map image, ensure it stays within bounds with `object-contain` (already present).

These are small CSS-only changes — no logic changes needed.

