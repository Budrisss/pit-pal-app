

## Remove Crew View Popup, Add "Open in New Tab" Option

### What Changes
Instead of the current popup dialog, clicking the Crew View button will navigate to the existing `/crew-live/:eventId` route but open it in a **new browser tab**, so the live view remains visible in the original tab.

### Files to Change

**`src/pages/RacerLiveView.tsx`**
- Remove `CrewViewDialog` import and `crewDialogOpen` state
- Remove the `<CrewViewDialog>` component render
- Change the Crew View button's `onClick` to `window.open(\`/crew-live/${personalEventId}\`, '_blank')` — opens the crew view in a new tab

**`src/components/CrewViewDialog.tsx`**
- No deletion needed (can be kept for potential future use), but it will no longer be referenced

### Result
One click opens crew view in a separate tab. The racer live view stays fully visible and interactive.

