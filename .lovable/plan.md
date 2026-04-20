

## Pop-out Live Track Map to a dedicated tab

Add a "Pop out" button on the Live Track Map header in `OrganizerLiveManage` that opens a new browser tab showing only the map for the current event — full-screen, no chrome — so an organizer can throw it on a second monitor while keeping the existing map in the Live Manage view.

### New route

`/live-map/:eventId` → new page `src/pages/LiveTrackMapFullscreen.tsx`

- No nav, no header, no padding — map fills the entire viewport (`w-screen h-screen`)
- Uses the existing `<LiveTrackMap />` component (same realtime car positions, same basemap toggle, same start/finish marker)
- Loads event + selected track the same way `OrganizerLiveManage` does (fetch event by id, resolve track)
- Small floating overlay top-left: event name + live participant count + tiny "LIVE" pulse dot, so the second-monitor view still has context
- Protected by `<ProtectedRoute>` and gated to organizers of that event (same access check pattern as Live Manage)

### Pop-out button

In `OrganizerLiveManage.tsx`, on the Live Track Map card header (right column), add a small `ghost` icon button (lucide `ExternalLink`) next to the existing controls:

```tsx
<Button
  variant="ghost" size="icon"
  onClick={() => window.open(`/live-map/${eventId}`, '_blank', 'noopener,noreferrer')}
  title="Pop out map to new tab"
>
  <ExternalLink className="h-4 w-4" />
</Button>
```

The in-page map stays exactly as it is. Both windows subscribe independently to the same Supabase realtime channel, so positions stay in sync automatically — no extra plumbing needed.

### Files touched

- `src/pages/LiveTrackMapFullscreen.tsx` — **new**, fullscreen map page
- `src/App.tsx` — register `/live-map/:eventId` route
- `src/pages/OrganizerLiveManage.tsx` — add pop-out button on the map card header

### Out of scope

- BroadcastChannel sync between the two windows (not needed — both use Supabase realtime)
- Multi-track / multi-event picker on the popped-out view (always tied to the eventId in the URL)
- Saving window position/size
- A public/shareable spectator version of the fullscreen map

