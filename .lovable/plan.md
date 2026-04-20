

## Add fullscreen mode to the popped-out Live Track Map

Add a fullscreen toggle button to `LiveTrackMapFullscreen.tsx` (the pop-out tab) using the browser's Fullscreen API. The in-page map inside Live Manage stays unchanged — only the dedicated pop-out view gets the fullscreen control.

### Changes

**`src/pages/LiveTrackMapFullscreen.tsx`**
- Add a floating button top-right mirroring the LIVE overlay top-left.
- Icon: `Maximize2` when windowed, `Minimize2` when in fullscreen.
- Click handler calls `document.documentElement.requestFullscreen()` / `document.exitFullscreen()`.
- Track state with a `fullscreen` boolean kept in sync via the `fullscreenchange` event so pressing Esc updates the icon.
- Style to match the LIVE overlay: `bg-card/90 backdrop-blur-md border border-border rounded-lg shadow-lg`, `pointer-events-auto`.

### Out of scope

- Adding fullscreen to the in-page map inside Live Manage.
- Auto-hiding the LIVE overlay after inactivity.
- Keyboard shortcut (Esc already exits via the browser API).

