## Goal
Make `/download` instructions answer the real question users have: *"OK, I downloaded the zip — now how do I make this feel like an actual installed app?"* Right now the steps are technically correct but skip the install-flow finishing touches (where to put the folder, how to pin it, how to create a shortcut/launcher).

## Changes — `src/pages/Download.tsx` only

Rewrite the `steps` array for each platform to be a fuller 5-step walkthrough. No structural changes to the page; just longer step lists in the existing `<ol>`.

### Windows — new steps
1. Download `TrackSideOps-windows.zip`, then right-click → **Extract All…**
2. Move the extracted **`Track Side Ops-win32-x64`** folder to a permanent location — e.g. `C:\Program Files\Track Side Ops\` (don't leave it in Downloads)
3. Open the folder and double-click **`Track Side Ops.exe`**
4. First launch only: SmartScreen says *"Windows protected your PC"* → click **More info → Run anyway**
5. Right-click the taskbar icon → **Pin to taskbar**, or right-click the `.exe` → **Create shortcut** and drag it to your Desktop / Start Menu

### macOS — new steps
1. Download `TrackSideOps-mac.zip` and double-click to unzip
2. Drag **Track Side Ops.app** into your **Applications** folder
3. First launch only: right-click the app → **Open** → confirm in the dialog (Apple's one-time unsigned-app prompt)
4. The app icon now lives in Launchpad and Spotlight — search "Track Side" to open
5. Optional: while running, right-click the Dock icon → **Options → Keep in Dock**

### Linux — new steps
1. Download and extract: `tar xzf TrackSideOps-linux.tar.gz`
2. Move the extracted folder to a permanent home — e.g. `~/Applications/track-side-ops/`
3. Run the binary: `./"Track Side Ops"` from inside that folder
4. Optional: create `~/.local/share/applications/track-side-ops.desktop` with a standard `[Desktop Entry]` block pointing `Exec=` at the binary so it shows up in your app launcher
5. Most desktop environments (GNOME, KDE) pick up new `.desktop` files automatically — search "Track Side" in your app menu

## Layout consideration
The platform cards currently size to content with `flex-1` on the `<ol>`. Going from 3 to 5 short steps adds ~50px of height per card — the grid stays clean because all three cards grow together. No CSS changes needed.

## Out of scope
- No changes to the Electron shell, GitHub release, or build pipeline
- No new components, routes, or assets
- SHA256 section (already removed)

## Verification
After changes I'll re-read `Download.tsx` to confirm rendering is sane, then you can spot-check `/download` in the preview.