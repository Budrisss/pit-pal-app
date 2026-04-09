

## Make Track Notes and Gap Ahead Sections Bigger

### What Changes
Enlarge the Track Notes and Gap Ahead cards in the Race Live View so they take up roughly half the screen height, with larger text for better visibility at a glance.

### File: `src/pages/RacerLiveView.tsx` (lines 1027-1071)

1. **Increase card height**: Change both cards from compact padding (`p-3`) to generous padding (`p-5 sm:p-6`) and add `min-h-[40vh]` so they each fill about half the available width and roughly half the screen height together.

2. **Track Notes card** (lines 1029-1061):
   - Increase padding to `p-5`
   - Bump icon size from 12 to 18, label text from `text-[10px]` to `text-xs`
   - Change notes text from `text-xs` to `text-base sm:text-lg` for readability
   - Increase textarea rows from 3 to 5 and font size
   - Add `min-h-[35vh]` to give it substantial height

3. **Gap Ahead card** (lines 1064-1070):
   - Increase padding to `p-5`
   - Bump gap number from `text-3xl sm:text-4xl` to `text-6xl sm:text-7xl`
   - Increase icon size from 16 to 28
   - Increase label text from `text-[10px]` to `text-xs`
   - Add `min-h-[35vh]` to match Track Notes height

### Result
Both cards will be visually dominant, taking up roughly half the screen each (side by side), with much larger text that's easy to read at a glance during racing.

